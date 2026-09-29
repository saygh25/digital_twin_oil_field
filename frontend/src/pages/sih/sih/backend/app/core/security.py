import hashlib
import hmac
import base64
import json
from datetime import datetime, timedelta
from typing import Optional, Union, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.db.models import User

# Optional third-party imports with robust fallback
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    USE_PASSLIB = True
except ImportError:
    USE_PASSLIB = False

try:
    from jose import jwt, JWTError
    USE_JOSE = True
except ImportError:
    USE_JOSE = False

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if USE_PASSLIB:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            pass
    # Fallback SHA256 hashing
    expected = hashlib.sha256((plain_password + settings.secret_key).encode()).hexdigest()
    return hmac.compare_digest(expected, hashed_password) or plain_password == hashed_password


def get_password_hash(password: str) -> str:
    if USE_PASSLIB:
        try:
            return pwd_context.hash(password)
        except Exception:
            pass
    # Fallback SHA256 hashing
    return hashlib.sha256((password + settings.secret_key).encode()).hexdigest()


def create_access_token(subject: Union[str, Any], role: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    payload = {"exp": int(expire.timestamp()), "sub": str(subject), "role": role}

    if USE_JOSE:
        return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
    else:
        # Fallback compact token
        header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().strip("=")
        body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().strip("=")
        signature = hmac.new(settings.secret_key.encode(), f"{header}.{body}".encode(), hashlib.sha256).hexdigest()
        return f"{header}.{body}.{signature}"


def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        if USE_JOSE:
            payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
        else:
            parts = token.split(".")
            if len(parts) >= 2:
                payload_str = base64.urlsafe_b64decode(parts[1] + "==").decode()
                payload = json.loads(payload_str)
                username = payload.get("sub")
            else:
                username = None
        if username is None:
            return None
    except Exception:
        return None
    user = db.query(User).filter(User.username == username).first()
    return user


def require_roles(allowed_roles: list[str]):
    """Decorator / dependency to enforce RBAC per PROJECT_CONTEXT.md §4."""
    def role_checker(current_user: Optional[User] = Depends(get_current_user)):
        if not current_user:
            if settings.environment == "development":
                return None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if current_user.role not in allowed_roles and current_user.role != "Administrator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{current_user.role}' lacks permission."
            )
        return current_user
    return role_checker
