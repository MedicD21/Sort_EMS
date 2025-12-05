"""
Categories API Routes
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.item import Category
from app.schemas.category import CategoryResponse, CategoryCreate, CategoryUpdate

router = APIRouter()


@router.get("/", response_model=List[CategoryResponse])
async def list_categories(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get list of all categories"""
    query = db.query(Category)
    
    if active_only:
        query = query.filter(Category.is_active == True)
    
    categories = query.order_by(Category.sort_order, Category.name).offset(skip).limit(limit).all()
    return categories


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific category by ID"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db)
):
    """Create a new category"""
    # Check if ID already exists
    existing = db.query(Category).filter(Category.id == category.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category with ID '{category.id}' already exists")
    
    # Check if name already exists
    existing_name = db.query(Category).filter(Category.name == category.name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail=f"Category with name '{category.name}' already exists")
    
    db_category = Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category: CategoryUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing category"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check name uniqueness if being updated
    if category.name and category.name != db_category.name:
        existing_name = db.query(Category).filter(Category.name == category.name).first()
        if existing_name:
            raise HTTPException(status_code=400, detail=f"Category with name '{category.name}' already exists")
    
    update_data = category.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    db: Session = Depends(get_db)
):
    """Delete a category"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if category is in use
    from app.models.item import Item
    items_count = db.query(Item).filter(Item.category_id == category_id).count()
    if items_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete category. {items_count} items are using this category."
        )
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted successfully"}
