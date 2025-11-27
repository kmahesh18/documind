"""
Credits Router - Endpoints for credit management and purchases.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from typing import Optional, List
from pydantic import BaseModel
from app.core.security import get_current_user
from app.services.credit_service import get_credit_service
from app.services.payment_service import get_payment_service

router = APIRouter(prefix="/credits", tags=["Credits"])


# ============= Request/Response Models =============

class UserCreditsResponse(BaseModel):
    """User credits balance response."""
    credits_balance: int
    total_purchased: int
    total_used: int


class CreditPackage(BaseModel):
    """Credit package details."""
    id: str
    name: str
    credits: int
    price_inr: float
    price_usd: Optional[float] = None
    description: Optional[str] = None
    is_popular: bool = False


class CreateOrderRequest(BaseModel):
    """Request to create a payment order."""
    package_id: str


class CreateOrderResponse(BaseModel):
    """Payment order response for frontend checkout."""
    order_id: str
    amount: int  # In paise
    amount_inr: float
    currency: str
    credits: int
    package_name: str
    key_id: str
    prefill: dict
    notes: dict


class VerifyPaymentRequest(BaseModel):
    """Request to verify payment."""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    """Payment verification response."""
    success: bool
    message: str
    new_balance: int


class TransactionResponse(BaseModel):
    """Credit transaction record."""
    id: str
    amount: int
    balance_after: int
    transaction_type: str
    description: Optional[str]
    created_at: str


# ============= Endpoints =============

@router.get("/balance", response_model=UserCreditsResponse)
async def get_credits_balance(
    current_user: dict = Depends(get_current_user),
):
    """Get current user's credit balance."""
    credit_service = get_credit_service()
    user_id = current_user["user_id"]
    
    try:
        credits = await credit_service.get_user_credits(user_id)
        return UserCreditsResponse(
            credits_balance=credits["credits_balance"],
            total_purchased=credits["total_purchased"],
            total_used=credits["total_used"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get credits: {str(e)}",
        )


@router.get("/packages", response_model=List[CreditPackage])
async def get_credit_packages(
    current_user: dict = Depends(get_current_user),
):
    """Get available credit packages for purchase."""
    credit_service = get_credit_service()
    
    try:
        packages = await credit_service.get_credit_packages(active_only=True)
        return [
            CreditPackage(
                id=p["id"],
                name=p["name"],
                credits=p["credits"],
                price_inr=float(p["price_inr"]),
                price_usd=float(p["price_usd"]) if p.get("price_usd") else None,
                description=p.get("description"),
                is_popular=p.get("is_popular", False),
            )
            for p in packages
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get packages: {str(e)}",
        )


@router.post("/order", response_model=CreateOrderResponse)
async def create_payment_order(
    request: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a Razorpay order for purchasing credits."""
    payment_service = get_payment_service()
    user_id = current_user["user_id"]
    user_email = current_user.get("email", "")
    user_name = current_user.get("name", "User")
    
    try:
        order = await payment_service.create_order(
            user_id=user_id,
            package_id=request.package_id,
            user_email=user_email,
            user_name=user_name,
        )
        return CreateOrderResponse(**order)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/verify", response_model=VerifyPaymentResponse)
async def verify_payment(
    request: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user),
):
    """Verify payment and add credits to user account."""
    payment_service = get_payment_service()
    user_id = current_user["user_id"]
    
    try:
        success, message, new_balance = await payment_service.verify_and_complete_payment(
            user_id=user_id,
            razorpay_order_id=request.razorpay_order_id,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_signature=request.razorpay_signature,
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message,
            )
        
        return VerifyPaymentResponse(
            success=True,
            message=message,
            new_balance=new_balance,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment verification failed: {str(e)}",
        )


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transaction_history(
    limit: int = 20,
    offset: int = 0,
    transaction_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get user's credit transaction history."""
    credit_service = get_credit_service()
    user_id = current_user["user_id"]
    
    try:
        transactions = await credit_service.get_transaction_history(
            user_id=user_id,
            limit=limit,
            offset=offset,
            transaction_type=transaction_type,
        )
        return [
            TransactionResponse(
                id=t["id"],
                amount=t["amount"],
                balance_after=t["balance_after"],
                transaction_type=t["transaction_type"],
                description=t.get("description"),
                created_at=t["created_at"],
            )
            for t in transactions
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get transactions: {str(e)}",
        )


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
):
    """Handle Razorpay webhook events."""
    payment_service = get_payment_service()
    
    try:
        payload = await request.json()
        signature = x_razorpay_signature or ""
        
        success = await payment_service.handle_webhook(payload, signature)
        
        if success:
            return {"status": "ok"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook processing failed",
            )
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
