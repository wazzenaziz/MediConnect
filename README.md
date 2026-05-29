# MediConnect

[![CI](https://github.com/wazzenaziz/MediConnect/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wazzenaziz/MediConnect/actions/workflows/ci.yml)
[![Deploy](https://github.com/wazzenaziz/MediConnect/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/wazzenaziz/MediConnect/actions/workflows/deploy.yml)
![Node](https://img.shields.io/badge/node-20.x-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/supabase-postgres-3ECF8E?logo=supabase&logoColor=white)
![Socket.io](https://img.shields.io/badge/socket.io-realtime-010101?logo=socket.io&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

> A medical appointment platform that helps patients reach the **right specialist faster** — by combining AI-assisted symptom triage with location-aware, real-time doctor availability.

## 🚀 Live demo

- **Frontend:** [medi-connect-nine-kappa.vercel.app](https://medi-connect-nine-kappa.vercel.app)
- **Backend:** [mediconnect-65qh.onrender.com](https://mediconnect-65qh.onrender.com) ([health check](https://mediconnect-65qh.onrender.com/api/health))

> **Note:** The backend runs on Render's free tier, which sleeps after 15 minutes of inactivity. The first request after sleep takes ~50 seconds to wake the instance — refresh once and subsequent requests are fast.

---

## The Problem

In most healthcare systems, the path from "I feel sick" to "I see the right doctor" looks like this:

> Patient feels sick → books a generalist → waits days for the appointment → generalist refers to a specialist → patient searches for that specialist → calls clinics one by one → finds an available slot → books a second appointment.

This costs **time, money, and an unnecessary first consultation** in cases where the issue clearly belongs to a specialist (dermatology, cardiology, pediatrics, etc.).

## The Solution

**MediConnect compresses that workflow into a single guided flow:**

1. The patient describes their symptoms.
2. AI-assisted triage suggests the most likely medical specialty *(planned, see Roadmap)*.
3. The platform shows the **nearest qualified specialists** with their **real-time availability**.
4. The patient books an appointment in one click — no phone calls, no clinic-by-clinic search.

The result: a shorter, smarter path from symptom to consultation.

---

## Project Status

All four planned phases are complete and live in production.

| Phase | Status |
|---|---|
| **Phase 1 — Backend API** (Node.js + Express + Supabase) | ✅ Complete |
| **Phase 2 — Frontend** (React + Vite + Tailwind) | ✅ Complete |
| **Phase 3 — AI Triage Integration** (Groq Llama 3.3 70B) | ✅ Complete |
| **Phase 4 — Deployment** (Vercel + Render + CI/CD) | ✅ Complete |

### Features shipped

| Feature | Implementation |
|---|---|
| **AI symptom triage** | Patient describes symptoms → backend calls Groq (Llama 3.3 70B) with a constrained system prompt and JSON-mode → returns one of 14 medical specialties with confidence and reasoning |
| **Proximity doctor search** | PostgreSQL Haversine RPC (`nearby_doctors`) computes distance in pure SQL, no PostGIS dependency. Leaflet + OpenStreetMap render the map with markers, popups, and a radius circle. Browser geolocation with Tunis-center fallback. |
| **Real-time appointments** | Socket.io server with JWT auth, per-user / per-doctor rooms. Patients get a toast when a doctor cancels; doctors get a toast when a patient books. Slot picker auto-refreshes when someone else takes a slot. |
| **Booking flow** | 14-day slot picker grouped morning / afternoon / evening. UTC-aware timezone handling for Africa/Tunis. Database-level concurrency safety via PostgreSQL `EXCLUDE` constraint. Cancel + Book-again with deduplication. |
| **Doctor dashboard** | Today's appointments widget, weekly schedule manager (table editor with lunch break + slot duration + validity range), full appointment lifecycle (pending → confirmed → completed → cancel), consultation notes (diagnosis + prescription + follow-up). |
| **Auth** | Supabase Auth with role-based routing (patient / doctor / admin). JWT in localStorage with automatic 401 logout. |
| **CI/CD** | GitHub Actions: lint + build on every push and PR; deploy to Vercel + Render gated on CI success; Dependabot for weekly dependency updates. |

---

## Tech Stack

**Backend**
- **Runtime:** Node.js + Express 5
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth (JWT)
- **Validation:** Zod (schema-based input validation as middleware)
- **Security:** Helmet, CORS, express-rate-limit
- **Logging:** Morgan
- **Development:** nodemon

**Frontend** *(planned)*
- React + Vite
- Tailwind CSS

**Infrastructure** *(planned)*
- Supabase (Postgres + Auth)
- A cloud platform for Node.js hosting (Railway / Render / Vercel)

---

## Project Structure

```
MediConnect/
└── backend/
    ├── migrations/              SQL migrations (numbered chronologically)
    ├── src/
    │   ├── config/              Supabase client initialization
    │   ├── controllers/         Request handlers (one file per resource)
    │   ├── middleware/          Authentication, role checks, validation
    │   ├── routes/              Express routers (one file per resource)
    │   ├── schemas/             Zod schemas for request validation
    │   ├── utils/               Shared helpers (e.g. authorization)
    │   ├── app.js               Express app: middleware + routes + error handler
    │   └── server.js            HTTP entry point
    ├── .env.example             Template for required environment variables
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- A **Supabase project** (free tier is sufficient)

### 1. Clone and install

```bash
git clone https://github.com/wazzenaziz/MediConnect.git
cd MediConnect/backend
npm install
```

### 2. Configure environment variables

Copy the template and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-or-anon-key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

You can find `SUPABASE_URL` and `SUPABASE_KEY` in your Supabase project settings under **API**.

### 3. Run database migrations

Migrations live in `backend/migrations/` and are numbered in the order they should be applied. Open each file in your Supabase **SQL Editor** and run them in numeric order:

```
001_initial_schema.sql
002_add_schedule_validity.sql
…
011_set_cascade_rules.sql
```

> Migrations are kept as a faithful history of the schema's evolution — including early decisions later corrected by subsequent migrations.

### 4. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

A health check is implicit — any request to a known route returns JSON; unknown routes return a clean 404.

---

## API Overview

All endpoints are prefixed with `/api`. Most endpoints require a JWT in the `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/auth/register` — Self-registration (creates a **patient** account)
- `POST /api/auth/login` — Returns a JWT

### Patients (self-managed; admin can list)
- `GET /api/patients` — List all patients *(admin)*
- `GET /api/patients/:id` — Get one patient *(self or admin)*
- `PATCH /api/patients/:id` — Update own profile
- `DELETE /api/patients/:id` — Delete patient *(admin)*

### Doctors
- `GET /api/doctors` — Browse doctors
- `GET /api/doctors/:id` — Get one doctor's profile
- `POST /api/doctors` — Create doctor profile *(admin)*
- `PATCH /api/doctors/:id` — Update doctor profile *(doctor self / admin)*
- `DELETE /api/doctors/:id` — Delete doctor *(admin)*

### Schedules (a doctor's recurring weekly availability)
- `GET /api/schedules` — List all *(admin)*
- `GET /api/schedules/doctor/:doctorId` — Get a doctor's schedules
- `POST /api/schedules` — Create *(doctor / admin)*
- `PATCH /api/schedules/:id` — Update *(doctor / admin)*
- `DELETE /api/schedules/:id` — Delete *(doctor / admin)*

### Appointments
- `GET /api/appointments` — List all *(admin)*
- `GET /api/appointments/:id` — Get one
- `GET /api/appointments/doctor/:doctorId` — Doctor's appointments
- `GET /api/appointments/patient/:patientId` — Patient's appointments
- `GET /api/appointments/available-slots/:doctorId` — **Computed** available slots for a date
- `POST /api/appointments` — Book an appointment *(patient)*
- `PATCH /api/appointments/:id/status` — Update status *(doctor / admin)*
- `PATCH /api/appointments/:id/cancel` — Cancel *(patient / admin)*

### Medical Notes
- `POST /api/notes` — Create note for an appointment *(doctor / admin)*
- `GET /api/notes/:id` — Get one
- `GET /api/notes/appointment/:appointmentId` — Notes for an appointment
- `GET /api/notes/patient/:patientId` — Patient's medical history *(patient / doctor / admin)*
- `PATCH /api/notes/:id` — Update *(doctor / admin)*
- `DELETE /api/notes/:id` — Delete *(doctor / admin)*

### Admin
- `GET /api/admin/stats` — Aggregate platform stats *(admin)*

---

## Architectural Notes

A few decisions worth understanding before reading the code:

### Hybrid inheritance for users
Patients and admins live in a shared `users` table with a `role` column (Single Table Inheritance). Doctors have their own `doctors` table linked via `user_id` (Class Table Inheritance), because only doctors carry domain-specific fields (specialty, clinic address, geolocation). This keeps lightweight roles cheap and gives doctors a clean place to grow.

### Double-booking prevented at the database level
The `appointments` table has a Postgres `EXCLUDE` constraint over `(doctor_id, time-range)` using a GIST index. Even under concurrent requests, two overlapping appointments for the same doctor cannot both succeed. The application layer also checks availability for UX, but **correctness is enforced by the database**.

### Cascade rules are intent-driven
Every foreign key declares an explicit `ON DELETE` rule:
- `CASCADE` where the child is meaningless without the parent (schedules, doctor profile, notes-to-appointment).
- `RESTRICT` where the child is **medical history** that must survive parent deletion (appointments and notes referencing doctors or patients).

This protects against accidental loss of medical records and supports retention requirements that outlive a user's account.

### Input validation as middleware
Each route validates `req.body` against a **Zod schema** before reaching the controller. Schemas live in `src/schemas/` and act as the contract for the endpoint. Invalid requests are rejected with a structured 400 response listing each failed field. Controllers only ever run on validated input.

### Friendly errors from database constraints
Foreign key violations (`23503`) and exclusion violations (`23P01`) are translated by the controllers into business-readable HTTP responses (409 Conflict) instead of leaking raw constraint names.

### Defense ordering
Route middleware runs in this order: **authenticate → role → validate → controller**. Cheap, universal checks (auth, role) run before expensive, request-specific checks (full body parse). Rejected requests are rejected as early as possible.

---

## CI / CD

This repository ships two GitHub Actions workflows:

- **[`.github/workflows/ci.yml`](.github/workflows/ci.yml)** — runs on every push and pull request. Two parallel jobs:
  - `frontend`: install → ESLint → `vite build` (catches broken imports before Vercel builds)
  - `backend`: install → `node --check` over every `.js` file (catches syntax errors before Render boots)
- **[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)** — triggers on successful CI run on `main`. POSTs to Vercel and Render deploy hooks. Concurrency-limited so back-to-back pushes don't queue obsolete deploys.

Dependabot ([`.github/dependabot.yml`](.github/dependabot.yml)) groups weekly minor/patch bumps for `frontend/`, `backend/`, and the GitHub Actions themselves.

## Roadmap (post-defense)

- TypeScript migration
- Automated tests (Jest + Supertest for backend, Vitest + Testing Library for frontend)
- Row-Level Security policies in Supabase as a second auth layer
- Email / SMS appointment reminders (24h + 1h before)
- Doctor verification workflow (license number check)
- Admin dashboard (user management, platform stats)
- Mobile-first refinements + native app via Capacitor

---

## Author

**Mohamed Aziz Wazzeni** — PFA project, 2026.

This project is submitted as a Projet de Fin d'Année (PFA) and is part of a larger plan to learn full-stack delivery end-to-end: from database design through API hardening, to UI implementation, third-party AI integration, and production deployment.

---

## License

This project is for academic and portfolio purposes. No license is granted for commercial use without explicit permission.
