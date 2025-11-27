"""
Payment Service - Razorpay integration for credit purchases.
"""
import razorpay
import hmac
import hashlib
from typing import Dict, Any, Optional, Tuple
from app.core.config import get_settings
from app.services.supabase_service import get_supabase
from app.services.credit_service import get_credit_service

settings = get_settings()


class PaymentService:
    """Service for handling Razorpay payments."""

    def __init__(self):
        self.supabase = get_supabase()
        self.credit_service = get_credit_service()
        
        # Initialize Razorpay client
        if settings.razorpay_key_id and settings.razorpay_key_secret:
            self.razorpay_client = razorpay.Client(
                auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
            )
        else:
            self.razorpay_client = None
            print("Warning: Razorpay credentials not configured")

    async def create_order(
        self,
        user_id: str,
        package_id: str,
        user_email: str,
        user_name: str
    ) -> Dict[str, Any]:
        """
        Create a Razorpay order for credit purchase.
        Returns order details for frontend checkout.
        """
        if not self.razorpay_client:
            raise Exception("Payment system not configured")

        # Get package details
        package = await self.credit_service.get_package_by_id(package_id)
        if not package:
            raise Exception("Invalid package")

        if not package.get("is_active"):
            raise Exception("Package is not available")

        amount_inr = float(package["price_inr"])
        credits = package["credits"]
        
        # Amount in paise (Razorpay uses smallest currency unit)
        amount_paise = int(amount_inr * 100)

        try:
            # Create Razorpay order
            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"docmind_{user_id[:8]}_{package_id[:8]}",
                "notes": {
                    "user_id": user_id,
                    "package_id": package_id,
                    "credits": str(credits),
                    "package_name": package["name"],
                }
            }
            
            razorpay_order = self.razorpay_client.order.create(data=order_data)
            
            # Save order to database
            self.supabase.table("payment_orders").insert({
                "user_id": user_id,
                "razorpay_order_id": razorpay_order["id"],
                "package_id": package_id,
                "amount_inr": amount_inr,
                "credits": credits,
                "status": "created",
                "metadata": {
                    "package_name": package["name"],
                    "user_email": user_email,
                    "user_name": user_name,
                }
            }).execute()

            return {
                "order_id": razorpay_order["id"],
                "amount": amount_paise,
                "amount_inr": amount_inr,
                "currency": "INR",
                "credits": credits,
                "package_name": package["name"],
                "key_id": settings.razorpay_key_id,
                "prefill": {
                    "name": user_name,
                    "email": user_email,
                },
                "notes": order_data["notes"],
            }

        except Exception as e:
            print(f"Create order error: {e}")
            raise Exception(f"Failed to create order: {str(e)}")

    def verify_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> bool:
        """Verify Razorpay payment signature."""
        if not self.razorpay_client:
            return False

        try:
            # Generate signature
            message = f"{razorpay_order_id}|{razorpay_payment_id}"
            generated_signature = hmac.new(
                settings.razorpay_key_secret.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(generated_signature, razorpay_signature)

        except Exception as e:
            print(f"Signature verification error: {e}")
            return False

    async def verify_and_complete_payment(
        self,
        user_id: str,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> Tuple[bool, str, int]:
        """
        Verify payment and add credits.
        Returns (success, message, new_balance)
        """
        try:
            # Verify signature
            if not self.verify_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
                return False, "Payment verification failed", 0

            # Get order from database
            order_response = self.supabase.table("payment_orders").select("*").eq(
                "razorpay_order_id", razorpay_order_id
            ).single().execute()

            if not order_response.data:
                return False, "Order not found", 0

            order = order_response.data

            # Check if already processed
            if order["status"] == "paid":
                user_credits = await self.credit_service.get_user_credits(user_id)
                return True, "Payment already processed", user_credits["credits_balance"]

            # Verify user matches
            if order["user_id"] != user_id:
                return False, "User mismatch", 0

            # Update order status
            self.supabase.table("payment_orders").update({
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
                "status": "paid",
                "updated_at": "now()",
            }).eq("razorpay_order_id", razorpay_order_id).execute()

            # Add credits
            credits = order["credits"]
            package_name = order["metadata"].get("package_name", "Credit Package")
            
            success, new_balance, message = await self.credit_service.add_credits(
                user_id=user_id,
                amount=credits,
                transaction_type="purchase",
                description=f"Purchased {package_name} - {credits} credits",
                reference_id=razorpay_payment_id,
                metadata={
                    "razorpay_order_id": razorpay_order_id,
                    "package_id": order["package_id"],
                    "amount_inr": float(order["amount_inr"]),
                }
            )

            if success:
                return True, f"Successfully added {credits} credits!", new_balance
            else:
                return False, message, 0

        except Exception as e:
            print(f"Payment completion error: {e}")
            return False, f"Payment processing error: {str(e)}", 0

    async def handle_webhook(self, payload: Dict[str, Any], signature: str) -> bool:
        """Handle Razorpay webhook events."""
        try:
            # Verify webhook signature
            if settings.razorpay_webhook_secret:
                expected_signature = hmac.new(
                    settings.razorpay_webhook_secret.encode(),
                    str(payload).encode(),
                    hashlib.sha256
                ).hexdigest()
                
                if not hmac.compare_digest(expected_signature, signature):
                    print("Webhook signature verification failed")
                    return False

            event = payload.get("event")
            
            if event == "payment.captured":
                payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
                order_id = payment.get("order_id")
                payment_id = payment.get("id")
                
                # Get order
                order_response = self.supabase.table("payment_orders").select("*").eq(
                    "razorpay_order_id", order_id
                ).single().execute()

                if order_response.data and order_response.data["status"] != "paid":
                    order = order_response.data
                    
                    # Update order
                    self.supabase.table("payment_orders").update({
                        "razorpay_payment_id": payment_id,
                        "status": "paid",
                        "updated_at": "now()",
                    }).eq("razorpay_order_id", order_id).execute()

                    # Add credits
                    await self.credit_service.add_credits(
                        user_id=order["user_id"],
                        amount=order["credits"],
                        transaction_type="purchase",
                        description=f"Webhook: {order['metadata'].get('package_name', 'Credits')}",
                        reference_id=payment_id,
                    )

            elif event == "payment.failed":
                payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
                order_id = payment.get("order_id")
                
                self.supabase.table("payment_orders").update({
                    "status": "failed",
                    "updated_at": "now()",
                }).eq("razorpay_order_id", order_id).execute()

            return True

        except Exception as e:
            print(f"Webhook handling error: {e}")
            return False

    async def get_user_orders(self, user_id: str, limit: int = 10) -> list:
        """Get user's payment order history."""
        try:
            response = self.supabase.table("payment_orders").select("*").eq(
                "user_id", user_id
            ).order("created_at", desc=True).limit(limit).execute()
            
            return response.data or []
        except Exception as e:
            print(f"Get orders error: {e}")
            return []


# Singleton instance
_payment_service = None


def get_payment_service() -> PaymentService:
    """Get or create PaymentService singleton."""
    global _payment_service
    if _payment_service is None:
        _payment_service = PaymentService()
    return _payment_service
