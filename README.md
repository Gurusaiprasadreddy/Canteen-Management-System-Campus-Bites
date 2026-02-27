# Canteen Management System - Campus Bites
An advanced, real-time platform that streamlines canteen operations for universities, allowing students to order food seamlessly and vendors to manage orders efficiently with AI-powered recommendations and automated payments.

## Table of Contents
- [Quick Start](#quick-start)
- [Overview](#overview)
- [Application URLs](#application-urls)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Database Seeding](#database-seeding)
- [API Overview](#api-overview)
- [Development Guidelines](#development-guidelines)
- [Important Notes](#important-notes)

## Quick Start
### Prerequisites
- **Python 3.8+**
- **Node.js 18+**
- **MongoDB** (Local or Atlas)

### Swift Run (Windows Only)
You can set up and run the entire system in minutes using the provided PowerShell script (assuming local MongoDB is running):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start_app.ps1
```

Access the apps:
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:8001/docs`

## Overview
### Features
#### For Students & Staff
- **Smart Ordering**: Browse menus, customize items, and add to cart for instant checkout.
- **Real-Time Tracking**: Get live updates on order status (Pending, Preparing, Ready, Picked Up) via WebSockets.
- **AI Recommendations**: Personalized meal suggestions based on purchase history and popular items.
- **Digital Payments**: Secure integration with Stripe/Razorpay for cashless transactions.
- **Feedback & Ratings**: Rate meals and provide feedback to canteens.

#### For Canteens (Vendors)
- **Order Dashboard**: Accept, reject, and update the status of active orders in real-time.
- **Menu Management**: Add, update, or remove food items and mark them as out of stock instantly.
- **Financial Analytics**: Track daily earnings, popular items, and total orders completed.
- **Profile Configuration**: Set opening/closing hours and operational status.

#### For Admins
- **Global Dashboard**: Monitor system activity, user growth, and total revenue across all canteens.
- **User & Vendor Management**: Approve new canteens, manage student accounts, and suspend users if necessary.
- **System Settings**: Configure platform-wide rules, payment gateway settings, and notifications.

### 📚 Documentation
| Document | Description |
|---|---|
| `README.md` | System architecture and setup instructions |
| `frontend/README.md` | Specific frontend guidelines and UI structure |
| `backend/test_results.txt` | Latest testing outputs and coverage |
| `PAYMENT_TESTING_GUIDE.md` | Guide for testing Stripe & Razorpay workflows |
| `auth_testing.md` | Testing strategies for JWT Authentication |

### Tech Stack
| Component | Technology |
|---|---|
| Frontend App | React.js (CRACO) + TailwindCSS + Radix UI + Framer Motion |
| Backend API | FastAPI + Motor (MongoDB Async) + Uvicorn |
| Database | MongoDB |
| Real-time Updates | Socket.IO (Python & Client) |
| Payment Gateway | Stripe / Razorpay |
| AI Integration | Google GenAI / LiteLLM / OpenAI |

## Application URLs
| Application | Local URL | Description |
|---|---|---|
| Backend API | `http://localhost:8001/docs` | FastAPI Server & Swagger Interactive Docs |
| Frontend App | `http://localhost:3000` | Web App for Students, Canteens, and Admins |
| Database | `mongodb://localhost:27017` | Local MongoDB Connection (if used) |

## Running the Application
### 1. Database Setup (MongoDB)
**Windows**
- Download and install MongoDB Community Server: https://www.mongodb.com/try/download/community
- Start the MongoDB service if it isn't running automatically.
- Default port is `27017`.
- Create a database named `campus_bites` (this happens automatically on first connect).

### 2. Backend Setup
Open a new terminal (e.g., PowerShell) and run:

```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn server:socket_app --host 0.0.0.0 --port 8001 --reload
```
API docs available at: `http://localhost:8001/docs`

### 3. Frontend App
Open a separate terminal and run:

```powershell
cd frontend

# Install dependencies (use legacy-peer-deps to avoid conflicts)
npm install --legacy-peer-deps

# Start dev server
npm start
```
App available at: `http://localhost:3000`

## Environment Variables
Create a `.env` file in the `backend/` directory based on required variables.
| Variable | Description | Example |
|---|---|---|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `JWT_SECRET` | Secret for encoding JWT tokens | `your-super-secret-key-here` |
| `STRIPE_API_KEY` | Secret Key for Stripe checkout | `sk_test_...` |
| `RAZORPAY_API_KEY` | API Key for Razorpay checkout | `rzp_test_...` |
| `AI_API_KEY` | Key for AI features (OpenAI/Google) | `your-api-key-here` |

## Testing
### Backend (FastAPI & Pytest)
```powershell
cd backend
# Run Pytest tests
pytest
```
### Frontend (React / Jest)
```powershell
cd frontend
# Run tests
npm test
```

## Database Seeding
To populate the database with initial admin, canteens, items, and dummy users:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python seed_data.py
```
*Note: Make sure your MongoDB service is running before executing.*

### Default Credentials (After Seeding)
| Role | Email | Password |
|---|---|---|
| Admin | admin@campusbites.com | admin123 |
| Canteen | canteen1@example.com | canteen123 |
| Canteen | canteen2@example.com | canteen123 |
| Student | student1@example.com | student123 |

⚠️ **Change these credentials in production environments!**

## API Overview
FastAPI auto-generates interactive API documentation natively.
Access it via: **`http://localhost:8001/docs`**

Core API route groupings include:
- `POST /auth/login` (Authentication)
- `GET /canteens` (Browse vendors)
- `GET /menu/{canteen_id}` (Browse items)
- `POST /orders` (Place an order)
- `PATCH /orders/{order_id}/status` (Update order status - Canteen only)

## Development Guidelines
### App Screens
- **Auth**: Login, Register (Student/Vendor), Forgot Password
- **Student**: Home (Dashboard), Canteen Menus, Item Details, Cart, Checkout, Order History
- **Canteen**: Active Orders, Menu Editor, Financials, Profile Settings
- **Admin**: Global Overview, Manage Canteens, Manage Users

## Important Notes
- **WebSockets**: The platform heavily relies on Socket.IO for real-time notifications about order state progression.
- **Payment Modes**: The logic can toggle between Razorpay / Stripe depending on the user's region or platform preferences.
- **AI Integrations**: Requires setting appropriate provider API keys in the `.env` file for generating recommendations.
