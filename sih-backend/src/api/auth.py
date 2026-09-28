"""
Authentication & Authorization Module (SIH26153)
Provides prototype token verification for REST API endpoints and WebSockets.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, status
from pydantic import BaseModel, Field
from typing import Optional

PROTOTYPE_TOKEN = "sentinel-proto-token-2026"
DEFAULT_EMAIL = "admin@sentinel.ai"
DEFAULT_PASS = "sentinel123"

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    """Simple prototype authentication endpoint."""
    if credentials.email.strip().lower() == DEFAULT_EMAIL and credentials.password == DEFAULT_PASS:
        return LoginResponse(
            access_token=PROTOTYPE_TOKEN,
            token_type="bearer",
            user={
                "email": DEFAULT_EMAIL,
                "name": "SOC Lead Analyst",
                "role": "Administrator"
            }
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password."
    )

def verify_token(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None)
):
    """
    Verify bearer token or API key header for REST requests.
    """
    provided_token = None
    if authorization:
        scheme, separator, credential = authorization.partition(" ")
        if scheme.lower() == "bearer" and separator and credential.strip():
            provided_token = credential.strip()
    elif x_api_key:
        provided_token = x_api_key.strip() or None

    if provided_token == PROTOTYPE_TOKEN:
        return True
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Invalid or missing SENTINEL authentication token."
    )

def verify_websocket_token(token: Optional[str]) -> bool:
    """Verify the query token used during WebSocket handshakes."""
    if token == PROTOTYPE_TOKEN:
        return True
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Invalid or missing SENTINEL authentication token."
    )
