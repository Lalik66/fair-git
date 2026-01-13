#!/bin/bash

# Fair Marketplace - Development Environment Setup Script
# This script sets up and runs the development environment for the Fair Marketplace application

set -e

echo "=========================================="
echo "  Fair Marketplace - Development Setup"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for required tools
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v) found"

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    print_success "npm $(npm -v) found"

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL client (psql) not found in PATH. Make sure PostgreSQL 15+ is installed and running."
    else
        print_success "PostgreSQL client found"
    fi

    echo ""
}

# Create environment file if it doesn't exist
setup_environment() {
    print_status "Setting up environment variables..."

    if [ ! -f ".env" ]; then
        print_status "Creating .env file from template..."
        cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fair_marketplace?schema=public"

# First Admin Account (created on first startup)
FIRST_ADMIN_EMAIL="admin@fairmarketplace.com"
FIRST_ADMIN_PASSWORD="AdminPass123!"
FIRST_ADMIN_FIRSTNAME="Admin"
FIRST_ADMIN_LASTNAME="User"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Cloudinary Configuration (for image storage)
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Mapbox Configuration
MAPBOX_TOKEN="your-mapbox-token"

# Email Service Configuration
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@example.com"
EMAIL_PASSWORD="your-email-password"
EMAIL_FROM="noreply@fairmarketplace.com"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Application Configuration
NODE_ENV="development"
PORT="3001"
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"

# Session Configuration
SESSION_SECRET="your-session-secret-change-in-production"
EOF
        print_success ".env file created. Please update with your actual credentials."
    else
        print_success ".env file already exists"
    fi

    echo ""
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."

    # Install backend dependencies
    if [ -d "backend" ]; then
        print_status "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
        print_success "Backend dependencies installed"
    fi

    # Install frontend dependencies
    if [ -d "frontend" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    fi

    # If no separate dirs, install from root
    if [ -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
        npm install
        print_success "Dependencies installed"
    fi

    echo ""
}

# Setup database
setup_database() {
    print_status "Setting up database..."

    # Check if Prisma is available
    if [ -d "backend" ]; then
        cd backend
    fi

    if [ -f "prisma/schema.prisma" ]; then
        print_status "Running Prisma migrations..."
        npx prisma migrate dev --name init 2>/dev/null || npx prisma db push
        print_success "Database schema applied"

        print_status "Generating Prisma client..."
        npx prisma generate
        print_success "Prisma client generated"
    else
        print_warning "Prisma schema not found. Database setup will be done later."
    fi

    if [ -d "../backend" ]; then
        cd ..
    fi

    echo ""
}

# Start development servers
start_servers() {
    print_status "Starting development servers..."
    echo ""

    # Check if we have separate frontend/backend
    if [ -d "backend" ] && [ -d "frontend" ]; then
        echo "=========================================="
        echo "  Starting Backend and Frontend Servers"
        echo "=========================================="
        echo ""
        echo "Run these commands in separate terminals:"
        echo ""
        echo "  Terminal 1 (Backend):"
        echo "    cd backend && npm run dev"
        echo ""
        echo "  Terminal 2 (Frontend):"
        echo "    cd frontend && npm run dev"
        echo ""
        echo "Or use the concurrent start command:"
        echo "    npm run dev"
        echo ""

        # Start both if concurrently is available
        if npm list concurrently &>/dev/null 2>&1; then
            npm run dev
        else
            print_status "Starting backend server..."
            cd backend && npm run dev &
            BACKEND_PID=$!
            cd ..

            print_status "Starting frontend server..."
            cd frontend && npm run dev &
            FRONTEND_PID=$!
            cd ..

            wait $BACKEND_PID $FRONTEND_PID
        fi
    elif [ -f "package.json" ]; then
        npm run dev
    else
        print_warning "No package.json found. Please set up the project first."
    fi
}

# Print access information
print_access_info() {
    echo ""
    echo "=========================================="
    echo "  Fair Marketplace - Access Information"
    echo "=========================================="
    echo ""
    echo "  Frontend:        http://localhost:3000"
    echo "  Backend API:     http://localhost:3001"
    echo "  API Docs:        http://localhost:3001/api-docs (if enabled)"
    echo ""
    echo "  Default Admin:"
    echo "    Email:    admin@fairmarketplace.com"
    echo "    Password: AdminPass123!"
    echo ""
    echo "  Note: Change default credentials in .env before production!"
    echo ""
    echo "=========================================="
    echo ""
}

# Main execution
main() {
    # Get the script's directory and change to project root
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"

    echo ""
    check_prerequisites
    setup_environment
    install_dependencies
    setup_database
    print_access_info

    # Ask if user wants to start servers
    read -p "Do you want to start the development servers now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_servers
    else
        echo ""
        echo "To start the servers later, run:"
        echo "  npm run dev"
        echo ""
        echo "Or for individual servers:"
        echo "  cd backend && npm run dev"
        echo "  cd frontend && npm run dev"
        echo ""
    fi
}

# Run main function
main "$@"
