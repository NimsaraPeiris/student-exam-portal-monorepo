# Exam Practice Platform

A modern, full-stack MCQ exam practice platform built with a microservices architecture on Cloudflare's edge network.

## 🏗️ Architecture

This project is a monorepo powered by **Turborepo** and **pnpm workspaces**, structured as follows:

### Applications (`/apps`)
- **[Portal](file:///c:/Users/Nimsara/Projects/SE_Assesment/apps/portal)**: Next.js 15 Student Portal. Features paper browsing, real-time exam taking, and results dashboard. Built with Ant Design 5 and TanStack Query.
- **[Admin](file:///c:/Users/Nimsara/Projects/SE_Assesment/apps/admin)**: PayloadCMS 3.0 Admin Dashboard. Manage exam papers, questions, and students via a premium headless CMS interface.

### Services (`/services`)
- **[API Gateway](file:///c:/Users/Nimsara/Projects/SE_Assesment/services/api-gateway)**: Central entry point (Hono/Cloudflare Worker) handling CORS, JWT validation, and service routing.
- **[Auth Service](file:///c:/Users/Nimsara/Projects/SE_Assesment/services/auth-svc)**: Manages registration, login, and token rotation.
- **[Papers Service](file:///c:/Users/Nimsara/Projects/SE_Assesment/services/papers-svc)**: High-performance paper browsing and filtering with edge caching.
- **[Exam Service](file:///c:/Users/Nimsara/Projects/SE_Assesment/services/exam-svc)**: Secure, server-authoritative exam sessions and scoring.

### Shared Packages (`/packages`)
- **[Database (@assessment/db)](file:///c:/Users/Nimsara/Projects/SE_Assesment/packages/db)**: Drizzle ORM schemas, migrations, and seed scripts.
- **[Types (@assessment/types)](file:///c:/Users/Nimsara/Projects/SE_Assesment/packages/types)**: Shared TypeScript interfaces used across frontend and backend.
- **[Utils (@assessment/utils)](file:///c:/Users/Nimsara/Projects/SE_Assesment/packages/utils)**: Common helper functions.

## 🚀 Tech Stack
- **Frontend**: Next.js 15 (App Router), Ant Design 5, Zustand, TanStack Query.
- **CMS**: PayloadCMS 3.0.
- **Backend**: Cloudflare Workers + Hono Framework (TypeScript).
- **Database**: PostgreSQL (via Neon Serverless) + Drizzle ORM.
- **Infrastructure**: Cloudflare KV (Caching/Sessions), Turborepo.

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (v10)
- wrangler (for Cloudflare development)

### Setup
1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Environment Variables**:
   Copy the `.env.example` files in each app/service to `.env` and provide your Neon Database URL and other secrets.

3. **Database Setup**:
   ```bash
   pnpm --filter @assessment/db run db:generate
   pnpm --filter @assessment/db run db:migrate
   ```

4. **Running Locally**:
   Start the entire stack (Portal, Admin, and all Microservices) in development mode:
   ```bash
   pnpm run dev
   ```

## 📜 Key Endpoints
- **Portal URL**: `http://localhost:3000`
- **Admin Dashboard**: `http://localhost:3000/admin` (within the admin app)
- **API Gateway**: `http://localhost:8080` (routes to sub-services)
