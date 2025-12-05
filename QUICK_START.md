# Quick Start Guide - EMS Supply Tracking System

## 🚀 Starting the Application

### 1. Start Backend Server

```bash
cd /Users/dustinschaaf/Desktop/Sort_EMS/Sort_EMS/backend
python -m uvicorn app.main:app --reload
```

**Backend URL**: http://127.0.0.1:8000
**API Docs**: http://127.0.0.1:8000/docs

### 2. Start Frontend Server

```bash
cd /Users/dustinschaaf/Desktop/Sort_EMS/Sort_EMS/frontend
npx vite
```

**Frontend URL**: http://localhost:5173/

### 3. Login

- **Username**: `admin`
- **Password**: `ChangeMe123!`

## 📱 Using the Scanner (Zebra TC22/TC27)

### RFID Scanning Workflow

1. Navigate to **Scanner** page
2. Enter or scan RFID tag in the input field
3. Press Enter or click "Scan Item" button
4. View scan results:
   - ✅ **Green** = Item found in inventory
   - ❌ **Red** = Tag not registered
5. Check scan history below for recent scans

### Sample RFID Tags in Database

The system has 169 items. To test scanning, you'll need to know which items have RFID tags. You can:

1. Go to **Inventory** page
2. Look for items with RFID tags assigned
3. Use those tags for testing

### Registering New RFID Tags

```
POST /api/v1/rfid/register
{
  "rfid_tag": "E200001234567890ABCDEF01",
  "item_id": 1
}
```

## 📦 Managing Inventory

### Viewing Inventory

1. Go to **Inventory** page
2. Browse all 169 items
3. Use search to find specific items
4. Filter by category or location

### Checking Stock Levels

1. Go to **Dashboard** page
2. View "Low Stock Items" card for count
3. Scroll down to see low stock table
4. Items shown are below par level

## 🛒 Managing Orders

### Creating a Purchase Order

1. Go to **Orders** page
2. Click "New Order" button
3. Enter supplier name
4. Add notes (optional)
5. Click "Create Order"

### Updating Order Status

Orders flow through these states:

1. **Pending** → Click ✓ to Approve or ✗ to Cancel
2. **Approved** → Click ✓ to mark as Ordered
3. **Ordered** → Click ✓ to mark as Received
4. **Received** → Final state

### Viewing Order Details

1. Click 👁 (eye icon) on any order
2. View supplier, status, dates
3. See order items and costs
4. Review notes

## 📊 Viewing Reports

### Available Reports

1. **Low Stock** - Items below par level with severity
2. **Usage Statistics** - Usage patterns and averages
3. **Audit Logs** - Complete activity trail
4. **Order History** - All purchase orders
5. **Movement History** - Item transfers between locations

### Accessing Reports

1. Go to **Reports** page
2. Click on desired report tab
3. View summary metrics at top
4. Scroll through detailed tables

## ⚙️ Managing Settings

### Updating Your Profile

1. Go to **Settings** page
2. Stay on **Profile** tab
3. Update Full Name and Email
4. Click "Update Profile"

### Changing Password

1. Go to **Settings** page
2. Click **Password** tab
3. Enter current password
4. Enter new password twice
5. Click "Change Password"

### Managing Users (Admin Only)

1. Go to **Settings** page
2. Click **Users** tab
3. View all users with roles
4. Click "Add User" to create new user
5. Click 🗑️ to delete users (cannot delete yourself)

## 🔍 API Documentation

### Swagger UI (Interactive)

http://127.0.0.1:8000/docs

### ReDoc (Documentation)

http://127.0.0.1:8000/redoc

### Testing APIs Directly

Use the Swagger UI to:

- Test any endpoint
- View request/response schemas
- Get example payloads
- Try authentication

## 🗄️ Database Information

### Current Data

- **Items**: 169 (127 medical, 42 cleaning)
- **Locations**: 7 locations
- **Categories**: 2 categories
- **Users**: 1 admin user

### Database Location

```
/Users/dustinschaaf/Desktop/Sort_EMS/Sort_EMS/backend/ems_supply.db
```

### Viewing Database

```bash
# Using SQLite CLI
cd /Users/dustinschaaf/Desktop/Sort_EMS/Sort_EMS/backend
sqlite3 ems_supply.db

# Common queries
.tables                    # List all tables
SELECT * FROM items LIMIT 10;
SELECT * FROM locations;
SELECT * FROM categories;
```

## 🐛 Troubleshooting

### Backend Won't Start

```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill process if needed
kill -9 <PID>

# Restart backend
cd backend
python -m uvicorn app.main:app --reload
```

### Frontend Won't Start

```bash
# Check if port 5173 is in use
lsof -i :5173

# Reinstall dependencies if needed
cd frontend
rm -rf node_modules package-lock.json
npm install

# Start with npx
npx vite
```

### Login Not Working

- Verify backend is running on http://127.0.0.1:8000
- Check browser console for errors
- Confirm credentials: `admin` / `ChangeMe123!`
- Check Network tab for failed requests

### API Calls Failing

- Verify both servers are running
- Check CORS configuration in backend
- Look for 401 (auth) or 403 (permission) errors
- Refresh page to get new JWT token

### Database Issues

```bash
# Backup database
cp backend/ems_supply.db backend/ems_supply.db.backup

# Re-migrate data if needed
cd backend
python migrate_sample_inventory.py
```

## 📝 Common Tasks

### Adding New Items

```bash
# Via API (Swagger UI)
POST /api/v1/items
{
  "name": "New Item",
  "category_id": 1,
  "sku": "NEW-001",
  "unit_price": 10.00,
  "quantity": 100,
  "location_id": 1
}
```

### Adjusting Inventory

```bash
POST /api/v1/inventory/adjust
{
  "item_id": 1,
  "quantity_change": -5,
  "reason": "Used in procedure"
}
```

### Transferring Items

```bash
POST /api/v1/inventory/transfer
{
  "item_id": 1,
  "from_location_id": 1,
  "to_location_id": 2,
  "quantity": 10
}
```

### Creating Users

```bash
POST /api/v1/users
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "full_name": "New User",
  "is_active": true
}
```

## 🎯 Best Practices

### Using the Scanner

- Keep RFID tags clean and undamaged
- Scan from 6-12 inches away
- Hold scanner steady for accurate reads
- Check scan history for verification

### Managing Orders

- Always add notes for order context
- Update status promptly
- Verify received items match order
- Keep supplier information consistent

### Inventory Management

- Set appropriate par levels for each location
- Review low stock alerts regularly
- Transfer items before they run out
- Audit high-value items frequently

### User Management

- Use strong passwords
- Deactivate users instead of deleting when possible
- Limit admin access to necessary users
- Review audit logs periodically

## 📞 Support

### Documentation Files

- `README.md` - Project overview
- `ARCHITECTURE.md` - System architecture
- `GETTING_STARTED.md` - Initial setup
- `FRONTEND_INTEGRATION_COMPLETE.md` - Integration details
- `QUICK_REFERENCE.md` - This file

### API References

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

### Code Structure

- Backend: `/backend/app/`
- Frontend: `/frontend/src/`
- Database: `/backend/ems_supply.db`
- Migrations: `/backend/migrations/`

---

**Happy Tracking! 🚑📦**
