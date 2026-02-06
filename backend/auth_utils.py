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
    # Using 10 rounds for faster performance while maintaining security
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_jwt_token(user_id: str, role: str, canteen_id: Optional[str] = None) -> str:
    """Create a JWT token for a user"""
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    if canteen_id:
        payload['canteen_id'] = canteen_id
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
    
    token = None
    
    # 1. Prioritize Authorization header (Explicit API usage)
    if authorization and authorization.startswith('Bearer '):
        token = authorization.replace('Bearer ', '')
        try:
            return verify_jwt_token(token)
        except HTTPException:
            # If header token invalid, perform fallthrough or raise immediately? 
            # Usually if header is provided but invalid, we should fail. 
            # But adhering to original logic "try one then other", let's fail here if header is bad?
            # Actually, standard behavior: if Header provided, use it. 
            # Re-raising exception from verify_jwt_token
            raise

    # 2. Fallback to validate token from cookie
    if session_token:
        try:
            return verify_jwt_token(session_token)
        except HTTPException:
            # If cookie token is invalid (expired/bad signature), ignore it
            pass
    
    raise HTTPException(status_code=401, detail="Not authenticated")

def generate_token_number() -> int:
    """Generate a 7-digit token number"""
    import random
    return random.randint(1000000, 9999999)
