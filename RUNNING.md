# Running the Application - Best Practices

## 🎯 TL;DR - What Should You Use?

### For Daily Development

**Use Local Development** (`./run.sh` → Option 2)

- Faster feedback when coding
- Direct access to logs in terminal
- Easier debugging

### For Demos or Long Sessions

**Use Docker** (`./run.sh` → Option 1)

- Automatic restart if something crashes
- Consistent environment
- Just works™

---

## 🐳 Docker Setup (Your Question!)

Yes! Docker is **perfect** for keeping services running reliably. Here's what I've set up:

### What Docker Gives You

1. **Auto-Restart** - If backend or frontend crashes, Docker automatically restarts them
2. **Health Checks** - Docker monitors if services are actually working, not just running
3. **Isolation** - No conflicts with other Python/Node projects
4. **One Command** - `docker-compose up -d` starts everything

### How to Use Docker

```bash
# Start everything
docker-compose up -d --build

# Check status
docker-compose ps

# View logs (live)
docker-compose logs -f

# View just backend logs
docker-compose logs -f backend

# Stop everything
docker-compose down

# Restart if you make changes
docker-compose restart
```

### Docker Features I Added

✅ **Automatic Restart** - `restart: unless-stopped` means services restart on crash  
✅ **Health Checks** - System verifies services are responding every 30 seconds  
✅ **Hot Reload** - Code changes still trigger auto-reload in Docker  
✅ **Volume Mounts** - Your code changes reflect immediately  
✅ **Database Persistence** - SQLite database persists between restarts

---

## 💻 Alternative: Process Managers (Not Docker)

If you don't want Docker, here are other options:

### Option A: PM2 (Node.js Process Manager)

```bash
# Install globally
npm install -g pm2

# Start backend
pm2 start "cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000" --name backend

# Start frontend
pm2 start "cd frontend && npm run dev" --name frontend

# View status
pm2 status

# View logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all
```

**Pros:** Auto-restart, log management, works without Docker  
**Cons:** Requires PM2 installed, more manual setup

### Option B: systemd (Linux Only)

Create service files in `/etc/systemd/system/`:

```ini
# /etc/systemd/system/ems-backend.service
[Unit]
Description=EMS Backend
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/Sort_EMS/backend
ExecStart=/path/to/Sort_EMS/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**Pros:** Native Linux, very stable, starts on boot  
**Cons:** Only Linux, requires root, more complex setup

### Option C: Supervisor (Python)

```bash
pip install supervisor

# Create config at /etc/supervisor/conf.d/ems.conf
```

**Pros:** Python-native, cross-platform, auto-restart  
**Cons:** Another tool to learn, requires configuration

---

## 🏆 My Recommendation

### For You Right Now

**Use Docker Compose** for these reasons:

1. ✅ **Already configured** - I set it up for you, just run it
2. ✅ **Works on Mac** - Fully compatible with your system
3. ✅ **Auto-restart built-in** - Exactly what you asked for
4. ✅ **Industry standard** - Most professional teams use this
5. ✅ **Easy troubleshooting** - Great logging and debugging tools

### When to Switch

**Switch to Local Development when:**

- You're actively coding and want instant feedback
- You need to debug with print statements or debugger
- You're making frequent database changes

**Use Docker when:**

- Running for demos or testing
- Want hands-off operation
- Need guaranteed stability
- Sharing with others

---

## 📋 Step-by-Step Docker Usage

### First Time Setup

```bash
# 1. Make sure Docker Desktop is running (check menu bar)

# 2. Run the interactive menu
./run.sh

# 3. Choose option 1 (Docker Compose)

# 4. Wait ~30 seconds for build

# 5. Access at http://localhost:3000
```

### Daily Usage

```bash
# Start (if not already running)
docker-compose up -d

# Check if running
docker-compose ps

# View logs if something seems wrong
docker-compose logs -f

# Stop when done
docker-compose down
```

### Troubleshooting

```bash
# Service not responding?
docker-compose restart backend

# Complete rebuild needed?
docker-compose down
docker-compose up -d --build

# Clear everything and start fresh
docker-compose down -v
docker-compose up -d --build
```

---

## 🎮 The Interactive Menu (`./run.sh`)

I created an easy menu system:

```bash
./run.sh
```

This gives you:

1. **Docker Compose** - One-click Docker startup
2. **Local Development** - One-click local startup
3. **Stop All** - Kills everything (Docker + local)
4. **View Logs** - Easy log access
5. **Exit**

Use this instead of remembering commands!

---

## 📊 Comparison Table

| Feature          | Docker    | Local Dev   | PM2         | systemd          |
| ---------------- | --------- | ----------- | ----------- | ---------------- |
| Auto-restart     | ✅        | ❌          | ✅          | ✅               |
| Hot-reload       | ✅        | ✅          | ✅          | ❌               |
| Cross-platform   | ✅        | ✅          | ✅          | ❌ Linux only    |
| Easy logs        | ✅        | ✅          | ✅          | ⚠️               |
| Setup difficulty | Easy      | Easy        | Medium      | Hard             |
| Resource usage   | Higher    | Lower       | Lower       | Lower            |
| Best for         | Stability | Development | Alternative | Production Linux |

---

## 🚀 Quick Commands Reference

### Docker

```bash
docker-compose up -d              # Start
docker-compose down               # Stop
docker-compose restart            # Restart
docker-compose logs -f            # Logs
docker-compose ps                 # Status
```

### Local

```bash
./run.sh                          # Interactive menu
lsof -ti :8000 :3000 | xargs kill # Stop all
```

### Both

```bash
./run.sh                          # Use the menu!
```

---

## 💡 Pro Tips

1. **Use Docker by default** - It just works and handles crashes
2. **Switch to local when coding** - Faster iteration
3. **Check logs often** - `docker-compose logs -f`
4. **Use the menu** - `./run.sh` is easiest
5. **Database in backend folder** - `backend/ems_supply.db`

---

## ❓ FAQ

**Q: Does Docker slow down development?**  
A: No! I configured volume mounts so code changes trigger hot-reload just like local.

**Q: What if Docker crashes?**  
A: It automatically restarts. Check logs: `docker-compose logs -f`

**Q: Can I mix Docker and local?**  
A: Not recommended - use one or the other to avoid port conflicts.

**Q: Which is faster?**  
A: Local is slightly faster for hot-reload, Docker is more stable.

**Q: What about production?**  
A: This Docker setup is for development. Production needs more configuration.

---

## 🎯 Bottom Line

**Your specific question: "are there any other ways to better run the front and backend so its always up and dont have to keep restarting it?"**

**Answer: Yes! Use Docker Compose.**

```bash
# One command, always up, auto-restart:
docker-compose up -d
```

That's it! Docker will keep both services running and restart them automatically if they crash. No more manual restarts needed.
