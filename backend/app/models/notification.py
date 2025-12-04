"""
Notification model for alerts and system notifications
"""
from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from datetime import datetime
from app.models.base import BaseModel


class NotificationType(str, enum.Enum):
    """Notification type enumeration"""
    LOW_STOCK = "low_stock"
    EXPIRATION_WARNING = "expiration_warning"
    EXPIRATION_CRITICAL = "expiration_critical"
    ORDER_RECEIVED = "order_received"
    ORDER_PLACED = "order_placed"
    PAR_LEVEL_BREACH = "par_level_breach"
    SYSTEM_ALERT = "system_alert"


class NotificationSeverity(str, enum.Enum):
    """Notification severity enumeration"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Notification(BaseModel):
    """Notification model for system alerts"""
    __tablename__ = "notifications"
    
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True  # Null for system-wide notifications
    )
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    severity = Column(SQLEnum(NotificationSeverity), nullable=False, default=NotificationSeverity.INFO)
    is_read = Column(Boolean, default=False, nullable=False)
    related_entity_type = Column(String(100), nullable=True)
    related_entity_id = Column(UUID(as_uuid=True), nullable=True)
    read_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Notification {self.type} - {self.severity}>"
