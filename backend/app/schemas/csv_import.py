"""
CSV Import Schemas
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class CSVImportConflict(BaseModel):
    """Represents a conflict found during import preview"""
    item_code: str
    existing_item_name: str
    new_item_name: str
    existing_item_id: str
    row_number: int


class CSVImportPreviewResponse(BaseModel):
    """Response from import preview showing what will be imported"""
    total_rows: int
    new_items: int
    conflicts: List[CSVImportConflict]
    errors: List[Dict[str, Any]]  # Validation errors


class CSVImportRequest(BaseModel):
    """Request to execute import with conflict resolution"""
    conflict_resolution: str  # "skip" or "replace"
    item_codes_to_replace: Optional[List[str]] = None  # Specific items to replace


class CSVImportResult(BaseModel):
    """Result of CSV import operation"""
    total_rows: int
    created: int
    updated: int
    skipped: int
    errors: List[Dict[str, Any]]
