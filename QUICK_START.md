# Quick Start Guide

## 🚀 Running the Application

### Option 1: Docker (Recommended for Stability)

**Advantages:**

- ✅ Auto-restart on crash
- ✅ Consistent environment
- ✅ No Python/Node version conflicts
- ✅ Easy start/stop

**Requirements:**

- Docker Desktop installed and running

**Commands:**

```bash
# Interactive menu
./run.sh

# Or directly
docker-compose up -d --build    # Start
docker-compose logs -f          # View logs
docker-compose down             # Stop
docker-compose restart          # Restart
```

### Option 2: Local Development (Recommended for Development)

**Advantages:**

- ✅ Faster hot-reload
- ✅ Direct terminal access
- ✅ Easier debugging
- ✅ Better for active coding

**Requirements:**

- Python 3.14+
- Node.js 18+

**Commands:**

```bash
# Interactive menu
./run.sh

# Or manual setup
# Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm run dev
```

---

## 📊 Access Points

| Service     | URL                        | Description                   |
| ----------- | -------------------------- | ----------------------------- |
| Frontend    | http://localhost:3000      | Main application UI           |
| Backend API | http://localhost:8000      | REST API                      |
| API Docs    | http://localhost:8000/docs | Interactive API documentation |

---

## 🛠️ Common Tasks

### Start Everything

```bash
./run.sh
# Choose option 1 (Docker) or 2 (Local)
```

### Stop Everything

```bash
./run.sh
# Choose option 3

# Or manually:
docker-compose down                    # Docker
lsof -ti :8000 :3000 | xargs kill -9  # Local
```

### View Logs

```bash
# Docker
docker-compose logs -f           # All
docker-compose logs -f backend   # Backend only
docker-compose logs -f frontend  # Frontend only

# Local
tail -f backend.log
tail -f frontend.log
```

### Restart Services

```bash
# Docker
docker-compose restart
docker-compose restart backend   # Backend only
docker-compose restart frontend  # Frontend only

# Local - stop and re-run ./run.sh
```

### Rebuild After Code Changes

```bash
# Docker (for major changes)
docker-compose up -d --build

# Local - auto-reload is enabled, just save files
```

### Database Operations

```bash
# Rebuild database
cd backend
source venv/bin/activate
python rebuild_database.py

# Seed sample data
python seed_sample_items.py

# For Docker:
docker-compose exec backend python rebuild_database.py
docker-compose exec backend python seed_sample_items.py
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find and kill process
lsof -ti :8000 | xargs kill -9  # Backend
lsof -ti :3000 | xargs kill -9  # Frontend
```

### Docker Issues

```bash
# Clean rebuild
docker-compose down -v
docker-compose up -d --build

# Remove all containers and images
docker-compose down -v --rmi all
```

### Database Locked

```bash
# Stop all services first
./run.sh  # Option 3

# Then rebuild database
cd backend
source venv/bin/activate
python rebuild_database.py
```

### Frontend Won't Start

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend Import Errors

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

---

## 📝 Development Workflow

### Making Backend Changes

1. Edit Python files in `backend/app/`
2. Uvicorn auto-reloads (both Docker and local)
3. Check logs for errors
4. Test at http://localhost:8000/docs

### Making Frontend Changes

1. Edit React files in `frontend/src/`
2. Vite hot-reloads automatically
3. Check browser console for errors
4. View at http://localhost:3000

### Database Schema Changes

1. Edit models in `backend/app/models/`
2. Stop services
3. Run `python rebuild_database.py`
4. Run `python seed_sample_items.py` (if needed)
5. Restart services

---

## 🎯 Which Method to Use?

| Scenario             | Recommended                 |
| -------------------- | --------------------------- |
| Active development   | **Local** - Faster feedback |
| Long-running/testing | **Docker** - Auto-restart   |
| Demos/presentations  | **Docker** - Reliable       |
| Debugging            | **Local** - Better access   |
| First time setup     | **Docker** - Easier         |

---

## 💡 Tips

1. **Use Docker for stability** - It will restart if something crashes
2. **Use Local for development** - Faster iteration, better debugging
3. **Always check logs** - Most issues show up in logs first
4. **Run `./run.sh`** - Interactive menu makes everything easier
5. **Database changes need restart** - Stop services before rebuild

---

## 🔗 Useful Links

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Material-UI](https://mui.com/)
- [Docker Compose](https://docs.docker.com/compose/)
