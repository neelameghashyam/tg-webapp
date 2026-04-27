#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "================================"
echo "TG Template Webapp - Development"
echo "================================"
echo ""

# Check for .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "ERROR: .env file not found"
    echo "Copy .env.example to .env and fill in the values"
    exit 1
fi

# Kill any existing dev servers
for port in 3001 5173; do
    pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "Killing existing process on port $port..."
        echo "$pids" | xargs kill 2>/dev/null || true
    fi
done

# Export env vars for child processes
set -a
source "$PROJECT_ROOT/.env"
set +a

# Check if node_modules exist
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend" && npm install
fi

if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend" && npm install
fi

echo ""
echo "Starting development servers..."
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo ""

# Check if npx is available for concurrently
if command -v npx &> /dev/null; then
    cd "$PROJECT_ROOT"
    npx concurrently \
        --names "frontend,backend" \
        --prefix-colors "cyan,yellow" \
        "cd frontend && npm run dev" \
        "cd backend && npm run dev"
else
    echo "Note: Install 'concurrently' for better output, or run in separate terminals:"
    echo "  Terminal 1: cd frontend && npm run dev"
    echo "  Terminal 2: cd backend && npm run dev"
    echo ""
    echo "Starting backend only..."
    cd "$PROJECT_ROOT/backend" && npm run dev
fi
