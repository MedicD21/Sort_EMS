"""
User model for authentication and authorization
"""
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    """User role enumeration"""
    ADMIN = "admin"
    USER = "user"


class User(BaseModel):
    """User model for authentication and authorization"""
    __tablename__ = "users"
    
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.USER)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    inventory_movements = relationship("InventoryMovement", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    controlled_substance_logs = relationship(
        "ControlledSubstanceLog",
        foreign_keys="ControlledSubstanceLog.user_id",
        back_populates="user"
    )
    witnessed_logs = relationship(
        "ControlledSubstanceLog",
        foreign_keys="ControlledSubstanceLog.witness_user_id",
        back_populates="witness_user"
    )
    
    def __repr__(self):
        return f"<User {self.username}>"
