from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import DecodeError, ExpiredSignatureError, InvalidTokenError
import os
import uuid

security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> uuid.UUID:
    """
    Dependency для извлечения user_id из JWT токена
    Используется во всех защищённых эндпоинтах Core Service
    Валидация происходит только по подписи JWT (без запроса к БД пользователей)
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        return uuid.UUID(user_id)
    
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except (DecodeError, InvalidTokenError):
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID format")
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

