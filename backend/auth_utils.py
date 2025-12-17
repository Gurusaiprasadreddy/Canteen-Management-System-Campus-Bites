import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, Cookie, Header
import os

JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
JWT_ALGORITHM = 'HS256'

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_jwt_token(user_id: str, role: str) -> str:
    """Create a JWT token for a user"""
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)) -> dict:
    """Get current user from JWT token (from cookie or Authorization header)"""
    token = None
    
    # Try to get token from cookie first
    if session_token:
        token = session_token
    # Fallback to Authorization header
    elif authorization and authorization.startswith('Bearer '):
        token = authorization.replace('Bearer ', '')
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return verify_jwt_token(token)

def generate_token_number() -> str:
    """Generate a 6-digit token number"""
    import random
    return f"{random.randint(100000, 999999)}"
