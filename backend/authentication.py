from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer

import database
from hashing import Hash
import jwt_token
import database


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


async def login_user(
    request: OAuth2PasswordRequestForm = Depends()
):
    db = database.get_db()
    user = await db["users"].find_one({"email": request.username})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User Not Found",
        )

    if not Hash.verify(request.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = jwt_token.create_access_token(
        data={"sub": user["email"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    return await jwt_token.verify_token(token, credentials_exception)
