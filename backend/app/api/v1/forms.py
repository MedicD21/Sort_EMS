"""
Form API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from ...core.database import get_db
from ...models.form import FormTemplate, FormSubmission
from ...schemas.form import (
    FormTemplateCreate,
    FormTemplateUpdate,
    FormTemplateResponse,
    FormSubmissionCreate,
    FormSubmissionUpdate,
    FormSubmissionResponse,
)
from app.api.v1.auth import get_current_user
from ...models.user import User

router = APIRouter()


# ============================================================================
# FORM TEMPLATES
# ============================================================================

@router.post("/templates", response_model=FormTemplateResponse, status_code=201)
async def create_form_template(
    template: FormTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new form template"""
    try:
        # Convert fields to dict for JSON storage
        fields_data = [field.model_dump() for field in template.fields]
        
        print(f"Creating template with {len(fields_data)} fields")
        print(f"Fields: {fields_data}")
        
        db_template = FormTemplate(
            name=template.name,
            description=template.description,
            category=template.category,
            fields=fields_data,
            is_active=template.is_active,
            requires_signature=template.requires_signature,
            created_by=str(current_user.id)
        )
        
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        
        print(f"Template created successfully: {db_template.id}")
        return db_template
    except Exception as e:
        db.rollback()
        print(f"Error creating template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.get("/templates", response_model=List[FormTemplateResponse])
async def list_form_templates(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all form templates"""
    query = db.query(FormTemplate)
    
    if category:
        query = query.filter(FormTemplate.category == category)
    
    if is_active is not None:
        query = query.filter(FormTemplate.is_active == is_active)
    
    if search:
        query = query.filter(
            (FormTemplate.name.ilike(f"%{search}%")) |
            (FormTemplate.description.ilike(f"%{search}%"))
        )
    
    query = query.order_by(FormTemplate.created_at.desc())
    templates = query.offset(skip).limit(limit).all()
    return templates


@router.get("/templates/{template_id}", response_model=FormTemplateResponse)
async def get_form_template(template_id: str, db: Session = Depends(get_db)):
    """Get a specific form template"""
    template = db.query(FormTemplate).filter(FormTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Form template not found")
    return template


@router.put("/templates/{template_id}", response_model=FormTemplateResponse)
async def update_form_template(
    template_id: str,
    template_update: FormTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a form template"""
    db_template = db.query(FormTemplate).filter(FormTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Form template not found")
    
    update_data = template_update.model_dump(exclude_unset=True)
    
    # Convert fields to dict if present
    if "fields" in update_data and update_data["fields"]:
        update_data["fields"] = [field.model_dump() for field in update_data["fields"]]
    
    for field, value in update_data.items():
        setattr(db_template, field, value)
    
    db_template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_template)
    return db_template


@router.delete("/templates/{template_id}")
async def delete_form_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a form template (soft delete)"""
    db_template = db.query(FormTemplate).filter(FormTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Form template not found")
    
    db_template.is_active = False
    db_template.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Form template deactivated successfully"}


# ============================================================================
# FORM SUBMISSIONS
# ============================================================================

@router.post("/submissions", response_model=FormSubmissionResponse, status_code=201)
async def create_form_submission(
    submission: FormSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new form submission"""
    # Verify template exists
    template = db.query(FormTemplate).filter(FormTemplate.id == submission.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Form template not found")
    
    # Prepare submission data
    db_submission = FormSubmission(
        template_id=submission.template_id,
        submitted_by=str(current_user.id),
        submitted_by_name=f"{current_user.first_name} {current_user.last_name}",
        data=submission.data,
        signature=submission.signature,
        signature_name=submission.signature_name,
        signature_date=datetime.utcnow() if submission.signature else None,
        location_id=submission.location_id,
        notes=submission.notes,
    )
    
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    
    # Add template name to response
    result = FormSubmissionResponse.model_validate(db_submission)
    result.template_name = template.name
    
    return result


@router.get("/submissions", response_model=List[FormSubmissionResponse])
async def list_form_submissions(
    skip: int = 0,
    limit: int = 100,
    template_id: Optional[str] = None,
    status: Optional[str] = None,
    submitted_by: Optional[str] = None,
    location_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """List all form submissions"""
    query = db.query(FormSubmission).options(joinedload(FormSubmission.template))
    
    if template_id:
        query = query.filter(FormSubmission.template_id == template_id)
    
    if status:
        query = query.filter(FormSubmission.status == status)
    
    if submitted_by:
        query = query.filter(FormSubmission.submitted_by == submitted_by)
    
    if location_id:
        query = query.filter(FormSubmission.location_id == location_id)
    
    if start_date:
        query = query.filter(FormSubmission.created_at >= start_date)
    
    if end_date:
        query = query.filter(FormSubmission.created_at <= end_date)
    
    query = query.order_by(FormSubmission.created_at.desc())
    submissions = query.offset(skip).limit(limit).all()
    
    # Add template names to response
    results = []
    for submission in submissions:
        result = FormSubmissionResponse.model_validate(submission)
        if submission.template:
            result.template_name = submission.template.name
        results.append(result)
    
    return results


@router.get("/submissions/{submission_id}", response_model=FormSubmissionResponse)
async def get_form_submission(submission_id: str, db: Session = Depends(get_db)):
    """Get a specific form submission"""
    submission = db.query(FormSubmission).options(
        joinedload(FormSubmission.template)
    ).filter(FormSubmission.id == submission_id).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Form submission not found")
    
    result = FormSubmissionResponse.model_validate(submission)
    if submission.template:
        result.template_name = submission.template.name
    
    return result


@router.put("/submissions/{submission_id}", response_model=FormSubmissionResponse)
async def update_form_submission(
    submission_id: str,
    submission_update: FormSubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a form submission"""
    db_submission = db.query(FormSubmission).options(
        joinedload(FormSubmission.template)
    ).filter(FormSubmission.id == submission_id).first()
    
    if not db_submission:
        raise HTTPException(status_code=404, detail="Form submission not found")
    
    update_data = submission_update.model_dump(exclude_unset=True)
    
    # Update signature date if signature is being added
    if "signature" in update_data and update_data["signature"] and not db_submission.signature:
        update_data["signature_date"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(db_submission, field, value)
    
    db_submission.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_submission)
    
    result = FormSubmissionResponse.model_validate(db_submission)
    if db_submission.template:
        result.template_name = db_submission.template.name
    
    return result


@router.post("/submissions/{submission_id}/review")
async def review_form_submission(
    submission_id: str,
    status: str,  # Approved, Rejected
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Review and approve/reject a form submission"""
    db_submission = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not db_submission:
        raise HTTPException(status_code=404, detail="Form submission not found")
    
    if status not in ["Approved", "Rejected", "Reviewed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    db_submission.status = status
    db_submission.reviewed_by = str(current_user.id)
    db_submission.reviewed_at = datetime.utcnow()
    db_submission.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"Form submission {status.lower()} successfully"}


@router.delete("/submissions/{submission_id}")
async def delete_form_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a form submission"""
    db_submission = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not db_submission:
        raise HTTPException(status_code=404, detail="Form submission not found")
    
    db.delete(db_submission)
    db.commit()
    
    return {"message": "Form submission deleted successfully"}
