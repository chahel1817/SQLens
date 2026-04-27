# 🚀 SQLens: Ultimate SQL Performance Analyzer

![SQLens Dashboard Preview](https://chaheltanna.vercel.app/SQLens.png)

**SQLens** is an advanced, production-grade web application designed to help developers and database engineers analyze, optimize, and visualize SQL query performance in real time. Built with a stunning dark mode glassmorphism UI and powered by a robust Next.js and Node/Express architecture, SQLens provides a dedicated "sandbox" environment for every user, allowing them to write and test queries safely without cross-tenant interference.

## ✨ Key Features

- **🛡️ Private User Sandboxes**: Automatic provisioning of an isolated PostgreSQL `SCHEMA` for every user upon registration.
- **⚡ Multi-tenant Architecture**: Intelligent backend middleware that dynamically isolates and switches the database `search_path` per authenticating user.
- **🧠 Deep AI Optimization**: Integrated query execution plan parser coupled with deep AI analysis to proactively suggest performance fixes.
- **📊 Real-time Telemetry Dashboard**: Live database metrics, Slow Query tracking, index hit rate, and throughput trends stream directly to a responsive UI via SSE.
- **🔐 Secure Authentication**: Handled securely via stateless JSON Web Tokens (JWT) and Bcrypt.js password hashing.
- **🎨 Premium Visual Experience**: A stunning, responsive UI built with Next.js, featuring dynamic themes, smooth micro-animations, and a Monaco-powered SQL editor.

## 🏗️ Technology Stack

- **Frontend**: Next.js 15, React, Monaco Editor, CSS Modules (Glassmorphism & Neon aesthetics)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Multi-schema isolated environments)
- **Security**: JWT, Bcrypt.js

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+) running locally or accessible via URL

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Database Setup
Launch your PostgreSQL terminal and execute:
```sql
CREATE DATABASE sql_optimizer;
```
Then, initialize the database schema by importing `db/init.sql`.

### 4. Configuration
Create a `.env` file in the `server/` directory:
```env
PORT=5000
DATABASE_URL=postgres://your_user:your_password@localhost:5432/sql_optimizer
JWT_SECRET=your_super_secret_key
```

And in `client/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 5. Launch the Application
Start the backend API:
```bash
cd server
npm run dev
```

Start the Next.js Client:
```bash
cd client
npm run dev
```

Visit `http://localhost:3000` to access the SQLens dashboard.

## 📈 Roadmap

- [x] Backend Auth & Secure Schema Provisioning
- [x] Query Execution & Sandboxed Engine
- [x] EXPLAIN ANALYZE Parsing & Intelligence
- [x] AI-Powered Optimization Suggestions
- [x] Interactive Real-time Telemetry Dashboard (SSE)
- [ ] Automated Index Suggestion Engine
- [ ] Export Analytics & PDF Reports

---
*Architected and developed by [Chahel Tanna](https://chaheltanna.vercel.app/). Built for Database Engineers who care about performance.*
