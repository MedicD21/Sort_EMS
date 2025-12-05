"""
Employee API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ...core.database import get_db
from ...models.employee import Employee
from ...schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse

router = APIRouter()


@router.post("/", response_model=EmployeeResponse, status_code=201)
async def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    """Create a new employee"""
    # Check if employee_id already exists
    existing = db.query(Employee).filter(Employee.employee_id == employee.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    # Check if email already exists (if provided)
    if employee.email:
        existing_email = db.query(Employee).filter(Employee.email == employee.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    db_employee = Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


@router.get("/", response_model=List[EmployeeResponse])
async def list_employees(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all employees with optional filters"""
    query = db.query(Employee)
    
    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)
    
    if department:
        query = query.filter(Employee.department == department)
    
    if search:
        query = query.filter(
            (Employee.first_name.ilike(f"%{search}%")) |
            (Employee.last_name.ilike(f"%{search}%")) |
            (Employee.employee_id.ilike(f"%{search}%")) |
            (Employee.email.ilike(f"%{search}%"))
        )
    
    query = query.order_by(Employee.last_name, Employee.first_name)
    employees = query.offset(skip).limit(limit).all()
    return employees


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str, db: Session = Depends(get_db)):
    """Get a specific employee by ID"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    employee_update: EmployeeUpdate,
    db: Session = Depends(get_db)
):
    """Update an employee"""
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = employee_update.model_dump(exclude_unset=True)
    
    # Check for duplicate employee_id if being updated
    if "employee_id" in update_data:
        existing = db.query(Employee).filter(
            Employee.employee_id == update_data["employee_id"],
            Employee.id != employee_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    # Check for duplicate email if being updated
    if "email" in update_data and update_data["email"]:
        existing = db.query(Employee).filter(
            Employee.email == update_data["email"],
            Employee.id != employee_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    for field, value in update_data.items():
        setattr(db_employee, field, value)
    
    db_employee.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_employee)
    return db_employee


@router.delete("/{employee_id}")
async def delete_employee(employee_id: str, db: Session = Depends(get_db)):
    """Delete an employee (soft delete by setting is_active=False)"""
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Soft delete
    db_employee.is_active = False
    db_employee.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Employee deactivated successfully"}


@router.delete("/{employee_id}/hard")
async def hard_delete_employee(employee_id: str, db: Session = Depends(get_db)):
    """Permanently delete an employee"""
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    db.delete(db_employee)
    db.commit()
    
    return {"message": "Employee permanently deleted"}
