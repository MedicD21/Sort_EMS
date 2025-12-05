"""
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base

# Import all models to register them with SQLAlchemy
from app.models import *

# Import API routers
from app.api.v1 import auth, items, locations, inventory, rfid, orders, reports, users, config, inventory_items, categories, employees, assets, forms

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "EMS Supply Tracking System API",
        "version": settings.VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(items.router, prefix="/api/v1/items", tags=["Items"])
app.include_router(inventory_items.router, prefix="/api/v1/inventory-items", tags=["Individual Items"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(rfid.router, prefix="/api/v1/rfid", tags=["RFID/Scanning"])
app.include_router(orders.router, prefix="/api/v1/orders", tags=["Purchase Orders"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(config.router, prefix="/api/v1/config", tags=["System Configuration"])
app.include_router(employees.router, prefix="/api/v1/employees", tags=["Employees"])
app.include_router(assets.router, prefix="/api/v1/assets", tags=["Assets"])
app.include_router(forms.router, prefix="/api/v1/forms", tags=["Forms"])
# from app.api import auth, users, items, locations, rfid, orders, reports
# app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
# app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["users"])
# etc...
