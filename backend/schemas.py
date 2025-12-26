def get_user(user):
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user["email"],
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
