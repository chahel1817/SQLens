# 🚀 SQLens: SQL Performance Analyzer

**SQLens** is a powerful web application designed to help developers analyze, optimize, and visualize SQL query performance. It provides a unique "sandbox" environment for every user, allowing them to write and test queries safely without interfering with others.

## ✨ Current Features

- **🔐 Secure Authentication**: Full JWT-based signup and login system.
- **🛡️ Private User Sandboxes**: Automatic creation of a dedicated PostgreSQL `SCHEMA` for every new user upon registration.
- **⚡ Multi-tenant Architecture**: Middleware that dynamically switches the database `search_path` based on the authenticated user.
- **🛠️ Backend Core**: Robust Express.js API with a PostgreSQL connection pool.

## 🏗️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Security**: JWT (JSON Web Tokens), Bcrypt.js (Password Hashing)
- **Frontend**: Next.js (Coming Soon)

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- PostgreSQL installed and running

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>

# Install server dependencies
cd server
npm install
```

### 3. Database Setup
Run the following SQL in your PostgreSQL terminal:
```sql
CREATE DATABASE sqlens;
-- Followed by the schema provided in db/init.sql
```

### 4. Configuration
Create a `.env` file in the `server/` directory:
```env
PORT=5000
DATABASE_URL=postgres://your_user:your_password@localhost:5432/sqlens
JWT_SECRET=your_secret_key
```

### 5. Start the Server
```bash
npm run dev
```

## 📈 Roadmap
- [x] Backend Auth & Schema Provisioning
- [ ] Query Execution Engine
- [ ] EXPLAIN ANALYZE Parser
- [ ] SQL Optimization Suggestions
- [ ] Interactive Dashboard (Frontend)

---
Developed by [Your Name]
