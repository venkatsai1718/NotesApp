from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: str
    username: str
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
    sender_id: Optional[str] = None
    receiver_id: str
    content: str
    created_at: Optional[datetime] = None

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    parent_id: str | None = None

# Update your TaskMessage model in models.py
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime

class TaskMessage(BaseModel):
    id: str
    text: str
    sender: str
    timestamp: datetime
    parentId: Optional[str] = None
    replies: List['TaskMessage'] = []
    
    @field_validator('timestamp', mode='before')
    @classmethod
    def parse_timestamp(cls, v):
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

# Enable forward references for recursive model
TaskMessage.model_rebuild()
    
class Task(BaseModel):
    id: str
    title: str
    status: str = "pending"
    messages: List[TaskMessage] = []
    created_at: datetime
    mentioned_users: List[str] = []
    
class TaskCreate(BaseModel):
    title: str
    status: str
    created_at: datetime

class TaskUpdate(BaseModel):
    title: str
    status: str
    messages: List[TaskMessage]


class LLMMessage(BaseModel):
    role: str
    context: str = ""
    message: str

class LLMRequest(BaseModel):
    messages: List[LLMMessage]
    use_search: bool = False

class Source(BaseModel):
    title: str
    snippet: str
    url: str

class LLMResponse(BaseModel):
    role: str
    message: str
    sources: Optional[List[Source]] = None
