"""
Credit Service - Manages user credits, transactions, and token counting.
"""
from typing import Optional, Tuple, List, Dict, Any
from app.services.mongodb_service import get_mongodb_service
from app.core.config import get_settings
import math

settings = get_settings()


class CreditService:
    """Service for managing user credits."""

    def __init__(self):
        self.mongodb = get_mongodb_service()
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
            credits = await self.mongodb.get_user_credits(user_id)
            
            if credits:
                return {
                    "credits_balance": credits["credits_balance"],
                    "total_purchased": credits.get("total_purchased", 0),
                    "total_used": credits.get("total_used", 0),
                    "created_at": credits.get("created_at"),
                }
            else:
                # Initialize credits for new user
                return await self.initialize_user_credits(user_id)
        except Exception as e:
            print(f"Error getting user credits: {e}")
            return await self.initialize_user_credits(user_id)

    async def initialize_user_credits(self, user_id: str) -> Dict[str, Any]:
        """Initialize credits for a new user with free signup bonus."""
        try:
            credits = await self.mongodb.initialize_user_credits(user_id, self.free_credits)
            
            return {
                "credits_balance": credits["credits_balance"],
                "total_purchased": credits.get("total_purchased", 0),
                "total_used": credits.get("total_used", 0),
                "created_at": credits.get("created_at"),
            }
        except Exception as e:
            print(f"Error initializing credits: {e}")
            # If already exists, just fetch
            credits = await self.mongodb.get_user_credits(user_id)
            if credits:
                return {
                    "credits_balance": credits["credits_balance"],
                    "total_purchased": credits.get("total_purchased", 0),
                    "total_used": credits.get("total_used", 0),
                    "created_at": credits.get("created_at"),
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
            result = await self.mongodb.update_user_credits(
                user_id=user_id,
                credits_delta=-amount,
                transaction_type="chat_usage",
                description=description,
                reference_id=reference_id,
                metadata=metadata
            )
            
            if result:
                return True, result["credits_balance"], "Credits deducted successfully"
            else:
                # Check current balance for better error message
                credits = await self.mongodb.get_user_credits(user_id)
                if credits:
                    return False, credits["credits_balance"], "Insufficient credits"
                return False, 0, "User credits not found"
            
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
            result = await self.mongodb.update_user_credits(
                user_id=user_id,
                credits_delta=amount,
                transaction_type=transaction_type,
                description=description,
                reference_id=reference_id,
                metadata=metadata
            )
            
            if result:
                return True, result["credits_balance"], "Credits added successfully"
            else:
                return False, 0, "Failed to add credits"
            
        except Exception as e:
            print(f"Add credits error: {e}")
            return False, 0, str(e)

    async def get_transaction_history(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get credit transaction history for a user."""
        try:
            transactions = await self.mongodb.get_credit_transactions(user_id, limit=limit)
            return transactions
            
        except Exception as e:
            print(f"Get transaction history error: {e}")
            return []

    async def get_credit_packages(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get available credit packages."""
        try:
            query = {"is_active": True} if active_only else {}
            cursor = self.mongodb.db.credit_packages.find(query).sort("sort_order", 1)
            packages = await cursor.to_list(length=None)
            
            for pkg in packages:
                pkg["id"] = str(pkg["_id"])
            
            return packages
            
        except Exception as e:
            print(f"Get packages error: {e}")
            return []

    async def get_package_by_id(self, package_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific credit package."""
        try:
            from bson import ObjectId
            package = await self.mongodb.db.credit_packages.find_one({"_id": ObjectId(package_id)})
            if package:
                package["id"] = str(package["_id"])
            return package
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
