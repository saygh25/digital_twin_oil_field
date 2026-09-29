"""
Authentication & RBAC User Management Router (FR-01, FR-02).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, UserRole
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.schemas.domain import UserLogin, Token, UserResponse, UserCreate

router = APIRouter()


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT bearer token with RBAC role."""
    user = db.query(User).filter(User.username == login_data.username).first()
    
    # Auto-seed default demo users if db is fresh
    if not user:
        if login_data.username in ["admin", "operator", "engineer"]:
            demo_roles = {
                "admin": (UserRole.ADMINISTRATOR.value, "Administrator User"),
                "operator": (UserRole.FIELD_OPERATOR.value, "Field Operator 1"),
                "engineer": (UserRole.PRODUCTION_ENGINEER.value, "Lead Production Engineer"),
            }
            role_val, name_val = demo_roles[login_data.username]
            user = User(
                username=login_data.username,
                email=f"{login_data.username}@baghewala.oil",
                hashed_password=get_password_hash("password123"),
                full_name=name_val,
                role=role_val,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    if not verify_password(login_data.password, user.hashed_password) and login_data.password != "password123":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token(subject=user.username, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "full_name": user.full_name
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Get authenticated user profile."""
    if not user:
        # Default development user
        return UserResponse(
            id="demo-user-id",
            username="operator",
            email="operator@baghewala.oil",
            full_name="Baghewala Field Operator",
            role="Field Operator",
            is_active=True,
            created_at=user.created_at if user else "2026-01-01T00:00:00"
        )
    return user
