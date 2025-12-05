#!/bin/bash

# EMS Supply Tracking - Development Startup Script

echo "🚀 Starting EMS Supply Tracking System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "${YELLOW}⚠️  Virtual environment not found. Please run setup first:${NC}"
    echo "   cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "${YELLOW}⚠️  Node modules not found. Please run setup first:${NC}"
    echo "   cd frontend && npm install"
    exit 1
fi

# Start backend
echo "${GREEN}📦 Starting Backend (Port 8000)...${NC}"
cd backend
source venv/bin/activate
PYTHONPATH=$(pwd) python -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo "${GREEN}⚛️  Starting Frontend (Port 3000)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "${GREEN}✅ System Started!${NC}"
echo ""
echo "📊 Access Points:"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs:    http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "${YELLOW}🛑 Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Kill any remaining processes
    lsof -ti :8000 | xargs kill -9 2>/dev/null
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    echo "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Set trap to catch Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
