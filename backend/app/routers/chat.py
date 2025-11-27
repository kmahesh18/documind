"""
Chat Router - Per-file chat with history and context.
Includes credit checking and deduction.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from pydantic import BaseModel
from app.core.security import get_current_user
from app.models.schemas import ChatResponse, Citation
from app.services.langchain_rag import get_rag_service
from app.services.supabase_service import SupabaseService
from app.services.credit_service import get_credit_service

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    """Chat request with file context."""
    message: str
    file_id: str  # Required - each file has its own chat


class ChatHistoryMessage(BaseModel):
    """Chat message in history."""
    id: str
    role: str
    content: str
    citations: Optional[List[dict]] = None
    created_at: str


class ChatHistoryResponse(BaseModel):
    """Chat history response."""
    messages: List[ChatHistoryMessage]


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Chat with a specific file. Includes chat history for context.
    Checks and deducts credits before processing.
    """
    rag = get_rag_service()
    supabase = SupabaseService()
    credit_service = get_credit_service()
    user_id = current_user["user_id"]
    
    try:
        # Check if user has credits (minimum 1 credit required)
        has_credits, current_balance = await credit_service.check_credits(user_id, required_credits=1)
        
        if not has_credits:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "insufficient_credits",
                    "message": "You don't have enough credits. Please purchase more credits to continue.",
                    "credits_balance": current_balance,
                }
            )
        
        # Get recent chat history for context
        history = await supabase.get_file_chat_history(request.file_id, limit=10)
        
        # Format history for context
        chat_history = []
        for msg in history[-6:]:  # Last 3 exchanges (6 messages)
            chat_history.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Save user message first
        await supabase.save_file_chat_message(
            file_id=request.file_id,
            user_id=user_id,
            role="user",
            content=request.message
        )
        
        # Get AI response with history context
        response_text, citations = await rag.chat(
            query=request.message,
            file_id=request.file_id,
            chat_history=chat_history
        )
        
        # Flat rate: 1 credit per message
        credits_used = 1
        
        # Deduct credits
        deduct_success, new_balance, deduct_msg = await credit_service.deduct_credits(
            user_id=user_id,
            amount=credits_used,
            description=f"Chat: {request.message[:50]}...",
            reference_id=request.file_id,
            metadata={
                "file_id": request.file_id,
                "query": request.message[:100],
            }
        )
        
        if not deduct_success:
            print(f"Credit deduction warning: {deduct_msg}")
        
        # Save assistant response
        citations_json = [c.model_dump() for c in citations] if citations else None
        await supabase.save_file_chat_message(
            file_id=request.file_id,
            user_id=user_id,
            role="assistant",
            content=response_text,
            citations=citations_json
        )
        
        return ChatResponse(
            message=response_text,
            citations=citations,
            session_id=request.file_id,  # Use file_id as session
            credits_used=credits_used,
            credits_remaining=new_balance,
        )
        
    except Exception as e:
        error_msg = str(e)
        print(f"Chat error: {error_msg}")
        
        if "429" in error_msg or "rate" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limited. Please wait and try again.",
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {error_msg}",
        )


@router.get("/history/{file_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get chat history for a specific file."""
    supabase = SupabaseService()
    
    try:
        history = await supabase.get_file_chat_history(file_id, limit=100)
        
        messages = [
            ChatHistoryMessage(
                id=msg["id"],
                role=msg["role"],
                content=msg["content"],
                citations=msg.get("citations"),
                created_at=msg["created_at"]
            )
            for msg in history
        ]
        
        return ChatHistoryResponse(messages=messages)
        
    except Exception as e:
        print(f"History error: {e}")
        return ChatHistoryResponse(messages=[])


@router.delete("/history/{file_id}")
async def clear_chat_history(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Clear chat history for a file."""
    supabase = SupabaseService()
    user_id = current_user["user_id"]
    
    await supabase.clear_file_chat_history(file_id, user_id)
    return {"message": "Chat history cleared"}
