"""
MongoDB Service - Async database operations using Motor
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from typing import Optional, Dict, List, Any
from datetime import datetime
from bson import ObjectId
import cloudinary
import cloudinary.uploader
from app.core.config import get_settings

settings = get_settings()

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True
)

_mongodb_client: Optional[AsyncIOMotorClient] = None
_mongodb_db: Optional[AsyncIOMotorDatabase] = None


def get_mongodb_client() -> AsyncIOMotorClient:
    """Get or create MongoDB client singleton."""
    global _mongodb_client
    if _mongodb_client is None:
        _mongodb_client = AsyncIOMotorClient(settings.mongodb_url)
    return _mongodb_client


def get_mongodb() -> AsyncIOMotorDatabase:
    """Get or create MongoDB database instance."""
    global _mongodb_db
    if _mongodb_db is None:
        client = get_mongodb_client()
        _mongodb_db = client[settings.mongodb_db_name]
    return _mongodb_db


class MongoDBService:
    """Service for MongoDB operations."""

    def __init__(self):
        self.db = get_mongodb()

    # User operations
    async def get_or_create_user(self, user_data: dict) -> dict:
        """Get existing user or create new one."""
        email = user_data["email"]
        
        # Check if user exists
        user = await self.db.users.find_one({"email": email})
        
        if user:
            user["id"] = str(user["_id"])
            return user
        
        # Create new user
        new_user = {
            "email": email,
            "name": user_data.get("name", ""),
            "picture": user_data.get("picture", ""),
            "google_id": user_data.get("google_id", ""),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        result = await self.db.users.insert_one(new_user)
        new_user["id"] = str(result.inserted_id)
        new_user["_id"] = result.inserted_id
        return new_user

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID."""
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["id"] = str(user["_id"])
        return user

    # File storage operations - Cloudinary
    async def upload_file(self, file_path: str, file_content: bytes, content_type: str) -> str:
        """Upload file to Cloudinary and return secure URL."""
        try:
            import io
            import traceback
            
            print(f"[Cloudinary] Starting upload: {file_path}, content_type: {content_type}, size: {len(file_content)} bytes")
            
            # Determine resource type based on content type
            # Use 'image' for images, 'video' for audio/video, 'raw' for docs
            if content_type.startswith("video/") or content_type.startswith("audio/"):
                resource_type = "video"
            elif content_type.startswith("image/"):
                resource_type = "image"
            else:
                resource_type = "raw"  # For PDFs, docs, text, etc.
            
            print(f"[Cloudinary] Resource type: {resource_type}")
            
            # Generate a clean public_id (remove problematic characters)
            public_id = file_path.replace("/", "_").replace(".", "_").replace(" ", "_")
            
            # Upload to Cloudinary - run in executor since it's blocking
            import asyncio
            loop = asyncio.get_event_loop()
            
            def do_upload():
                upload_options = {
                    "public_id": public_id,
                    "resource_type": resource_type,
                    "folder": "documind",
                    "unique_filename": True,
                }
                # For raw files (PDFs, text), add flags to allow inline display
                if resource_type == "raw":
                    upload_options["flags"] = "attachment:false"
                
                return cloudinary.uploader.upload(
                    file_content,  # Pass bytes directly
                    **upload_options
                )
            
            result = await loop.run_in_executor(None, do_upload)
            
            secure_url = result.get('secure_url')
            print(f"[Cloudinary] Upload success: {secure_url}")
            
            # For raw files like PDFs, modify URL to enable inline viewing
            # Cloudinary raw URLs default to attachment, add fl_attachment:false
            if resource_type == "raw" and "/raw/upload/" in secure_url:
                # Insert transformation for inline display
                secure_url = secure_url.replace("/raw/upload/", "/raw/upload/fl_attachment:false/")
                print(f"[Cloudinary] Modified URL for inline display: {secure_url}")
            
            return secure_url
        except Exception as e:
            import traceback
            print(f"[Cloudinary] Upload error: {e}")
            traceback.print_exc()
            raise Exception(f"Failed to upload file: {str(e)}")

    async def delete_file(self, file_url: str) -> bool:
        """Delete file from Cloudinary."""
        try:
            # Extract public_id from Cloudinary URL
            # URL format: https://res.cloudinary.com/{cloud}/raw/upload/v123/documind/public_id.ext
            if "cloudinary.com" in file_url:
                # Extract public_id from URL
                parts = file_url.split("/")
                # Find the index of "documind" folder and get everything after
                if "documind" in parts:
                    idx = parts.index("documind")
                    public_id = "documind/" + "/".join(parts[idx+1:]).rsplit(".", 1)[0]
                    cloudinary.uploader.destroy(public_id, resource_type="raw")
            return True
        except Exception as e:
            print(f"Failed to delete file from Cloudinary: {str(e)}")
            return False

    # File metadata operations
    async def create_file_record(self, file_data: dict) -> dict:
        """Create file record in database."""
        file_data["created_at"] = datetime.utcnow()
        file_data["updated_at"] = datetime.utcnow()
        
        # Keep the id field and also set _id for MongoDB
        # Don't delete id - MongoDB has a unique index on it
        if "id" in file_data:
            file_data["_id"] = file_data["id"]
            # Keep the id field - don't delete it!
        
        result = await self.db.files.insert_one(file_data)
        
        # Ensure id is set in returned data
        if "id" not in file_data:
            file_data["id"] = str(result.inserted_id)
        
        return file_data

    async def get_user_files(self, user_id: str) -> list:
        """Get all files for a user."""
        cursor = self.db.files.find({"user_id": user_id}).sort("created_at", -1)
        files = await cursor.to_list(length=None)
        
        for file in files:
            file["id"] = file.get("id", str(file["_id"]))
        
        return files

    async def get_file(self, file_id: str, user_id: str) -> Optional[dict]:
        """Get single file by ID for user."""
        file = await self.db.files.find_one({"_id": file_id, "user_id": user_id})
        
        if file:
            file["id"] = str(file["_id"])
        
        return file

    async def update_file_status(
        self, file_id: str, status: str, error_message: str = None
    ) -> Optional[dict]:
        """Update file processing status."""
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        if error_message:
            update_data["error_message"] = error_message
        
        result = await self.db.files.find_one_and_update(
            {"_id": file_id},
            {"$set": update_data},
            return_document=True
        )
        
        if result:
            result["id"] = str(result["_id"])
        
        return result

    async def delete_file_record(self, file_id: str, user_id: str) -> bool:
        """Delete file record from database."""
        result = await self.db.files.delete_one({"_id": file_id, "user_id": user_id})
        return result.deleted_count > 0

    # Chat session operations
    async def create_chat_session(self, user_id: str, title: str = "New Chat") -> dict:
        """Create new chat session."""
        session = {
            "user_id": user_id,
            "title": title,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        result = await self.db.chat_sessions.insert_one(session)
        session["id"] = str(result.inserted_id)
        return session

    async def get_chat_sessions(self, user_id: str) -> list:
        """Get all chat sessions for user."""
        cursor = self.db.chat_sessions.find({"user_id": user_id}).sort("updated_at", -1)
        sessions = await cursor.to_list(length=None)
        
        for session in sessions:
            session["id"] = str(session["_id"])
        
        return sessions

    async def save_chat_message(self, session_id: str, message_data: dict) -> dict:
        """Save chat message to session."""
        message_data["session_id"] = session_id
        message_data["created_at"] = datetime.utcnow()
        
        result = await self.db.chat_messages.insert_one(message_data)
        message_data["id"] = str(result.inserted_id)
        
        # Update session timestamp
        await self.db.chat_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        
        return message_data

    async def get_session_messages(self, session_id: str) -> list:
        """Get all messages for a chat session."""
        cursor = self.db.chat_messages.find({"session_id": session_id}).sort("created_at", 1)
        messages = await cursor.to_list(length=None)
        
        for message in messages:
            message["id"] = str(message["_id"])
        
        return messages

    # File Chat operations (per-file chat history)
    async def get_file_chat_history(self, file_id: str, limit: int = 50) -> list:
        """Get chat history for a specific file."""
        cursor = self.db.file_chat_messages.find({"file_id": file_id}).sort("created_at", 1).limit(limit)
        messages = await cursor.to_list(length=limit)
        
        for message in messages:
            message["id"] = str(message["_id"])
        
        return messages

    async def save_file_chat_message(
        self, 
        file_id: str, 
        user_id: str, 
        role: str, 
        content: str, 
        citations: list = None
    ) -> dict:
        """Save a chat message for a file."""
        message_data = {
            "file_id": file_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "citations": citations or [],
            "created_at": datetime.utcnow(),
        }
        
        result = await self.db.file_chat_messages.insert_one(message_data)
        message_data["id"] = str(result.inserted_id)
        
        return message_data

    # Credits operations
    async def get_user_credits(self, user_id: str) -> Optional[dict]:
        """Get user's credit balance and stats."""
        credits = await self.db.user_credits.find_one({"user_id": user_id})
        if credits:
            credits["id"] = str(credits["_id"])
        return credits

    async def initialize_user_credits(self, user_id: str, initial_credits: int) -> dict:
        """Initialize credits for a new user."""
        credits_data = {
            "user_id": user_id,
            "credits_balance": initial_credits,
            "total_purchased": 0,
            "total_used": 0,
            "created_at": datetime.utcnow(),
        }
        
        try:
            result = await self.db.user_credits.insert_one(credits_data)
            credits_data["id"] = str(result.inserted_id)
            
            # Log signup bonus transaction
            await self.db.credit_transactions.insert_one({
                "user_id": user_id,
                "amount": initial_credits,
                "balance_after": initial_credits,
                "transaction_type": "signup_bonus",
                "description": f"Welcome bonus - {initial_credits} free credits",
                "created_at": datetime.utcnow(),
            })
            
            return credits_data
        except Exception as e:
            # If duplicate (user already has credits), just fetch existing
            if "duplicate" in str(e).lower() or "E11000" in str(e):
                return await self.get_user_credits(user_id)
            raise

    async def update_user_credits(
        self, 
        user_id: str, 
        credits_delta: int,
        transaction_type: str,
        description: str,
        reference_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Optional[dict]:
        """Update user credits (positive or negative delta)."""
        # Get current credits
        credits = await self.get_user_credits(user_id)
        if not credits:
            return None
        
        new_balance = credits["credits_balance"] + credits_delta
        
        # Prevent negative balance
        if new_balance < 0:
            return None
        
        # Update balance
        update_data = {
            "credits_balance": new_balance,
            "updated_at": datetime.utcnow(),
        }
        
        if credits_delta < 0:
            update_data["total_used"] = credits.get("total_used", 0) + abs(credits_delta)
        elif transaction_type == "purchase":
            update_data["total_purchased"] = credits.get("total_purchased", 0) + credits_delta
        
        result = await self.db.user_credits.find_one_and_update(
            {"user_id": user_id},
            {"$set": update_data},
            return_document=True
        )
        
        # Log transaction
        await self.db.credit_transactions.insert_one({
            "user_id": user_id,
            "amount": credits_delta,
            "balance_after": new_balance,
            "transaction_type": transaction_type,
            "description": description,
            "reference_id": reference_id,
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
        })
        
        if result:
            result["id"] = str(result["_id"])
        
        return result

    async def get_credit_transactions(self, user_id: str, limit: int = 50) -> list:
        """Get credit transaction history for a user."""
        cursor = self.db.credit_transactions.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        transactions = await cursor.to_list(length=limit)
        
        for tx in transactions:
            tx["id"] = str(tx["_id"])
        
        return transactions


# Singleton instance
_mongodb_service: Optional[MongoDBService] = None


def get_mongodb_service() -> MongoDBService:
    """Get or create MongoDB service singleton."""
    global _mongodb_service
    if _mongodb_service is None:
        _mongodb_service = MongoDBService()
    return _mongodb_service
