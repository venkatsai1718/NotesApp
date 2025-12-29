from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class User(BaseModel):
    id: Optional[str]
    email: str
    
class NoteCreate(BaseModel):
    title: str
    body: str
    
class Note(BaseModel):
    title: str
    body: str
    createdAt: datetime

class ProjectCreate(BaseModel):
    title: str
    description: str
    
class Project(BaseModel):
    id: Optional[str] = Field(alias="_id")
    title: str
    description: str
    members: List[User] = Field(default_factory=list)
    notes: List[Note] = Field(default_factory=list)
    createdBy: str
    createdAt: Optional[datetime] = None

class AddMember(BaseModel):
    email: str
    

class Message(BaseModel):
    sender_id: Optional[str] = None  # will be set automatically
    receiver_id: str
    content: str
    created_at: Optional[datetime] = None  # will be set automatically

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    parent_id: str | None = None
    
class LLMMessage(BaseModel):
    role: str   # "user" | "assistant"
    message: str

class LLMRequest(BaseModel):
    messages: List[LLMMessage]