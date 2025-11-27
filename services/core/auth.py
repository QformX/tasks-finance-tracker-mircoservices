from fastapi import Header, HTTPException
import jwt
import os
import uuid

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

async def get_current_user_id(authorization: str = Header(...)) -> uuid.UUID:
    """
    Dependency для извлечения user_id из JWT токена
    Используется во всех защищённых эндпоинтах Core Service
    """
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        return uuid.UUID(user_id)
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token format")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")

