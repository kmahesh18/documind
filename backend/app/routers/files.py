import uuid
import mimetypes
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from typing import List
from app.core.security import get_current_user
from app.models.schemas import FileUploadResponse, FileResponse
from app.services.supabase_service import SupabaseService
from app.services.local_processor import local_processor

router = APIRouter(prefix="/files", tags=["Files"])

# Allowed file types
ALLOWED_EXTENSIONS = {
    # Documents
    ".pdf": "pdf",
    ".txt": "txt",
    ".md": "txt",
    ".docx": "docx",
    ".doc": "doc",
    ".rtf": "txt",
    # Spreadsheets
    ".xlsx": "xlsx",
    ".xls": "xls",
    ".csv": "csv",
    # Images8
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".gif": "image",
    ".webp": "image",
    ".bmp": "image",
    # Video
    ".mp4": "video",
    ".webm": "video",
    ".mov": "video",
    ".avi": "video",
    ".mkv": "video",
    # Audio
    ".mp3": "audio",
    ".wav": "audio",
    ".m4a": "audio",
    ".ogg": "audio",
    ".flac": "audio",
    # Presentations
    ".ppt": "ppt",
    ".pptx": "ppt",
    # Code/Data
    ".json": "txt",
    ".xml": "txt",
    ".html": "txt",
    ".css": "txt",
    ".js": "txt",
    ".py": "txt",
    ".java": "txt",
    ".cpp": "txt",
    ".c": "txt",
}

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


def get_file_type(filename: str) -> str:
    """Determine file type from extension."""
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    return ALLOWED_EXTENSIONS.get(ext)


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a file for processing.
    
    1. Validates file type and size
    2. Uploads to Supabase Storage
    3. Creates file record in database
    4. Processes file in background (extract text, generate embeddings, store in Pinecone)
    """
    user_id = current_user["user_id"]
    
    # Validate file type
    file_type = get_file_type(file.filename)
    if not file_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {list(ALLOWED_EXTENSIONS.keys())}",
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )
    
    # Generate unique file path
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split(".")[-1].lower()
    file_path = f"{user_id}/{file_id}.{file_extension}"
    
    # Get content type
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
    
    # Upload to Supabase Storage
    supabase = SupabaseService()
    try:
        file_url = await supabase.upload_file(file_path, content, content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )
    
    # Create file record in database
    file_record = {
        "id": file_id,
        "user_id": user_id,
        "filename": file.filename,
        "file_type": file_type,
        "file_url": file_url,
        "file_path": file_path,
        "status": "processing",
    }
    
    try:
        await supabase.create_file_record(file_record)
    except Exception as e:
        # Clean up uploaded file if database insert fails
        await supabase.delete_file(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create file record: {str(e)}",
        )
    
    # Process file in background
    asyncio.create_task(process_file_locally(
        file_url, file_id, user_id, file.filename, file_type
    ))
    
    return FileUploadResponse(
        file_id=file_id,
        file_url=file_url,
        status="processing",
    )


async def process_file_locally(file_url: str, file_id: str, user_id: str, filename: str, file_type: str):
    """Background task to process file."""
    supabase = SupabaseService()
    try:
        success = await local_processor.process_file(
            file_url=file_url,
            file_id=file_id,
            user_id=user_id,
            filename=filename,
            file_type=file_type,
        )
        
        # Update file status
        new_status = "ready" if success else "error"
        await supabase.update_file_status(file_id, new_status)
        print(f"File {filename} processing complete: {new_status}")
        
    except Exception as e:
        print(f"Local processing error: {e}")
        await supabase.update_file_status(file_id, "error")


@router.get("", response_model=List[FileResponse])
async def get_user_files(current_user: dict = Depends(get_current_user)):
    """Get all files for the current user."""
    supabase = SupabaseService()
    files = await supabase.get_user_files(current_user["user_id"])
    return files


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific file by ID."""
    supabase = SupabaseService()
    file = await supabase.get_file(file_id, current_user["user_id"])
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    return file


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a file."""
    supabase = SupabaseService()
    user_id = current_user["user_id"]
    
    # Get file record
    file = await supabase.get_file(file_id, user_id)
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    # Delete from storage
    try:
        await supabase.delete_file(file["file_path"])
    except Exception as e:
        print(f"Warning: Failed to delete file from storage: {e}")
    
    # Delete from database
    await supabase.delete_file_record(file_id, user_id)
    
    # TODO: Also delete vectors from Pinecone
    
    return {"message": "File deleted successfully"}


@router.post("/webhook/status")
async def update_file_status(
    file_id: str,
    status: str,
    error_message: str = None,
):
    """
    Webhook endpoint for n8n to update file processing status.
    Called when file processing is complete or fails.
    """
    if status not in ["ready", "error"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be 'ready' or 'error'",
        )
    
    supabase = SupabaseService()
    result = await supabase.update_file_status(file_id, status, error_message)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    return {"message": "Status updated successfully"}
