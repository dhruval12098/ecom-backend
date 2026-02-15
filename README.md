# E-commerce Backend API

This is the backend API for the e-commerce application using Supabase.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
```bash
cp .env.example .env.local
```

### 3. Supabase Database Setup
Run the SQL script in `supabase/seed/seed-data.sql` in your Supabase SQL editor to create the required tables.

### 4. Development Server
```bash
npm run dev
```

## API Endpoints

### Hero Slides
- `GET /api/hero-slides` - Get all active hero slides
- `POST /api/hero-slides` - Create new hero slide
- `GET /api/hero-slides/[id]` - Get specific hero slide
- `PUT /api/hero-slides/[id]` - Update hero slide
- `DELETE /api/hero-slides/[id]` - Delete hero slide

## Project Structure
```
Backend/
├── api/routes/          # API route handlers
├── services/           # Business logic
├── supabase/          # Supabase configuration
├── types/             # TypeScript types
└── utils/             # Utility functions
```