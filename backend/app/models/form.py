"""
Form Models
"""
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class FormTemplate(Base):
    __tablename__ = "form_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # e.g., "Medication", "Inspection", "Incident Report"
    fields = Column(JSON, nullable=False)  # Array of field definitions
    is_active = Column(Boolean, default=True, nullable=False)
    requires_signature = Column(Boolean, default=False, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    submissions = relationship("FormSubmission", back_populates="template")

    def __repr__(self):
        return f"<FormTemplate {self.name}>"


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = Column(String, ForeignKey("form_templates.id"), nullable=False)
    submitted_by = Column(String, ForeignKey("users.id"), nullable=True)
    submitted_by_name = Column(String(255), nullable=True)  # Store name in case user is deleted
    data = Column(JSON, nullable=False)  # Form field values
    signature = Column(Text, nullable=True)  # Base64 encoded signature image
    signature_name = Column(String(255), nullable=True)  # Name of person who signed
    signature_date = Column(DateTime, nullable=True)
    location_id = Column(String, ForeignKey("locations.id"), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="Submitted", nullable=False)  # Submitted, Reviewed, Approved, Rejected
    reviewed_by = Column(String, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    template = relationship("FormTemplate", back_populates="submissions")

    def __repr__(self):
        return f"<FormSubmission {self.id} for Template {self.template_id}>"
