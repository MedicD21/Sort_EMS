# Quick Reference Guide

## Starting the System

### 1. Start Database (First Time)

```powershell
cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS
docker-compose up -d
```

### 2. Import Data (First Time Only)

```powershell
cd backend
python migrate_data.py
```

### 3. Start API Server

```powershell
cd backend
uvicorn app.main:app --reload
```

### 4. Access System

- API Docs: http://localhost:8000/docs
- pgAdmin: http://localhost:5050
- Health: http://localhost:8000/health

## Default Credentials

**Admin Login** (⚠️ Change immediately!)

- Username: `admin`
- Password: `ChangeMe123!`

**Database** (via pgAdmin)

- Email: `admin@emscompany.com`
- Password: `admin`
- DB Host: `postgres` (or `localhost`)
- DB User: `ems_user`
- DB Password: `ems_password_change_in_production`

## Common Tasks

### View All Items

```powershell
docker exec -it ems_postgres psql -U ems_user -d ems_supply_db -c "SELECT item_code, name FROM items LIMIT 10;"
```

### View Locations

```powershell
docker exec -it ems_postgres psql -U ems_user -d ems_supply_db -c "SELECT name, type FROM locations;"
```

### Check System Status

```powershell
docker ps
```

### View Logs

```powershell
docker-compose logs -f
```

### Stop All Services

```powershell
docker-compose down
```

### Restart Services

```powershell
docker-compose restart
```

## File Locations

- **Config**: `backend\.env`
- **Models**: `backend\app\models\*.py`
- **Main App**: `backend\app\main.py`
- **Data Import**: `backend\migrate_data.py`
- **Excel Data**: `Medic 4 supply closet 71625.xlsx`

## Important Ports

- **8000**: FastAPI backend
- **5432**: PostgreSQL database
- **6379**: Redis cache
- **5050**: pgAdmin web UI
- **3000**: React frontend (when built)

## Troubleshooting

**Can't connect to database?**

```powershell
docker-compose restart postgres
```

**Module not found?**

```powershell
cd backend
pip install -r requirements.txt
```

**Port already in use?**
Edit `docker-compose.yml` and change port numbers

**Need to reset database?**

```powershell
docker-compose down -v
docker-compose up -d
python migrate_data.py
```

## Next Development Steps

1. **Build Authentication API** → Login/logout endpoints
2. **Build User API** → Manage users
3. **Build Items API** → Manage inventory items
4. **Build RFID API** → Scanning operations
5. **Build Frontend** → React web app
6. **Deploy** → Cloud hosting

## Key Concepts

**Location Hierarchy:**
Supply Station → Station Cabinet → Vehicle

**Item Lifecycle:**
Receive → Stock → Transfer → Use → Reorder

**RFID Workflow:**
Scan Tag → Update Location → Track Movement → Alert if Below Par

**Par Level Logic:**
If quantity < reorder_quantity → Generate order for order_quantity

## API Endpoints (When Built)

- `POST /api/v1/auth/login` - Login
- `GET /api/v1/items` - List items
- `POST /api/v1/rfid/scan` - Scan RFID tag
- `GET /api/v1/inventory/{location_id}` - View inventory
- `POST /api/v1/orders` - Create order
- `GET /api/v1/reports/low-stock` - Low stock report

## Database Tables

| Table               | Purpose                             |
| ------------------- | ----------------------------------- |
| users               | Authentication                      |
| locations           | Supply stations, cabinets, vehicles |
| items               | Supply catalog                      |
| rfid_tags           | Individual item tracking            |
| inventory_current   | Real-time stock                     |
| inventory_movements | Movement history                    |
| par_levels          | Stock thresholds                    |
| purchase_orders     | Orders                              |
| audit_logs          | Compliance tracking                 |

## Environment Variables

Edit `backend\.env`:

- `DATABASE_URL` - Database connection
- `SECRET_KEY` - JWT signing key (⚠️ change!)
- `DEBUG` - Enable/disable debug mode
- `ALLOWED_ORIGINS` - CORS settings

## Security Checklist

Before Production:

- [ ] Change SECRET_KEY
- [ ] Change admin password
- [ ] Change database password
- [ ] Set DEBUG=False
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Set up backups
- [ ] Review CORS settings

## Useful SQL Queries

```sql
-- Count items
SELECT COUNT(*) FROM items;

-- View par levels
SELECT l.name, i.item_code, p.par_quantity, p.reorder_quantity
FROM par_levels p
JOIN locations l ON p.location_id = l.id
JOIN items i ON p.item_id = i.id;

-- Current inventory
SELECT l.name, i.item_code, ic.quantity_on_hand
FROM inventory_current ic
JOIN locations l ON ic.location_id = l.id
JOIN items i ON ic.item_id = i.id;
```

## Development Workflow

1. Make changes to code
2. Server auto-reloads (if using --reload)
3. Test in http://localhost:8000/docs
4. Check database with pgAdmin
5. Review logs for errors
6. Commit changes to Git

## Resources

- FastAPI Docs: https://fastapi.tiangolo.com
- SQLAlchemy: https://docs.sqlalchemy.org
- PostgreSQL: https://www.postgresql.org/docs
- Docker: https://docs.docker.com
- React: https://react.dev

---

**Need Help?** Check `GETTING_STARTED.md` or `ARCHITECTURE.md`
