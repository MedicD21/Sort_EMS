#!/bin/bash

# EMS Supply Tracking - Startup Menu

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo "${BLUE}║   EMS Supply Tracking - Startup Options       ║${NC}"
echo "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo ""
echo "${GREEN}Choose how to run the application:${NC}"
echo ""
echo "  ${YELLOW}1)${NC} Docker Compose (Recommended)"
echo "     → Auto-restart on crash"
echo "     → Isolated environment"
echo "     → Easy to stop/start"
echo ""
echo "  ${YELLOW}2)${NC} Local Development"
echo "     → Faster hot-reload"
echo "     → Direct access to logs"
echo "     → Better for active development"
echo ""
echo "  ${YELLOW}3)${NC} Stop All Services"
echo ""
echo "  ${YELLOW}4)${NC} View Logs"
echo ""
echo "  ${YELLOW}5)${NC} Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "${GREEN}🐳 Starting with Docker Compose...${NC}"
        echo ""
        
        # Check if Docker is running
        if ! docker info > /dev/null 2>&1; then
            echo "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
            exit 1
        fi
        
        # Build and start containers
        docker-compose up -d --build
        
        echo ""
        echo "${GREEN}✅ Services started in Docker!${NC}"
        echo ""
        echo "📊 Access Points:"
        echo "   Frontend:    http://localhost:3000"
        echo "   Backend API: http://localhost:8000"
        echo "   API Docs:    http://localhost:8000/docs"
        echo ""
        echo "📝 Useful Commands:"
        echo "   View logs:        docker-compose logs -f"
        echo "   View backend:     docker-compose logs -f backend"
        echo "   View frontend:    docker-compose logs -f frontend"
        echo "   Stop services:    docker-compose down"
        echo "   Restart:          docker-compose restart"
        echo ""
        ;;
        
    2)
        echo ""
        echo "${GREEN}💻 Starting Local Development...${NC}"
        echo ""
        
        # Check if virtual environment exists
        if [ ! -d "backend/venv" ]; then
            echo "${YELLOW}⚠️  Setting up Python virtual environment...${NC}"
            cd backend
            python3 -m venv venv
            source venv/bin/activate
            pip install -r requirements.txt
            cd ..
        fi
        
        # Check if node_modules exists
        if [ ! -d "frontend/node_modules" ]; then
            echo "${YELLOW}⚠️  Installing Node dependencies...${NC}"
            cd frontend
            npm install
            cd ..
        fi
        
        # Kill any existing processes
        lsof -ti :8000 | xargs kill -9 2>/dev/null
        lsof -ti :3000 | xargs kill -9 2>/dev/null
        
        # Start backend
        echo "${GREEN}📦 Starting Backend (Port 8000)...${NC}"
        cd backend
        source venv/bin/activate
        PYTHONPATH=$(pwd) python -m uvicorn app.main:app --reload --port 8000 > ../backend.log 2>&1 &
        BACKEND_PID=$!
        cd ..
        
        # Wait for backend to start
        sleep 3
        
        # Start frontend
        echo "${GREEN}⚛️  Starting Frontend (Port 3000)...${NC}"
        cd frontend
        npm run dev > ../frontend.log 2>&1 &
        FRONTEND_PID=$!
        cd ..
        
        echo ""
        echo "${GREEN}✅ Local development servers started!${NC}"
        echo ""
        echo "📊 Access Points:"
        echo "   Frontend:    http://localhost:3000"
        echo "   Backend API: http://localhost:8000"
        echo "   API Docs:    http://localhost:8000/docs"
        echo ""
        echo "📝 Logs:"
        echo "   Backend:  tail -f backend.log"
        echo "   Frontend: tail -f frontend.log"
        echo ""
        echo "⚠️  Processes running in background"
        echo "   Backend PID: $BACKEND_PID"
        echo "   Frontend PID: $FRONTEND_PID"
        echo ""
        ;;
        
    3)
        echo ""
        echo "${YELLOW}🛑 Stopping all services...${NC}"
        
        # Stop Docker containers
        docker-compose down 2>/dev/null
        
        # Stop local processes
        lsof -ti :8000 | xargs kill -9 2>/dev/null
        lsof -ti :3000 | xargs kill -9 2>/dev/null
        
        echo "${GREEN}✅ All services stopped${NC}"
        echo ""
        ;;
        
    4)
        echo ""
        echo "${BLUE}📝 Available Logs:${NC}"
        echo ""
        echo "  ${YELLOW}1)${NC} Docker - All services"
        echo "  ${YELLOW}2)${NC} Docker - Backend only"
        echo "  ${YELLOW}3)${NC} Docker - Frontend only"
        echo "  ${YELLOW}4)${NC} Local - Backend log"
        echo "  ${YELLOW}5)${NC} Local - Frontend log"
        echo ""
        read -p "Choose log to view (1-5): " log_choice
        
        case $log_choice in
            1) docker-compose logs -f ;;
            2) docker-compose logs -f backend ;;
            3) docker-compose logs -f frontend ;;
            4) tail -f backend.log ;;
            5) tail -f frontend.log ;;
            *) echo "${RED}Invalid choice${NC}" ;;
        esac
        ;;
        
    5)
        echo ""
        echo "${GREEN}👋 Goodbye!${NC}"
        echo ""
        exit 0
        ;;
        
    *)
        echo ""
        echo "${RED}❌ Invalid choice. Please run again and select 1-5.${NC}"
        echo ""
        exit 1
        ;;
esac
