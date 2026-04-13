# 🚀 SQLLens AI: SQL Query Optimizer Visualizer

A premium, interactive tool to visualize PostgreSQL execution plans and get AI-powered optimization suggestions.

## 📁 Project Structure

- **`client/`**: Next.js (App Router) frontend with interactive D3/React Flow visualizations.
- **`server/`**: Express.js backend for PostgreSQL query analysis.
- **`db/`**: SQL scripts and schema definitions.

## 🛠 Tech Stack

- **Frontend**: Next.js, React Flow, Lucide Icons, Framer Motion, Tailwind CSS.
- **Backend**: Node.js, Express, `pg` (PostgreSQL client).
- **Visualization**: Interactive tree nodes with cost and time metrics.

## 🚀 Getting Started

### 1. Prerequisites
- PostgreSQL running locally or on a server.
- Node.js (v18+ recommended).

### 2. Database Setup
Create a database named `sqlens` and run the schema found in `db/schema.sql`.

### 3. Environment Configuration
Update weights and credentials in `server/.env`:
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=sqlens
DB_PASSWORD=your_password
DB_PORT=5432
```

### 4. Installation & Running
From the root directory:
```bash
# Install root dependencies
npm install

# Install all sub-project dependencies
npm run install:all

# Start both frontend and backend
npm run dev
```

## 🧠 Key Features

- **EXPLAIN ANALYZE Integration**: Get real-time execution timing, not just estimates.
- **Visual Plan Tree**: Interactive visualization of nested loop joins, sequential scans, and index lookups.
- **Optimizer Insights**: Automatic detection of performance bottlenecks (e.g., missing indexes).
- **Query History**: Keep track of your analysis history and performance improvements.
- **Security First**: Only allows `SELECT` and `READ` queries for safe analysis.

---
Built with ❤️ by SQLLens Team
