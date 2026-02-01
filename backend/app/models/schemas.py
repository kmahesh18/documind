from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime


# Auth Models
class GoogleAuthRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None


# File Models
FileType = Literal["pdf", "txt", "csv", "image", "video", "audio", "ppt", "pptx" , "docx", "doc", "xlsx", "xls"]
FileStatus = Literal["uploading", "processing", "ready", "error"]


class FileUploadResponse(BaseModel):
    file_id: str
    file_url: str
    status: FileStatus = "processing"


class FileResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    file_type: FileType
    file_url: str
    status: FileStatus
    created_at: datetime
    updated_at: datetime
    metadata: Optional[dict] = None


# Chat Models
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: Optional[str] = None


class Citation(BaseModel):
    source_url: str
    file_type: FileType
    filename: str
    page_number: Optional[int] = None
    timestamp: Optional[float] = None  # seconds for video/audio
    text_snippet: str
    relevance_score: float


class ChatResponse(BaseModel):
    message: str
    citations: List[Citation]
    session_id: Optional[str] = None  # Made optional
    credits_used: Optional[int] = None  # Credits consumed for this message
    credits_remaining: Optional[int] = None  # User's remaining credits


class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    citations: Optional[List[Citation]] = None
    created_at: datetime


class ChatSession(BaseModel):
    id: str
    user_id: str
    title: str
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime
