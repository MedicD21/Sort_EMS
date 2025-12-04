# EMS Supply Tracking System - Technical Architecture

## System Overview

A comprehensive, HIPAA & CAAS compliant supply tracking system for EMS operations with RFID/QR integration, multi-level inventory management, and automated ordering.

## Technology Stack

### Backend

- **Framework**: FastAPI (Python) - High performance, async, auto-documentation
- **Database**: PostgreSQL - ACID compliant, supports complex queries
- **ORM**: SQLAlchemy - Database abstraction layer
- **Authentication**: JWT + OAuth2 with bcrypt password hashing
- **API Documentation**: Auto-generated OpenAPI/Swagger
- **Task Queue**: Celery + Redis (for automated ordering, notifications)
- **File Storage**: AWS S3 or Azure Blob (for compliance documents, images)

### Frontend

- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) - Enterprise-grade, accessible
- **State Management**: Redux Toolkit + RTK Query
- **Mobile Support**: Progressive Web App (PWA) with offline capabilities
- **QR/RFID Scanner**: HTML5 Camera API + QuaggaJS for barcode scanning
- **Charts/Analytics**: Recharts or Chart.js

### Mobile (Future Enhancement)

- React Native or Flutter for native iOS/Android apps
- Shared API backend

### DevOps & Infrastructure

- **Containerization**: Docker + Docker Compose
- **Cloud Platform**: AWS or Azure (HIPAA compliant)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

## Database Schema Design

### Core Entities

#### 1. Users & Authentication

```sql
users
- id (UUID, PK)
- username (unique)
- email (unique)
- password_hash
- role (ENUM: admin, user)
- first_name
- last_name
- is_active
- created_at
- updated_at
- last_login
```

#### 2. Inventory Hierarchy

```sql
locations
- id (UUID, PK)
- name (e.g., "Supply Station", "Station 1", "Medic 4")
- type (ENUM: supply_station, station_cabinet, vehicle)
- parent_location_id (FK to locations, nullable)
- address
- is_active
- created_at
- updated_at

items
- id (UUID, PK)
- item_code (unique, e.g., "A01")
- name
- description
- category_id (FK to categories)
- unit_of_measure (e.g., "EA", "Box", "Roll")
- requires_expiration_tracking (boolean)
- is_controlled_substance (boolean)
- manufacturer
- manufacturer_part_number
- cost_per_unit
- is_active
- created_at
- updated_at

categories
- id (UUID, PK)
- name (e.g., "Bandages", "Medications", "Airway")
- parent_category_id (FK to categories, nullable)
- created_at
- updated_at

par_levels
- id (UUID, PK)
- location_id (FK to locations)
- item_id (FK to items)
- par_quantity (standard stock level)
- reorder_quantity (minimum before reorder)
- max_quantity (maximum to stock)
- created_at
- updated_at
- UNIQUE(location_id, item_id)
```

#### 3. RFID/QR Tracking

```sql
rfid_tags
- id (UUID, PK)
- tag_id (unique RFID/QR code)
- item_id (FK to items)
- current_location_id (FK to locations)
- status (ENUM: in_stock, in_use, depleted, expired)
- expiration_date
- lot_number
- received_date
- cost
- created_at
- updated_at

inventory_movements
- id (UUID, PK)
- rfid_tag_id (FK to rfid_tags)
- from_location_id (FK to locations, nullable)
- to_location_id (FK to locations, nullable)
- movement_type (ENUM: receive, transfer, use, dispose, restock)
- quantity
- user_id (FK to users)
- notes
- timestamp
- created_at
```

#### 4. Current Inventory State

```sql
inventory_current
- id (UUID, PK)
- location_id (FK to locations)
- item_id (FK to items)
- quantity_on_hand
- quantity_allocated
- quantity_available (computed: on_hand - allocated)
- last_counted_at
- last_counted_by (FK to users)
- created_at
- updated_at
- UNIQUE(location_id, item_id)
```

#### 5. Ordering & Restocking

```sql
purchase_orders
- id (UUID, PK)
- po_number (unique)
- vendor_id (FK to vendors)
- status (ENUM: pending, ordered, partial, received, cancelled)
- order_date
- expected_delivery_date
- received_date
- total_cost
- created_by (FK to users)
- created_at
- updated_at

purchase_order_items
- id (UUID, PK)
- po_id (FK to purchase_orders)
- item_id (FK to items)
- quantity_ordered
- quantity_received
- unit_cost
- total_cost
- created_at
- updated_at

vendors
- id (UUID, PK)
- name
- contact_name
- email
- phone
- address
- is_active
- created_at
- updated_at

auto_order_rules
- id (UUID, PK)
- item_id (FK to items)
- trigger_quantity (auto-order when below this)
- order_quantity (how much to order)
- preferred_vendor_id (FK to vendors)
- is_active
- created_at
- updated_at
```

#### 6. Compliance & Audit

```sql
audit_logs
- id (UUID, PK)
- user_id (FK to users, nullable)
- entity_type (e.g., "inventory", "order", "user")
- entity_id (UUID)
- action (ENUM: create, read, update, delete, scan)
- changes (JSONB - before/after values)
- ip_address
- user_agent
- timestamp
- created_at

controlled_substance_logs
- id (UUID, PK)
- rfid_tag_id (FK to rfid_tags)
- user_id (FK to users)
- action (ENUM: receive, dispense, waste, count)
- quantity
- patient_encounter_id (nullable, for ImageTrend integration)
- witness_user_id (FK to users, nullable)
- notes
- timestamp
- created_at
```

#### 7. Notifications & Alerts

```sql
notifications
- id (UUID, PK)
- user_id (FK to users, nullable) - null for system-wide
- type (ENUM: low_stock, expiration, order_received, etc.)
- title
- message
- severity (ENUM: info, warning, critical)
- is_read
- related_entity_type
- related_entity_id (UUID, nullable)
- created_at
- read_at
```

## System Workflow

### 1. Supply Station → Station Cabinet → Vehicle (Truck) → Usage

**Receiving at Supply Station:**

1. Items arrive with RFID tags
2. Admin scans each tag upon receipt
3. System creates `rfid_tags` record and `inventory_movement` (type: receive)
4. Updates `inventory_current` for Supply Station

**Auto-Transfer to Station Cabinet:**

1. System monitors station cabinet inventory levels
2. When below par, auto-generates transfer order
3. Admin pulls items from Supply Station
4. Scans RFID tags to confirm transfer
5. System updates location for each tag
6. Creates `inventory_movement` records

**Station Cabinet → Vehicle:**

1. User scans QR code on station cabinet (context)
2. Scans items being pulled for truck
3. System records movement to vehicle
4. Updates inventory at both locations

**Usage on Truck:**

1. User scans item QR/RFID when used
2. System marks tag as "depleted" or "in_use"
3. Creates usage record
4. Updates vehicle inventory

**Daily Par Checks:**

1. User scans vehicle location QR
2. Scans all items present
3. System compares against par levels
4. Alerts for missing items
5. User pulls from station cabinet to restock
6. Scans station cabinet after restocking
7. System auto-orders items below par at station level

### 2. Automated Ordering Logic

```
Daily Background Job:
1. Check all station cabinets inventory_current
2. Compare against par_levels.reorder_quantity
3. For items below threshold:
   - Check auto_order_rules
   - Create purchase_order if not already pending
   - Aggregate quantities across stations
   - Send notification to admin
   - Email/API to vendor (future)
```

## API Endpoints Structure

### Authentication

- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/refresh`
- GET `/api/auth/me`

### Users

- GET `/api/users`
- POST `/api/users`
- GET `/api/users/{id}`
- PUT `/api/users/{id}`
- DELETE `/api/users/{id}`

### Items & Inventory

- GET `/api/items`
- POST `/api/items`
- GET `/api/items/{id}`
- PUT `/api/items/{id}`
- DELETE `/api/items/{id}`
- GET `/api/items/{id}/locations` - inventory across all locations
- GET `/api/items/{id}/par-levels`

### Locations

- GET `/api/locations`
- POST `/api/locations`
- GET `/api/locations/{id}`
- GET `/api/locations/{id}/inventory` - current inventory at location
- GET `/api/locations/{id}/par-check` - compare current vs par
- POST `/api/locations/{id}/count` - physical count update

### RFID Operations

- POST `/api/rfid/scan` - record single scan
- POST `/api/rfid/batch-scan` - record multiple scans
- GET `/api/rfid/tag/{tag_id}` - tag details and history
- POST `/api/rfid/receive` - receive shipment
- POST `/api/rfid/transfer` - transfer between locations
- POST `/api/rfid/use` - mark as used

### Orders

- GET `/api/orders`
- POST `/api/orders` - create manual order
- GET `/api/orders/{id}`
- PUT `/api/orders/{id}/receive` - mark items received
- POST `/api/orders/auto-generate` - trigger auto-order check

### Reports & Analytics

- GET `/api/reports/inventory-summary`
- GET `/api/reports/usage-by-item`
- GET `/api/reports/usage-by-location`
- GET `/api/reports/expiring-items`
- GET `/api/reports/controlled-substances`
- GET `/api/reports/order-history`
- GET `/api/reports/audit-trail`

### Notifications

- GET `/api/notifications`
- PUT `/api/notifications/{id}/read`
- PUT `/api/notifications/read-all`

## Security & Compliance

### HIPAA Compliance

- All data encrypted at rest (database encryption)
- All data encrypted in transit (TLS 1.3)
- Comprehensive audit logging
- Role-based access control
- Automatic session timeout
- Password complexity requirements
- Regular automated backups with encryption
- Data retention policies

### CAAS Compliance

- Complete audit trail
- Inventory tracking and verification
- Expiration date monitoring
- Controlled substance tracking

### Ohio Pharmacy Board (Controlled Substances)

- Two-person verification for controlled substances
- Complete chain of custody
- Witness signatures (electronic)
- Waste documentation
- Tamper-evident audit logs
- Real-time reporting capabilities

## Deployment Architecture

### Production Environment (AWS Example)

```
- VPC with public/private subnets
- Application Load Balancer (HTTPS only)
- ECS Fargate containers for backend API
- RDS PostgreSQL (Multi-AZ for HA)
- ElastiCache Redis (for sessions, cache, Celery)
- S3 for static files and backups
- CloudFront CDN for frontend
- Route 53 for DNS
- CloudWatch for monitoring & alerts
- AWS Secrets Manager for credentials
- WAF for API protection
```

### Development Setup

```
- Docker Compose with:
  - FastAPI container
  - PostgreSQL container
  - Redis container
  - React dev server
  - pgAdmin for DB management
```

## Progressive Web App Features

- Install to home screen
- Offline mode for viewing inventory
- Background sync when connection restored
- Push notifications for critical alerts
- Camera access for QR scanning

## Future Enhancements (Post-MVP)

1. ImageTrend integration for automatic usage reporting
2. Native mobile apps (iOS/Android)
3. Advanced analytics & predictive ordering
4. Vendor API integration for automated ordering
5. Barcode label printing
6. Multi-language support
7. Voice commands for hands-free operation
8. Machine learning for usage pattern prediction
9. Integration with patient care reports
10. Fleet-wide analytics dashboard

## Development Phases

### Phase 1: Foundation (Weeks 1-2)

- Project setup
- Database schema implementation
- User authentication & authorization
- Basic CRUD APIs for items, locations, users

### Phase 2: Core Inventory (Weeks 3-4)

- RFID/QR scanning functionality
- Inventory movement tracking
- Par level management
- Current inventory state management

### Phase 3: Ordering System (Weeks 5-6)

- Auto-ordering logic
- Purchase order management
- Vendor management
- Notifications system

### Phase 4: Frontend Development (Weeks 7-9)

- React application setup
- User interface components
- Scanner integration
- Dashboard and reporting views

### Phase 5: Compliance & Testing (Weeks 10-11)

- Audit logging
- Controlled substance tracking
- Security hardening
- Comprehensive testing

### Phase 6: Deployment (Week 12)

- Production environment setup
- Data migration from Excel
- User training
- Go-live support

## Data Migration Plan

1. Export current Excel data
2. Transform to match new schema
3. Create initial locations (Supply Station, Stations, Vehicles)
4. Import items with initial par levels
5. Create RFID tags for existing inventory
6. Initial inventory count to establish baseline
