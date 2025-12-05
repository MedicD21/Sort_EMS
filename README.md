# EMS Supply Tracking System

A comprehensive inventory management system designed specifically for Emergency Medical Services (EMS) supply stations, vehicles, and equipment tracking.

## 🚀 Features

### ✅ Implemented

- **Item Master Management**: Complete CRUD operations for EMS supplies and equipment
  - 26 sample items across 9 EMS categories
  - CSV import/export functionality
  - Multi-select bulk editing
  - Category-based organization with color coding
- **Category System**: 15 pre-configured EMS categories

  - Airway Management
  - Breathing & Oxygen
  - Cardiac Care
  - Trauma Supplies
  - IV & Fluids
  - Medications (including controlled substances)
  - Diagnostic Equipment
  - Infection Control
  - OB/GYN
  - Pediatric Equipment
  - Burns
  - Extraction & Rescue
  - Communication
  - Documentation
  - General Supplies

- **Inventory Management**: Real-time stock tracking

  - Location-based inventory (Supply Stations, Cabinets, Vehicles)
  - Par level management
  - Low stock alerts
  - RFID tag scanning support
  - Individual item tracking with expiration dates

- **User Interface**: Modern, responsive dark mode interface
  - Material-UI components
  - Real-time search and filtering
  - Mobile-friendly design
  - Color-coded status indicators

### 🚧 In Progress

- Order management system
- Reporting and analytics
- Advanced RFID scanning workflows
- User authentication and role-based access

## 🛠️ Tech Stack

### Backend

- **Framework**: FastAPI (Python 3.14)
- **Database**: SQLite with SQLAlchemy ORM
- **API**: RESTful with automatic OpenAPI documentation

### Frontend

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Routing**: React Router v6

## 📦 Installation & Running

### Quick Start (Recommended)

```bash
# Interactive menu with Docker or Local options
./run.sh
```

### Option 1: Docker Compose (Recommended for Stability)

```bash
# Start everything with auto-restart
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Advantages:**

- ✅ Auto-restart on crash
- ✅ Isolated environment
- ✅ No dependency conflicts
- ✅ One command to start/stop

### Option 2: Local Development (Recommended for Active Development)

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python rebuild_database.py

# Seed sample data (optional)
python seed_sample_items.py

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Advantages:**

- ✅ Faster hot-reload
- ✅ Direct log access
- ✅ Better for debugging
- ✅ Easier development workflow

### Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📊 Database Schema

### Core Tables

- **items**: Master item data with categories
- **categories**: EMS supply categories with color coding
- **locations**: Supply stations, cabinets, and vehicles
- **inventory_current**: Current stock levels by location
- **inventory_items**: Individual trackable items with RFID/expiration
- **par_levels**: Min/max stock levels per location
- **users**: System users and authentication
- **purchase_orders**: Procurement tracking
- **audit_logs**: System activity tracking

## 🎯 Quick Start

1. **Start Backend**:

   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   ```

2. **Start Frontend**:

   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the App**: Open http://localhost:3000

4. **Explore Features**:
   - Navigate to "Items" to see the master item list
   - Navigate to "Categories" to manage supply categories
   - Navigate to "Inventory" to view stock levels by location

## 📝 API Endpoints

### Items

- `GET /api/v1/items/` - List all items with stock info
- `GET /api/v1/items/{id}` - Get specific item
- `POST /api/v1/items/` - Create new item
- `PUT /api/v1/items/{id}` - Update item
- `DELETE /api/v1/items/{id}` - Delete item

### Categories

- `GET /api/v1/categories/` - List all categories
- `GET /api/v1/categories/{id}` - Get specific category
- `POST /api/v1/categories/` - Create category
- `PUT /api/v1/categories/{id}` - Update category
- `DELETE /api/v1/categories/{id}` - Delete category

### Inventory

- `GET /api/v1/inventory/` - Get inventory by location
- `POST /api/v1/inventory/transfer` - Transfer stock between locations
- `POST /api/v1/inventory/adjust` - Adjust stock levels

Full API documentation available at http://localhost:8000/docs

## 🔒 Security

- JWT-based authentication (currently disabled for development)
- Role-based access control (planned)
- Audit logging for all operations
- Controlled substance tracking

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is a private project. For questions or contributions, contact the development team.

## 📞 Support

For issues or questions, please create an issue in the GitHub repository.
