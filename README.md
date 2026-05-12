# CampusConnect Project

CampusConnect is a role-based web application for students and administrators.
This project uses a simple HTML/CSS/JavaScript frontend and a Node.js + Express backend with MongoDB Atlas.

## Features

- Student/Admin registration and login
- Student dashboard with assignments and job opportunities
- Admin panel to manage students, assignments, and jobs
- Role-based access control using JWT
- MongoDB Atlas database integration

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a MongoDB Atlas database:
   - Go to https://www.mongodb.com/cloud/atlas and sign up for a free account.
   - Create a new cluster and database user.
   - Allow your IP address in Network Access.
   - Copy the connection string (URI) from the Atlas dashboard.
3. Create your `.env` file:
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and replace values:
   ```text
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```
5. Open the frontend:
   - Open `frontend/index.html` in your browser.
   - Or use a simple HTTP server if you prefer.

## Notes

- The backend runs on port 5000 by default.
- The frontend uses static HTML pages and JavaScript to talk to backend APIs.
- Use GitHub for version control and commit often with clear messages.
