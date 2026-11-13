# WorkFlow Pro

A full-stack project management application built with React, Node.js, Express, and PostgreSQL.

WorkFlow Pro helps users manage their projects through secure authentication and an interactive dashboard.

## Features

### Authentication and Security
- User registration and login.
- Password hashing with bcrypt.
- JWT-based authentication.
- Protected routes.
- Input validation.
- Security headers with Helmet.
- API rate limiting.
- Centralized error handling.

### Project Management
- Create, view, update, and delete projects.
- Manage projects through an interactive dashboard.
- Associate projects with individual user accounts.

### User Experience
- User profile page.
- Responsive interface.
- React Router navigation.
- Mobile-friendly layouts.
- Reusable React components.

## Technology Stack

### Frontend
- React 19
- Vite
- JavaScript
- React Router
- CSS

### Backend
- Node.js
- Express 5
- PostgreSQL
- JSON Web Tokens
- bcrypt

### Development and Testing
- Git and GitHub
- Jest
- Supertest
- Oxlint
- Nodemon

## Project Structure

```text
workflow-pro/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── App.jsx
│   └── main.jsx
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── testes/
│   ├── schema.sql
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Install:
- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/michealealema/workflow-pro.git
cd workflow-pro
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
```

### 4. Create the PostgreSQL database

Create a database named `workflow_pro`:

```sql
CREATE DATABASE workflow_pro;
```

Exit PostgreSQL and return to the project root.

Initialize the database tables:

```bash
psql -U postgres -d workflow_pro -f server/schema.sql
```

Replace `postgres` with your PostgreSQL username if necessary.

### 5. Configure backend environment variables

From the `server` directory, create your environment file:

```powershell
copy .env.example .env
```

Configure `server/.env` with your own credentials:

```env
DB_USER=your_database_user
DB_HOST=localhost
DB_NAME=workflow_pro
DB_PASSWORD=your_database_password
DB_PORT=5432

JWT_SECRET=your_secure_random_secret

CLIENT_URL=http://localhost:5173

PORT=5000
```

Never commit your actual `.env` file or expose your credentials.

### 6. Configure frontend environment variables

In the project root, create a `.env` file using `.env.example` as a reference.

```env
VITE_API_URL=http://localhost:5000
```

### 7. Start the backend

From the `server` directory:

```bash
npm run dev
```

Backend address:

```text
http://localhost:5000
```

### 8. Start the frontend

Open a second terminal in the project root:

```bash
npm run dev
```

Frontend address:

```text
http://localhost:5173
```

## API Health Check

Check whether the backend is running:

```text
GET /api/health
```

Expected response:

```json
{
  "message": "WorkFlow Pro API is running!"
}
```

## Testing

Run backend tests from the project root:

```bash
npm test --prefix ./server -- --detectOpenHandles
```

Run frontend lint:

```bash
npm run lint
```

Build the frontend for production:

```bash
npm run build
```

## Environment Configuration

The application uses environment variables to separate local development settings from production configuration.

**Frontend**
- `VITE_API_URL`: Backend API base URL.

**Backend**
- `DB_USER`: PostgreSQL username.
- `DB_HOST`: Database host.
- `DB_NAME`: Database name.
- `DB_PASSWORD`: Database password.
- `DB_PORT`: PostgreSQL port.
- `JWT_SECRET`: Authentication signing secret.
- `CLIENT_URL`: Allowed frontend origin.
- `PORT`: Backend server port.

Never commit real environment files, passwords, or authentication secrets to GitHub.

## Future Improvements

- Production deployment.
- Automated deployment pipeline.
- Additional dashboard analytics.
- Improved application monitoring.
- More comprehensive integration testing.

## Author

**Micheale Alema**

Information Science Student | Full-Stack Developer in Progress

GitHub: https://github.com/Maykl-12

---

Built as a full-stack development learning and portfolio project.