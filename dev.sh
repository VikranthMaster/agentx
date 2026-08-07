#!/usr/bin/env bash

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}  Starting Smart Campus ERP Multi-Agent System       ${NC}"
echo -e "${CYAN}====================================================${NC}"

# 1. Start FastAPI Backend from backend directory
echo -e "${GREEN}[1/2] Launching FastAPI Backend on http://localhost:8000...${NC}"
(cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

# 2. Start Vite Frontend
echo -e "${GREEN}[2/2] Launching Vite React Frontend on http://localhost:3000...${NC}"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Cleanup function to kill background servers when Ctrl+C is pressed
cleanup() {
    echo -e "\n${RED}Shutting down FastAPI (PID: $BACKEND_PID) and Vite (PID: $FRONTEND_PID)...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Catch SIGINT and SIGTERM signals
trap cleanup SIGINT SIGTERM

echo -e "${CYAN}Servers are running! Press Ctrl+C to terminate.${NC}"

# Wait indefinitely until interrupted
wait
