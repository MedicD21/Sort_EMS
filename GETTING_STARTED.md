# EMS Supply Tracking System - Getting Started Guide

## Welcome! 🚀

This guide will help you get your EMS Supply Tracking System up and running.

## What We've Built So Far

✅ **Backend Architecture**

- FastAPI server with PostgreSQL database
- Complete database schema for multi-level inventory tracking
- User authentication with JWT
- RFID/QR tag tracking models
- Purchase order management
- Compliance features (audit logs, controlled substances)

✅ **Database Models**

- Users & Roles (Admin/User)
- Locations (Supply Station → Cabinets → Vehicles)
- Items & Categories
- RFID Tags
- Inventory tracking
- Par levels
- Purchase orders
- Audit logs
- Notifications

## Quick Start (5 Minutes)

### Step 1: Start Database with Docker

```powershell
# Navigate to project folder
cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS

# Start PostgreSQL and Redis
docker-compose up -d
```

This starts:

- PostgreSQL on port 5432
- Redis on port 6379
- pgAdmin on port 5050 (http://localhost:5050)

### Step 2: Install Python Dependencies

```powershell
cd backend
pip install -r requirements.txt
```

### Step 3: Initialize Database & Import Your Data

```powershell
# Run the data migration script
python migrate_data.py
```

This will:

- Create all database tables
- Create default admin user (username: `admin`, password: `ChangeMe123!`)
- Create location hierarchy (Supply Station → Station 1 → Medic 4)
- Create item categories
- Import your 179 items from the Excel file
- Set up par levels for Medic 4

### Step 4: Start the API Server

```powershell
uvicorn app.main:app --reload
```

### Step 5: Access the API

Open your browser to:

- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### Step 6: Test the API

1. Go to http://localhost:8000/docs
2. You'll see all API endpoints (when we add them)
3. Use the "Authorize" button to login
4. Start exploring!

## What's Next? (Your Input Needed)

Now that the foundation is built, we need to decide what to build next. Here are the options:

### Option A: Complete Backend APIs First

Build all the REST API endpoints:

- ✅ Authentication (login, logout, token refresh)
- ✅ User management (CRUD operations)
- ✅ Item management (add, edit, delete items)
- ✅ Inventory operations (scanning, movements, counts)
- ✅ RFID/QR scanning endpoints
- ✅ Purchase order management
- ✅ Reports and analytics

**Pros**: Complete backend functionality, can test with tools like Postman
**Cons**: No visual interface yet

### Option B: Start Frontend Development

Build the React web application:

- Login page
- Dashboard
- Inventory views
- Scanner interface
- Reports

**Pros**: Visual interface to interact with
**Cons**: Backend APIs need to be built alongside

### Option C: Build Both in Parallel (Recommended)

Start with the most critical user workflows:

1. **Authentication** (Backend + Frontend)
2. **Inventory Dashboard** (Backend + Frontend)
3. **RFID Scanning** (Backend + Frontend)
4. **Par Level Alerts** (Backend + Frontend)
5. And so on...

**Pros**: See results immediately, test end-to-end
**Cons**: Takes longer to have "complete" features

## Current Status

### ✅ Completed

- Project architecture design
- Database schema design
- All database models
- Configuration management
- Security utilities
- Docker setup
- Data migration from Excel

### 🚧 Next Up (Pending Your Decision)

- API endpoints
- Authentication system
- Frontend application
- RFID integration
- Automated ordering logic

## Important Files

- **`ARCHITECTURE.md`** - Complete technical documentation
- **`README.md`** - Project overview
- **`backend/.env`** - Configuration (contains passwords!)
- **`backend/migrate_data.py`** - Data import script
- **`docker-compose.yml`** - Infrastructure setup

## Database Access

### Using pgAdmin (GUI)

1. Open http://localhost:5050
2. Login: `admin@emscompany.com` / `admin`
3. Add server:
   - Host: `postgres` (or `localhost` if not using Docker)
   - Port: `5432`
   - Database: `ems_supply_db`
   - Username: `ems_user`
   - Password: `ems_password_change_in_production`

### Using Command Line

```powershell
# Connect to PostgreSQL
docker exec -it ems_postgres psql -U ems_user -d ems_supply_db

# View tables
\dt

# View data
SELECT * FROM items LIMIT 10;
SELECT * FROM locations;
```

## Common Commands

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart postgres

# Start backend server
cd backend
uvicorn app.main:app --reload

# Run data migration
python migrate_data.py

# Create database migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Security Notes ⚠️

**IMPORTANT**: Before deploying to production:

1. Change the `SECRET_KEY` in `.env` to a long random string
2. Change all default passwords
3. Use environment variables for sensitive data
4. Enable HTTPS/TLS
5. Set `DEBUG=False`
6. Configure firewall rules
7. Set up regular backups

## Troubleshooting

### Database Connection Error

- Make sure Docker is running
- Check if PostgreSQL container is up: `docker ps`
- Verify connection string in `.env`

### Module Not Found Error

- Activate virtual environment: `.\.venv\Scripts\activate`
- Install dependencies: `pip install -r requirements.txt`

### Port Already in Use

- Change ports in `docker-compose.yml`
- Or stop other services using those ports

## Need Help?

1. Check the documentation in `ARCHITECTURE.md`
2. Review API docs at http://localhost:8000/docs
3. Check database with pgAdmin
4. Review logs: `docker-compose logs`

## Your Data

Your original Excel file data has been preserved and imported:

- **179 items** from Medic 4 supply closet
- Item codes (A01, A02, etc.)
- Par levels
- Reorder points
- Units of measure

All ready to track with RFID/QR codes!

---

## 👉 What Would You Like to Build Next?

Please let me know:

1. Should we focus on backend APIs first?
2. Start building the frontend interface?
3. Build both together (specific workflow)?
4. Add specific features you need urgently?

I'm ready to continue development in whichever direction serves you best! 🚀
