from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import verify_google_token, create_access_token, get_current_user
from app.models.schemas import GoogleAuthRequest, TokenResponse
from app.services.mongodb_service import get_mongodb_service
from app.services.credit_service import get_credit_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest):
    """
    Authenticate user with Google OAuth token.
    
    1. Verifies the Google token
    2. Gets or creates user in database
    3. Initializes credits for new users
    4. Returns JWT access token
    """
    # Verify Google token
    user_info = await verify_google_token(request.token)
    
    # Get or create user in database
    mongodb = get_mongodb_service()
    user = await mongodb.get_or_create_user(user_info)
    
    # Initialize credits for the user (handles existing users gracefully)
    credit_service = get_credit_service()
    try:
        await credit_service.get_user_credits(user["id"])
        print(f"Credits initialized/fetched for user: {user['email']}")
    except Exception as e:
        print(f"Warning: Could not initialize credits: {e}")
    
    # Create JWT token
    token_data = {
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
    }
    access_token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture", ""),
        },
    )


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user
