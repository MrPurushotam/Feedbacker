# Feedback Form Application

A full-stack web application for creating, managing, and collecting feedback through customizable forms. Built with React (frontend) and Node.js/Express (backend) with PostgreSQL database.

## 🚀 Features

- **User Authentication**: Secure login/signup system with JWT tokens
- **Form Management**: Create, edit, and delete feedback forms
- **Dynamic Questions**: Support for multiple question types (text, email, textarea, checkbox)
- **Public/Private Forms**: Control form visibility and access
- **Real-time Responses**: Collect and view form responses instantly
- **Responsive Design**: Modern UI that works on all devices
- **Analytics Dashboard**: View form statistics and response counts

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Styling and responsive design

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Zod** - Schema validation

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v14 or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** database server

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Feedbacker
```

### 2. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Create a `.env` file in the backend directory with the following variables:
```env
# Database Configuration
DB_CONNECTION_STRING="postgresql://username:password@localhost:5432/feedback_db" 
JWT_SECRET="qwqwqw"
ALLOWED_ORIGIN="http://localhost:5173,"
PORT=3000
```

Start the backend server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The backend server will run on `http://localhost:3000`

### 3. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Create a `.env` file in the frontend directory (optional):
```env
VITE_SERVER_URL=http://localhost:3000/api/v1/
```

Start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 📡 Backend API Routes

### Authentication Routes (`/api/v1/user`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/user/create` | Register a new user | No |
| POST | `/api/v1/user/login` | Login user | No |
| GET | `/api/v1/user/` | Get user profile | Yes |

### Form Routes (`/api/v1/feedback`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/feedback/all` | Get all user's forms | Yes |
| GET | `/api/v1/feedback/:id` | Get specific form by ID | Optional* |
| POST | `/api/v1/feedback/create` | Create new form | Yes |
| PATCH | `/api/v1/feedback/:id` | Update form details | Yes |
| DELETE | `/api/v1/feedback/:id` | Delete form | Yes |
| GET | `/api/v1/feedback/detail/:id` | Get form detail | Yes |

*Optional auth: Public forms accessible without auth, private forms require ownership

### Question Routes (`/api/v1/questions`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| PATCH | `/api/v1/questions/:id` | Update question | Yes |
| DELETE | `/api/v1/questions/:id` | Delete question | Yes |

### Response Routes (`/api/v1/response`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/response/:formId` | Submit form response | No |
| GET | `/api/v1/response/all/:formId` | Get 20 recent form responses | Yes |

## 🖥️ Frontend Pages

### Public Pages

#### Home (`/`)
- **Purpose**: Landing page for the application
- **Features**:
  - Hero section with call-to-action
  - Features showcase
  - How it works section
  - Customer testimonials
  - Footer with links
- **Access**: Public (no authentication required)

#### Login (`/login`)
- **Purpose**: User authentication (login/signup)
- **Features**:
  - Toggle between login and signup modes
  - Redirect to dashboard after successful login
- **Access**: Public

#### Form (`/form/:id`)
- **Purpose**: Public form filling page
- **Features**:
  - Display form questions
  - Handle different question types
  - Form submission with validation
  - Thank you modal after submission
- **Access**: Public (for public forms)

### Protected Pages (Require Authentication)

#### Dashboard (`/dashboard`)
- **Purpose**: Main user dashboard
- **Features**:
  - List all user's forms
  - Quick actions (edit, delete, view responses)
  - Create new form button
- **Access**: Authenticated users only

#### EditForm (`/edit-form/:id?`)
- **Purpose**: Create new form or edit existing form
- **Features**:
  - Form title and description editing
  - Add/remove questions
  - Question type selection (text, email, textarea, checkbox, url, etc)
  - Option management for checkbox questions
  - Public/private form settings
- **Access**: Authenticated users only (can only edit own forms)

#### Details (`/details/:id`)
- **Purpose**: View form details and responses
- **Features**:
  - Form information display
  - All form responses listing
  - Response pagination
  - Response statistics
- **Access**: Authenticated users only (can only view own form responses)

## 📊 Database Schema

### Tables

#### users
- `id` - Primary key
- `name` - User's full name
- `email` - User's email (unique)
- `password` - Hashed password
- `is_verified` - Email verification status
- `created_at` - Account creation timestamp

#### forms
- `id` - Primary key
- `title` - Form title
- `description` - Form description
- `user_id` - Foreign key to users table
- `is_public` - Public/private form flag
- `closed` - Form status (open/closed)
- `created_at` - Form creation timestamp

#### questions
- `id` - Primary key
- `form_id` - Foreign key to forms table
- `question_text` - Question content
- `question_type` - Type (text, email, textarea, checkbox)
- `is_required` - Required field flag
- `order_index` - Question order in form

#### options
- `id` - Primary key
- `question_id` - Foreign key to questions table
- `option_text` - Option content
- `order_index` - Option order

#### responses
- `id` - Primary key
- `form_id` - Foreign key to forms table
- `question_id` - Foreign key to questions table
- `response_text` - User's response
- `submitted_at` - Response timestamp

## 🔐 Authentication Flow

1. User registers/logs in through `/login` page
2. JWT token is generated and stored in localStorage
3. Token is automatically included in API requests via axios interceptor
4. Protected routes verify token using `authMiddleware`
5. Frontend redirects to login if token is invalid/expired

## 👨‍💻 Author

**Purshotam Jeswani**
