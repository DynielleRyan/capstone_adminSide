# Pharmacy Admin Dashboard

A comprehensive pharmacy management system built with React, TypeScript, Express, and Supabase.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, DaisyUI, Axios
- **Backend**: Node.js, Express, TypeScript, Supabase
- **Database**: Supabase (PostgreSQL)
- **Development**: Nodemon, ESLint

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd capstone_adminSide
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Copy your project URL and API keys
   - Run the SQL schema from `backend/database/schema.sql` in your Supabase SQL editor

4. **Configure environment variables**
   
   **Backend** (create `backend/.env`):
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_jwt_secret
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```

   **Frontend** (create `frontend/.env`):
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:5000/api
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   Server will run on http://localhost:5000

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on http://localhost:3000

### Project Structure

```
capstone_adminSide/
├── frontend/          # React/TypeScript frontend
├── backend/           # Express/Node.js backend
└── README.md
```

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint

**Frontend:**
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Database Schema

The application uses a comprehensive database schema designed for pharmacy management, including:
- User management with pharmacist roles
- Product inventory with stock tracking
- Customer management
- Transaction processing
- Purchase orders
- Discount management

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Support

For questions or issues, please create an issue in the repository.
