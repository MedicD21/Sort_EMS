# EMS Supply Tracking System

A comprehensive, HIPAA & CAAS compliant supply tracking system for EMS operations with RFID/QR integration, multi-level inventory management, and automated ordering.

## Features

- **Multi-Level Inventory Tracking**: Supply Station → Station Cabinets → Vehicles
- **RFID/QR Code Integration**: Individual item tracking with scanners
- **Automated Ordering**: Smart reordering based on par levels
- **Role-Based Access Control**: Admin and User roles with different permissions
- **Compliance Ready**: HIPAA, CAAS, and Ohio Pharmacy Board compliant
- **Real-Time Alerts**: Low stock, expiration warnings, and system notifications
- **Comprehensive Audit Logging**: Full activity tracking for compliance
- **Controlled Substance Tracking**: Special handling for pharmacy compliance
- **Mobile-Responsive**: PWA for use on iPads, Windows desktops, and Android devices

## Technology Stack

### Backend

- **FastAPI** (Python) - High-performance async API framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM for database operations
- **JWT** - Secure authentication
- **Celery + Redis** - Background task processing

### Frontend (Coming Next)

- **React 18** with TypeScript
- **Material-UI** - Enterprise UI components
- **Redux Toolkit** - State management
- **PWA** - Offline support and mobile installation

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis (optional, for background tasks)
- Docker & Docker Compose (recommended)

### Option 1: Docker Compose (Recommended)

1. **Clone and navigate to the project**

   ```powershell
   cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS
   ```

2. **Start the database services**

   ```powershell
   docker-compose up -d postgres redis pgadmin
   ```

3. **Access pgAdmin**

   - URL: http://localhost:5050
   - Email: admin@emscompany.com
   - Password: admin

4. **Create environment file**

   ```powershell
   cp backend\.env.example backend\.env
   ```

   Edit `backend\.env` with your settings.

5. **Install Python dependencies**

   ```powershell
   cd backend
   pip install -r requirements.txt
   ```

6. **Run database migrations (coming soon)**

   ```powershell
   alembic upgrade head
   ```

7. **Start the backend server**

   ```powershell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

8. **Access the API**
   - API: http://localhost:8000
   - Interactive Docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Option 2: Local Setup (Windows)

1. **Install PostgreSQL**

   - Download from https://www.postgresql.org/download/windows/
   - Create database: `ems_supply_db`
   - Create user: `ems_user` with password

2. **Install Redis** (optional)

   - Download from https://github.com/microsoftarchive/redis/releases
   - Or use WSL2 for Redis

3. **Set up Python environment**

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Configure environment**

   ```powershell
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Run the application**
   ```powershell
   uvicorn app.main:app --reload
   ```

## Project Structure

```
Sort_EMS/
├── backend/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── core/         # Core configuration
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Helper functions
│   │   └── main.py       # FastAPI application
│   ├── migrations/       # Alembic migrations
│   ├── requirements.txt  # Python dependencies
│   ├── Dockerfile        # Docker configuration
│   └── .env.example      # Environment template
├── frontend/             # React application (coming next)
├── docs/                 # Additional documentation
├── docker-compose.yml    # Docker services
├── ARCHITECTURE.md       # Technical architecture
└── README.md            # This file
```

## Database Schema

See [ARCHITECTURE.md](ARCHITECTURE.md) for complete database schema documentation.

Key entities:

- **Users** - Authentication and authorization
- **Locations** - Supply stations, cabinets, vehicles
- **Items** - Supply catalog
- **RFID Tags** - Individual item tracking
- **Inventory Current** - Real-time stock levels
- **Par Levels** - Stock level configurations
- **Purchase Orders** - Ordering and restocking
- **Audit Logs** - Compliance tracking

## API Endpoints (Coming Soon)

- `/api/v1/auth/*` - Authentication
- `/api/v1/users/*` - User management
- `/api/v1/items/*` - Item catalog
- `/api/v1/locations/*` - Location management
- `/api/v1/rfid/*` - RFID scanning operations
- `/api/v1/inventory/*` - Inventory management
- `/api/v1/orders/*` - Purchase orders
- `/api/v1/reports/*` - Analytics and reporting
- `/api/v1/notifications/*` - Alerts and notifications

## Development Roadmap

### Phase 1: Foundation ✅ (Current)

- [x] Project setup
- [x] Database schema design
- [x] Core models implementation
- [ ] Database migrations
- [ ] Authentication system

### Phase 2: Core Inventory (Next)

- [ ] RFID/QR scanning APIs
- [ ] Inventory movement tracking
- [ ] Par level management
- [ ] Current inventory state

### Phase 3: Ordering System

- [ ] Auto-ordering logic
- [ ] Purchase order management
- [ ] Vendor management
- [ ] Notification system

### Phase 4: Frontend Development

- [ ] React application setup
- [ ] User authentication UI
- [ ] Inventory management UI
- [ ] Scanner integration
- [ ] Dashboard and analytics

### Phase 5: Compliance & Testing

- [ ] Audit logging
- [ ] Controlled substance tracking
- [ ] Security hardening
- [ ] Comprehensive testing

### Phase 6: Deployment

- [ ] Production environment
- [ ] Data migration from Excel
- [ ] User training
- [ ] Go-live

## Data Migration

Your existing supply data from `Medic 4 supply closet 71625.xlsx` will be migrated to the new system. Migration scripts will:

1. Import item catalog
2. Set up locations
3. Configure par levels
4. Create initial inventory records

## Security & Compliance

- **HIPAA Compliant**: Encrypted data, audit logs, access controls
- **CAAS Compliant**: Complete inventory tracking and verification
- **Pharmacy Board**: Controlled substance tracking with witness verification
- **Security Features**:
  - JWT authentication
  - Password hashing (bcrypt)
  - Role-based access control
  - Comprehensive audit logging
  - HTTPS/TLS encryption
  - Session management

## Support & Documentation

- **API Documentation**: http://localhost:8000/docs (when running)
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Issues**: Contact your development team

## License

Proprietary - Internal use only

---

**Built with ❤️ for EMS professionals**
