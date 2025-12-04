"""
Compliance and Audit models for HIPAA, CAAS, and pharmacy board compliance
"""
from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from datetime import datetime
from app.models.base import BaseModel


class AuditAction(str, enum.Enum):
    """Audit log action enumeration"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    SCAN = "scan"
    LOGIN = "login"
    LOGOUT = "logout"


class AuditLog(BaseModel):
    """Audit Log model for comprehensive activity tracking"""
    __tablename__ = "audit_logs"
    
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    action = Column(SQLEnum(AuditAction), nullable=False)
    changes = Column(JSON, nullable=True)  # Before/after values
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<AuditLog {self.action} on {self.entity_type} @ {self.timestamp}>"


class SubstanceAction(str, enum.Enum):
    """Controlled substance action enumeration"""
    RECEIVE = "receive"
    DISPENSE = "dispense"
    WASTE = "waste"
    COUNT = "count"
    TRANSFER = "transfer"


class ControlledSubstanceLog(BaseModel):
    """Controlled Substance Log for pharmacy board compliance"""
    __tablename__ = "controlled_substance_logs"
    
    rfid_tag_id = Column(
        UUID(as_uuid=True),
        ForeignKey("rfid_tags.id", ondelete="RESTRICT"),
        nullable=False
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    action = Column(SQLEnum(SubstanceAction), nullable=False)
    quantity = Column(Integer, nullable=False)
    patient_encounter_id = Column(String(255), nullable=True)  # For ImageTrend integration
    witness_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    notes = Column(String(1000), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    rfid_tag = relationship("RFIDTag", back_populates="controlled_substance_logs")
    user = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="controlled_substance_logs"
    )
    witness_user = relationship(
        "User",
        foreign_keys=[witness_user_id],
        back_populates="witnessed_logs"
    )
    
    def __repr__(self):
        return f"<ControlledSubstanceLog {self.action} @ {self.timestamp}>"
