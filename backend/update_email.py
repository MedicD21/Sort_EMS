"""
Update admin email to valid domain
"""
from app.core.database import SessionLocal
from app.models.user import User

db = SessionLocal()
user = db.query(User).filter(User.username == "admin").first()

if user:
    print(f"Current email: {user.email}")
    user.email = "admin@example.com"
    db.commit()
    print(f"✓ Updated email to: {user.email}")
else:
    print("❌ Admin user not found")

db.close()
