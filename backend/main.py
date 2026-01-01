from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import models, database, schemas
from authentication import login_user, get_current_user
from bson import ObjectId
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from hashing import Hash
import jwt_token

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = database.get_db()

@app.get('/users')
async def get_users():
    users = []
    async for user in db['users'].find():
        users.append(schemas.get_user(user))
    return users


@app.post("/register")
async def register(user: models.UserCreate):

    existing_user = await db["users"].find_one({
        "$or": [
            {"email": user.email},
            {"username": user.username}
        ]
    })
    if existing_user:
        if existing_user.get("email") == user.email:
            raise HTTPException(status_code=400, detail="Email already registered")
        if existing_user.get("username") == user.username:
            raise HTTPException(status_code=400, detail="Username already taken")


    hashed_password = Hash.bcrypt(user.password)
    await db["users"].insert_one({
        "name": user.name,
        "email": user.email,
        "username": user.username,
        "password": hashed_password,
    })

    return {"message": "User registered successfully"}

@app.post("/login")
async def login(request: OAuth2PasswordRequestForm = Depends()):
    return await login_user(request)

@app.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"]
    }
    


# @app.get("/projects")
# async def get_projects():
#     projects = []
#     async for project in db['projects'].find():
#         projects.append(schemas.get_project(project))
#     return projects

@app.get("/projects")
async def get_projects(
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])

    projects = []
    async for project in db["projects"].find({
        "members.id": user_id
    }):
        projects.append(schemas.get_project(project))

    return projects


@app.post("/projects")
async def create_project(
    project: models.ProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    project_dict = project.model_dump()

    project_dict["members"] = [{
        "id": str(current_user["_id"]),
        "name": current_user['name'],
        "email": current_user["email"]
    }]

    project_dict["notes"] = []
    project_dict['createdBy'] = str(current_user['_id'])
    project_dict["createdAt"] = datetime.utcnow().replace(microsecond=0)

    result = await db["projects"].insert_one(project_dict)
    # print(project_dict)
    return {
        "Message": "Project created",
        "Title": project_dict['title'],
        "id": str(result.inserted_id)
    }


@app.get('/projects/{project_id}')
async def get_project_by_id(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        project_object_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    user_id = str(current_user["_id"])

    project = await db.projects.find_one({
        "_id": project_object_id,
        "$or": [
            {"members.id": user_id},
            {"createdBy": user_id}  # allow creator to fetch
        ]
    })

    # print("Fetching project for user_id:", user_id)
    # print("Project found:", project)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 🔹 Project ID
    project["id"] = str(project["_id"])
    del project["_id"]

    # 🔹 Notes IDs
    for note in project.get("notes", []):
        note["id"] = str(note["_id"])
        del note["_id"]

    return project


    

@app.post("/projects/{project_id}/notes")
async def add_note(project_id: str, note: models.NoteCreate, current_user: models.User = Depends(get_current_user)):
    note_dict = note.model_dump()
    note_dict["_id"] = ObjectId()
    note_dict["createdAt"] = datetime.utcnow().replace(microsecond=0)
    # print(note_dict)
    await db["projects"].update_one(
        {"_id": ObjectId(project_id)},
        {"$push": {"notes": note_dict}}
    )

    return {
        "message": "Note added",
        "note_id": str(note_dict["_id"])  # return note ID to frontend
    }

@app.put("/projects/{project_id}/notes/{note_id}")
async def update_note(project_id: str, note_id: str, note: models.NoteCreate, current_user: models.User = Depends(get_current_user)):
    await db["projects"].update_one(
        {
            "_id": ObjectId(project_id),
            "notes._id": ObjectId(note_id),
        },
        {
            "$set": {
                "notes.$.title": note.title,
                "notes.$.body": note.body,
                "notes.$.createdAt": datetime.utcnow().replace(microsecond=0),
            }
        }
    )

    return {"message": "Note updated"}

@app.delete("/projects/{project_id}/notes/{note_id}")
async def delete_note(project_id: str, note_id: str, current_user: models.User = Depends(get_current_user)):
    result = await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$pull": {"notes": {"_id": ObjectId(note_id)}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted successfully"}


@app.post("/projects/{project_id}/members")
async def add_member(project_id: str, member: models.AddMember, current_user: dict = Depends(get_current_user)):
    """
    Add a member to a project by email.
    Only the project creator can add members.
    """
    try:
        project_object_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db.projects.find_one({"_id": project_object_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project["createdBy"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only the creator can add members")

    # Check if user exists
    user = await db.users.find_one({"email": member.email})
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")

    # Check if already a member
    if any(m["id"] == str(user["_id"]) for m in project.get("members", [])):
        raise HTTPException(status_code=400, detail="User is already a member")

    # Add member
    new_member = {"id": str(user["_id"]), "name": user['name'], "email": user["email"]}
    await db.projects.update_one(
        {"_id": project_object_id},
        {"$push": {"members": new_member}}
    )

    return {
        "message": f"{member.email} added",
        "member": {
            "id": str(user["_id"]),
            "name": new_member["name"],
            "email": user["email"]
        }
    }
    

@app.get("/messages")
async def get_my_messages(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])

    messages = await db.messages.find({
        "$or": [
            {"sender_id": user_id},
            {"receiver_id": user_id},
        ]
    }).sort("created_at", 1).to_list(1000)

    # Add sender_name to each message
    for msg in messages:
        sender = await db.users.find_one({"_id": ObjectId(msg["sender_id"])})
        msg["_id"] = str(msg["_id"])
        msg["sender_name"] = sender["name"] if sender else "Unknown"

    return messages

@app.get("/messages/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])

    # Find distinct senders who have messages with current user
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user_id},
            {"receiver_id": user_id},
        ]
    }).to_list(1000)

    # Collect unique user IDs
    user_ids = set()
    for msg in messages:
        if msg["sender_id"] != user_id:
            user_ids.add(msg["sender_id"])
        if msg["receiver_id"] != user_id:
            user_ids.add(msg["receiver_id"])

    # Fetch user names
    users = []
    for uid in user_ids:
        user = await db.users.find_one({"_id": ObjectId(uid)})
        if user:
            users.append({"_id": str(user["_id"]), "name": user["name"]})

    return users

@app.get("/messages/{other_user_id}")
async def get_messages_with_user(other_user_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])

    messages = await db.messages.find({
        "$or": [
            {"sender_id": user_id, "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": user_id}
        ]
    }).sort("created_at", 1).to_list(1000)

    for msg in messages:
        sender = await db.users.find_one({"_id": ObjectId(msg["sender_id"])})
        msg["_id"] = str(msg["_id"])
        msg["sender_name"] = sender["name"] if sender else "Unknown"

    return messages


@app.post("/messages")
async def send_message(
    message: models.MessageCreate,
    current_user: dict = Depends(get_current_user),
):
    msg = {
        "sender_id": str(current_user["_id"]),
        "receiver_id": message.receiver_id,
        "content": message.content,
        "created_at": datetime.utcnow(),
    }

    result = await db.messages.insert_one(msg)
    msg["_id"] = str(result.inserted_id)
    return msg

from typing import List


@app.get("/tasks", response_model=List[models.Task])
async def get_my_tasks(current_user=Depends(get_current_user)):
    username = current_user["username"]

    cursor = db["tasks"].find({
        "$or": [
            {"owner": username},
            {"mentioned_users": username}
        ]
    }).sort("created_at", -1)  # Sort by newest first

    tasks = []
    async for task_doc in cursor:
        tasks.append(schemas.get_task(task_doc))
    return tasks

# ------------------ CREATE TASK ------------------
@app.post("/tasks")
async def create_task(task: models.TaskCreate, current_user=Depends(get_current_user)):
    task_doc = {
        "title": task.title,
        "status": task.status,
        "messages": [],
        "owner": current_user['username'],
        "created_at": task.created_at
    }

    result = await db["tasks"].insert_one(task_doc)
    task_doc["_id"] = result.inserted_id

    return schemas.get_task(task_doc)



# ------------------ UPDATE TASK ------------------
import re
def extract_mentions(text: str):
    """Return list of usernames mentioned in text."""
    return re.findall(r"@(\w+)", text)

def extract_mentions_from_messages(messages):
    """Recursively extract mentions from all messages and replies"""
    mentioned = set()
    for msg in messages:
        mentioned.update(extract_mentions(msg.text))
        if msg.replies:
            mentioned.update(extract_mentions_from_messages(msg.replies))
    return mentioned

def message_to_dict(msg: models.TaskMessage):
    """Convert TaskMessage to dict recursively"""
    return {
        "id": msg.id,
        "text": msg.text,
        "sender": msg.sender,
        "timestamp": msg.timestamp,
        "parentId": msg.parentId,
        "replies": [message_to_dict(reply) for reply in msg.replies]
    }

@app.put("/tasks/{task_id}", response_model=models.Task)
async def update_task(task_id: str, task: models.TaskUpdate, current_user=Depends(get_current_user)):
    try:
        print(f"Updating task {task_id}")
        print(f"Current user: {current_user['username']}")
        print(f"Task data received: {task.model_dump()}")
        
        # Extract mentioned users from all messages (including nested replies)
        mentioned_users = extract_mentions_from_messages(task.messages)
        print(f"Mentioned users: {mentioned_users}")

        # Convert messages to dict format for MongoDB
        messages_dict = [message_to_dict(msg) for msg in task.messages]
        print(f"Converted messages: {len(messages_dict)} top-level messages")
        
        task_data = {
            "title": task.title,
            "status": task.status,
            "messages": messages_dict,
            "mentioned_users": list(mentioned_users)
        }

        # Update in MongoDB - check both owner and mentioned_users
        result = await db["tasks"].find_one_and_update(
            {
                "_id": ObjectId(task_id),
                "$or": [
                    {"owner": current_user['username']},
                    {"mentioned_users": current_user['username']}
                ]
            },
            {"$set": task_data},
            return_document=True
        )

        if not result:
            print(f"Task not found for task_id: {task_id}, user: {current_user['username']}")
            raise HTTPException(status_code=404, detail="Task not found or you don't have permission")

        print("Task updated successfully")
        return schemas.get_task(result)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating task: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/llms')
async def llm_request(data: models.LLMRequest):
    # getting user message
    last_message = data.messages[-1].message
    print(last_message)
    # TEMP response (replace with real LLM later)
    response = f"Answer: {ask_llm(last_message)}"

    return {
        "role": "assistant",
        "message": response
    }
    
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os


def ask_llm(prompt: str) -> str:
    load_dotenv()
    OPEN_ROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
    llm = ChatOpenAI(
        model="meta-llama/llama-3.3-70b-instruct:free",
    # model="openrouter/auto",
    api_key=OPEN_ROUTER_KEY,
    base_url="https://openrouter.ai/api/v1",
    )
    response = llm.invoke(prompt)
    return response.content