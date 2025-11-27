"""
Credit Service - Manages user credits, transactions, and token counting.
"""
from typing import Optional, Tuple, List, Dict, Any
from app.services.supabase_service import get_supabase
from app.core.config import get_settings
import math

settings = get_settings()


class CreditService:
    """Service for managing user credits."""

    def __init__(self):
        self.supabase = get_supabase()
        self.free_credits = settings.free_signup_credits
        self.credits_per_token = settings.credits_per_token

    def estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text.
        Rough estimation: ~4 characters per token for English text.
        """
        if not text:
            return 0
        # More accurate estimation considering spaces and punctuation
        char_count = len(text)
        word_count = len(text.split())
        # Average of character-based and word-based estimates
        char_estimate = char_count / 4
        word_estimate = word_count * 1.3  # ~1.3 tokens per word
        return int((char_estimate + word_estimate) / 2)

    def calculate_credits_needed(self, input_text: str, output_text: str) -> int:
        """
        Calculate credits needed for a chat interaction.
        Credits = (input_tokens + output_tokens) * credits_per_token
        """
        input_tokens = self.estimate_tokens(input_text)
        output_tokens = self.estimate_tokens(output_text)
        total_tokens = input_tokens + output_tokens
        credits = math.ceil(total_tokens * self.credits_per_token)
        # Minimum 1 credit per message
        return max(1, credits)

    async def get_user_credits(self, user_id: str) -> Dict[str, Any]:
        """Get user's current credit balance and stats."""
        try:
            response = self.supabase.table("user_credits").select("*").eq("user_id", user_id).single().execute()
            
            if response.data:
                return {
                    "credits_balance": response.data["credits_balance"],
                    "total_purchased": response.data["total_purchased"],
                    "total_used": response.data["total_used"],
                    "created_at": response.data["created_at"],
                }
            else:
                # Initialize credits for new user
                return await self.initialize_user_credits(user_id)
        except Exception as e:
            if "PGRST116" in str(e):  # No rows returned
                return await self.initialize_user_credits(user_id)
            raise

    async def initialize_user_credits(self, user_id: str) -> Dict[str, Any]:
        """Initialize credits for a new user with free signup bonus."""
        try:
            # Insert new user credits
            self.supabase.table("user_credits").insert({
                "user_id": user_id,
                "credits_balance": self.free_credits,
                "total_purchased": 0,
                "total_used": 0,
            }).execute()
            
            # Log signup bonus transaction
            self.supabase.table("credit_transactions").insert({
                "user_id": user_id,
                "amount": self.free_credits,
                "balance_after": self.free_credits,
                "transaction_type": "signup_bonus",
                "description": f"Welcome bonus - {self.free_credits} free credits",
            }).execute()
            
            return {
                "credits_balance": self.free_credits,
                "total_purchased": 0,
                "total_used": 0,
                "created_at": None,
            }
        except Exception as e:
            # If duplicate, just fetch existing
            if "duplicate" in str(e).lower() or "23505" in str(e):
                response = self.supabase.table("user_credits").select("*").eq("user_id", user_id).single().execute()
                return {
                    "credits_balance": response.data["credits_balance"],
                    "total_purchased": response.data["total_purchased"],
                    "total_used": response.data["total_used"],
                    "created_at": response.data["created_at"],
                }
            raise

    async def check_credits(self, user_id: str, required_credits: int = 1) -> Tuple[bool, int]:
        """
        Check if user has sufficient credits.
        Returns (has_enough, current_balance)
        """
        user_credits = await self.get_user_credits(user_id)
        balance = user_credits["credits_balance"]
        return balance >= required_credits, balance

    async def deduct_credits(
        self,
        user_id: str,
        amount: int,
        description: str = "Chat usage",
        reference_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, int, str]:
        """
        Deduct credits from user's balance.
        Returns (success, new_balance, message)
        """
        try:
            # Get current balance and total_used
            response = self.supabase.table("user_credits").select("credits_balance, total_used").eq("user_id", user_id).single().execute()
            
            if not response.data:
                return False, 0, "User credits not found"
            
            current_balance = response.data["credits_balance"]
            total_used = response.data["total_used"] or 0
            
            if current_balance < amount:
                return False, current_balance, "Insufficient credits"
            
            new_balance = current_balance - amount
            
            # Update balance atomically
            update_response = self.supabase.table("user_credits").update({
                "credits_balance": new_balance,
                "total_used": total_used + amount,
            }).eq("user_id", user_id).execute()
            
            print(f"Credit update response: {update_response.data}")
            
            # Log transaction
            try:
                self.supabase.table("credit_transactions").insert({
                    "user_id": user_id,
                    "amount": -amount,
                    "balance_after": new_balance,
                    "transaction_type": "chat_usage",
                    "description": description,
                    "reference_id": reference_id,
                    "metadata": metadata or {},
                }).execute()
            except Exception as tx_error:
                print(f"Transaction logging error (non-critical): {tx_error}")
            
            return True, new_balance, "Credits deducted successfully"
            
        except Exception as e:
            print(f"Credit deduction error: {e}")
            return False, 0, str(e)

    async def add_credits(
        self,
        user_id: str,
        amount: int,
        transaction_type: str = "purchase",
        description: str = "Credit purchase",
        reference_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, int, str]:
        """
        Add credits to user's balance.
        Returns (success, new_balance, message)
        """
        try:
            # Get current balance
            response = self.supabase.table("user_credits").select("*").eq("user_id", user_id).single().execute()
            
            if not response.data:
                # Initialize first
                await self.initialize_user_credits(user_id)
                response = self.supabase.table("user_credits").select("*").eq("user_id", user_id).single().execute()
            
            current_balance = response.data["credits_balance"]
            total_purchased = response.data["total_purchased"]
            new_balance = current_balance + amount
            
            # Update balance
            update_data = {
                "credits_balance": new_balance,
            }
            if transaction_type == "purchase":
                update_data["total_purchased"] = total_purchased + amount
            
            self.supabase.table("user_credits").update(update_data).eq("user_id", user_id).execute()
            
            # Log transaction
            self.supabase.table("credit_transactions").insert({
                "user_id": user_id,
                "amount": amount,
                "balance_after": new_balance,
                "transaction_type": transaction_type,
                "description": description,
                "reference_id": reference_id,
                "metadata": metadata or {},
            }).execute()
            
            return True, new_balance, "Credits added successfully"
            
        except Exception as e:
            print(f"Add credits error: {e}")
            return False, 0, str(e)

    async def get_transaction_history(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        transaction_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get user's credit transaction history."""
        try:
            query = self.supabase.table("credit_transactions").select("*").eq("user_id", user_id)
            
            if transaction_type:
                query = query.eq("transaction_type", transaction_type)
            
            response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            
            return response.data or []
            
        except Exception as e:
            print(f"Get transaction history error: {e}")
            return []

    async def get_credit_packages(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get available credit packages."""
        try:
            query = self.supabase.table("credit_packages").select("*")
            
            if active_only:
                query = query.eq("is_active", True)
            
            response = query.order("sort_order").execute()
            
            return response.data or []
            
        except Exception as e:
            print(f"Get packages error: {e}")
            return []

    async def get_package_by_id(self, package_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific credit package."""
        try:
            response = self.supabase.table("credit_packages").select("*").eq("id", package_id).single().execute()
            return response.data
        except Exception as e:
            print(f"Get package error: {e}")
            return None


# Singleton instance
_credit_service = None


def get_credit_service() -> CreditService:
    """Get or create CreditService singleton."""
    global _credit_service
    if _credit_service is None:
        _credit_service = CreditService()
    return _credit_service
