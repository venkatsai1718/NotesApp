def get_user(user) -> dict:
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "name": user.get("name", ""),
        "email": user["email"]
    }

def parse_message(msg_dict):
    """Recursively parse message with nested replies"""
    return {
        "id": msg_dict.get("id"),
        "text": msg_dict.get("text"),
        "sender": msg_dict.get("sender"),
        "timestamp": msg_dict.get("timestamp"),
        "parentId": msg_dict.get("parentId"),
        "replies": [parse_message(reply) for reply in msg_dict.get("replies", [])]
    }

def get_task(task) -> dict:
    # Parse messages with nested structure
    messages = [parse_message(msg) for msg in task.get("messages", [])]
    
    return {
        "id": str(task["_id"]),
        "title": task["title"],
        "status": task["status"],
        "messages": messages,
        "created_at": task["created_at"],
        "mentioned_users": task.get("mentioned_users", [])
    }

    
def get_project(project):
    return {
        "id": str(project["_id"]),
        "title": project["title"],
        "description": project["description"],
        "createdBy": project['createdBy'],
        "createdAt": project["createdAt"],
        "members": project["members"],
        "notes": [
            {
                "title": note["title"],
                "body": note["body"],
                "createdAt": note["createdAt"],
            }
            for note in project.get("notes", [])
        ],
    }