from supabase import create_client, Client
from app.core.config import get_settings

settings = get_settings()

_supabase_client: Client = None


def get_supabase() -> Client:
    """Get or create Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(settings.supabase_url, settings.supabase_key)
    return _supabase_client


class SupabaseService:
    """Service for Supabase operations."""

    def __init__(self):
        self.client = get_supabase()
        self.bucket = settings.supabase_storage_bucket

    async def upload_file(
        self, file_path: str, file_content: bytes, content_type: str
    ) -> str:
        """Upload file to Supabase Storage and return public URL."""
        try:
            # Upload the file
            response = self.client.storage.from_(self.bucket).upload(
                file_path,
                file_content,
                file_options={"content-type": content_type, "upsert": "true"},
            )
            # Get public URL
            url = self.client.storage.from_(self.bucket).get_public_url(file_path)
            return url
        except Exception as e:
            error_msg = str(e)
            print(f"Supabase upload error: {error_msg}")
            if "Bucket not found" in error_msg:
                raise Exception(f"Storage bucket '{self.bucket}' not found. Please create it in Supabase Dashboard > Storage.")
            raise Exception(f"Failed to upload file: {error_msg}")

    async def delete_file(self, file_path: str) -> bool:
        """Delete file from Supabase Storage."""
        try:
            self.client.storage.from_(self.bucket).remove([file_path])
            return True
        except Exception as e:
            raise Exception(f"Failed to delete file: {str(e)}")

    # User operations
    async def get_or_create_user(self, user_data: dict) -> dict:
        """Get existing user or create new one."""
        email = user_data["email"]
        
        # Check if user exists
        result = self.client.table("users").select("*").eq("email", email).execute()
        
        if result.data:
            return result.data[0]
        
        # Create new user
        new_user = {
            "email": email,
            "name": user_data.get("name", ""),
            "picture": user_data.get("picture", ""),
            "google_id": user_data.get("google_id", ""),
        }
        result = self.client.table("users").insert(new_user).execute()
        return result.data[0]

    # File metadata operations
    async def create_file_record(self, file_data: dict) -> dict:
        """Create file record in database."""
        result = self.client.table("files").insert(file_data).execute()
        return result.data[0]

    async def get_user_files(self, user_id: str) -> list:
        """Get all files for a user."""
        result = (
            self.client.table("files")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    async def get_file(self, file_id: str, user_id: str) -> dict:
        """Get single file by ID for user."""
        result = (
            self.client.table("files")
            .select("*")
            .eq("id", file_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data

    async def update_file_status(
        self, file_id: str, status: str, error_message: str = None
    ) -> dict:
        """Update file processing status."""
        update_data = {"status": status, "updated_at": "now()"}
        if error_message:
            update_data["error_message"] = error_message
        
        result = (
            self.client.table("files")
            .update(update_data)
            .eq("id", file_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def delete_file_record(self, file_id: str, user_id: str) -> bool:
        """Delete file record from database."""
        result = (
            self.client.table("files")
            .delete()
            .eq("id", file_id)
            .eq("user_id", user_id)
            .execute()
        )
        return len(result.data) > 0

    # Chat session operations
    async def create_chat_session(self, user_id: str, title: str = "New Chat") -> dict:
        """Create new chat session."""
        result = (
            self.client.table("chat_sessions")
            .insert({"user_id": user_id, "title": title})
            .execute()
        )
        return result.data[0]

    async def get_chat_sessions(self, user_id: str) -> list:
        """Get all chat sessions for user."""
        result = (
            self.client.table("chat_sessions")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        return result.data

    async def save_chat_message(self, session_id: str, message_data: dict) -> dict:
        """Save chat message to session."""
        message_data["session_id"] = session_id
        result = self.client.table("chat_messages").insert(message_data).execute()
        
        # Update session timestamp
        self.client.table("chat_sessions").update(
            {"updated_at": "now()"}
        ).eq("id", session_id).execute()
        
        return result.data[0]

    async def get_session_messages(self, session_id: str) -> list:
        """Get all messages for a chat session."""
        result = (
            self.client.table("chat_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        return result.data

    # File Chat operations (per-file chat history)
    async def get_file_chat_history(self, file_id: str, limit: int = 50) -> list:
        """Get chat history for a specific file."""
        result = (
            self.client.table("file_chat_messages")
            .select("*")
            .eq("file_id", file_id)
            .order("created_at")
            .limit(limit)
            .execute()
        )
        return result.data

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
        }
        if citations:
            message_data["citations"] = citations
        
        result = self.client.table("file_chat_messages").insert(message_data).execute()
        return result.data[0] if result.data else None

    async def clear_file_chat_history(self, file_id: str, user_id: str) -> bool:
        """Clear chat history for a file."""
        self.client.table("file_chat_messages").delete().eq("file_id", file_id).eq("user_id", user_id).execute()
        return True
