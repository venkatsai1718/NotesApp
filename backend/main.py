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

    existing_user = await db["users"].find_one({"email": user.email})
    if existing_user:
        return {"error": "User already exists"}

    hashed_password = Hash.bcrypt(user.password)
    await db["users"].insert_one({
        "name": user.name,
        "email": user.email,
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
    user_id = str(current_user["_id"])  # ✅ FORCE STRING

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




# @app.get("/messages/{member_id}")
# async def get_messages(
#     member_id: str,
#     current_user: dict = Depends(get_current_user),
# ):
#     user_id = str(current_user["_id"])

#     messages = await db.messages.find({
#         "$or": [
#             {"sender_id": user_id, "receiver_id": member_id},
#             {"sender_id": member_id, "receiver_id": user_id},
#         ]
#     }).sort("created_at", 1).to_list(1000)

#     for msg in messages:
#         msg["_id"] = str(msg["_id"])

#     return messages

