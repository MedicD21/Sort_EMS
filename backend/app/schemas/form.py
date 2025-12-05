"""
Form Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime


class FormFieldDefinition(BaseModel):
    """Definition of a form field"""
    id: str
    type: str  # text, number, checkbox, textarea, select, date, datetime, signature, drug_security_tag
    label: str
    required: bool = False
    placeholder: Optional[str] = None
    default_value: Optional[Any] = None
    options: Optional[List[str]] = None  # For select fields
    validation: Optional[Dict[str, Any]] = None  # e.g., {"min": 0, "max": 100}
    help_text: Optional[str] = None


class FormTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    fields: List[FormFieldDefinition]
    is_active: bool = True
    requires_signature: bool = False


class FormTemplateCreate(FormTemplateBase):
    pass


class FormTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    fields: Optional[List[FormFieldDefinition]] = None
    is_active: Optional[bool] = None
    requires_signature: Optional[bool] = None


class FormTemplateResponse(FormTemplateBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FormSubmissionBase(BaseModel):
    template_id: str
    data: Dict[str, Any]  # Field ID -> value mapping
    signature: Optional[str] = None  # Base64 encoded image
    signature_name: Optional[str] = None
    location_id: Optional[str] = None
    notes: Optional[str] = None


class FormSubmissionCreate(FormSubmissionBase):
    pass


class FormSubmissionUpdate(BaseModel):
    data: Optional[Dict[str, Any]] = None
    signature: Optional[str] = None
    signature_name: Optional[str] = None
    location_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class FormSubmissionResponse(FormSubmissionBase):
    id: str
    submitted_by: Optional[str] = None
    submitted_by_name: Optional[str] = None
    signature_date: Optional[datetime] = None
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    template_name: Optional[str] = None  # Computed field

    class Config:
        from_attributes = True
