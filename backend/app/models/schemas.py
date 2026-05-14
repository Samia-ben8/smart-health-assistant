from pydantic import BaseModel
from typing import Optional, Literal

class ChatRequest(BaseModel):
    message: str
    session_id: str
    channel: Optional[Literal["chat", "voice"]] = "chat"

class ChatResponse(BaseModel):
    response: str
