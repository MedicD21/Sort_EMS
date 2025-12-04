"""
Initialize database and create default admin user
Run this before starting the application for the first time
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.core.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole

def init_db():
    """Initialize database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")

def create_admin_user():
    """Create default admin user if it doesn't exist"""
    db = SessionLocal()
    try:
        # Check if admin user exists
        existing_user = db.query(User).filter(User.username == "admin").first()
        if existing_user:
            print("✓ Admin user already exists")
            return
        
        # Create admin user
        admin = User(
            username="admin",
            email="admin@emssupply.local",
            first_name="Admin",
            last_name="User",
            password_hash=get_password_hash("Admin123!"),
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        print("✓ Admin user created")
        print("  Username: admin")
        print("  Password: Admin123!")
        print("  Email: admin@emssupply.local")
        
    except Exception as e:
        print(f"✗ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Initializing EMS Supply Tracking Database...")
    print("-" * 50)
    init_db()
    create_admin_user()
    print("-" * 50)
    print("✓ Database initialization complete!")
    print("\nYou can now start the backend server:")
    print("  uvicorn app.main:app --reload")
