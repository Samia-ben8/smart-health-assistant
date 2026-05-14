from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.ai_service import generate_response

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    reply = generate_response(req.message, req.session_id, req.channel or "chat")
    return {"response": reply}
