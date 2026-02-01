from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import List, Union
import json


class Settings(BaseSettings):
    # App Configuration
    app_name: str = "DocuMind API"
    debug: bool = False
    api_prefix: str = "/api"
    
    # Authentication
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    google_client_id: str = ""
    
    # MongoDB Configuration
    mongodb_url: str = ""
    mongodb_db_name: str = "documind"
    
    # Cloudinary Configuration (for file storage)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    
    # Google Gemini Configuration
    gemini_api_key: str = ""
    # Using embedding-001 which produces 384 dimensions (matches Pinecone index)
    gemini_embedding_model: str = "models/embedding-001"
    gemini_chat_model: str = "gemini-2.0-flash"
    
    # Groq Configuration (for Whisper transcription)
    groq_api_key: str = ""
    
    # Pinecone Configuration
    pinecone_api_key: str = ""
    pinecone_index_name: str = "documind"
    pinecone_environment: str = "us-east-1"
    
    # Razorpay Configuration (for payments)
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    
    # Credits Configuration
    free_signup_credits: int = 100
    credits_per_token: float = 1.0  # 1 credit = 1 token
    
    # CORS - accepts comma-separated string or JSON array
    cors_origins: Union[str, List[str]] = "http://localhost:3000"
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            # Handle wildcard for all origins
            if v.strip() == "*":
                return ["*"]
            # Try parsing as JSON first
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            # Otherwise treat as comma-separated string
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return ["*"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
