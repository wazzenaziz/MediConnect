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
2. AI-assisted triage suggests the most likely medical specialty.
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
| **AI symptom triage** | Patient describes symptoms → backend calls Groq (Llama 3.3 70B) with a constrained system prompt and JSON-mode → returns one of 14 medical specialties with confidence and reasoning. |
| **Proximity doctor search** | PostgreSQL Haversine RPC (`nearby_doctors`) computes distance in pure SQL, no PostGIS dependency. Leaflet + OpenStreetMap render the map with markers, popups, and a radius circle. Browser geolocation with a Tunis-center fallback. |
| **Real-time appointments** | Socket.io server with JWT auth and per-user / per-doctor rooms. Patients get a toast when a doctor cancels; doctors get a toast when a patient books. The slot picker auto-refreshes when someone else takes a slot. |
| **Booking flow** | 14-day slot picker grouped morning / afternoon / evening. UTC-aware timezone handling for Africa/Tunis. Database-level concurrency safety via a PostgreSQL `EXCLUDE` constraint. Cancel + book-again with deduplication. |
| **Patient experience** | Triage → doctor search → profile → booking → appointment history, plus profile editing and medical-history view. |
| **Doctor dashboard** | Today's appointments widget, weekly schedule manager (table editor with lunch break + slot duration + validity range), full appointment lifecycle (pending → confirmed → completed → cancel), and consultation notes (diagnosis + prescription + follow-up). |
| **Admin dashboard** | Platform stats, patient and doctor management, appointment oversight, and an email-template editor. Doctors are provisioned by admins and emailed their credentials on creation. |
| **Auth** | Supabase Auth with role-based routing (patient / doctor / admin). JWT in localStorage with automatic 401 logout. Forced password change on a doctor's first login. Optional Google sign-in. |
| **Transactional email** | Resend integration with database-backed, editable templates and a hardcoded fallback — used to send onboarded doctors their credentials. |
| **CI/CD** | GitHub Actions: lint + build on every push and PR; deploy to Vercel + Render gated on CI success; Dependabot for weekly dependency updates. |

---

## Tech Stack

**Backend**
- **Runtime:** Node.js 20 + Express 5
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth (JWT)
- **Realtime:** Socket.io
- **AI:** Groq API (Llama 3.3 70B) for symptom triage
- **Email:** Resend (transactional, DB-backed templates)
- **Validation:** Zod (schema-based input validation as middleware)
- **Security:** Helmet, CORS, express-rate-limit
- **Logging:** Morgan
- **Development:** nodemon

**Frontend**
- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS 4
- **Routing:** React Router 7
- **Maps:** Leaflet + React-Leaflet (OpenStreetMap tiles)
- **HTTP:** Axios
- **Realtime:** socket.io-client
- **Icons:** lucide-react

**Infrastructure**
- **Frontend hosting:** Vercel
- **Backend hosting:** Render
- **Database + Auth:** Supabase Cloud
- **CI/CD:** GitHub Actions + Dependabot

---

## Project Structure

```
MediConnect/
├── backend/
│   ├── migrations/             SQL migrations (numbered chronologically)
│   ├── src/
│   │   ├── config/             Supabase client initialization
│   │   ├── controllers/        Request handlers (one file per resource)
│   │   ├── middleware/         Authentication, role checks, validation
│   │   ├── routes/             Express routers (one file per resource)
│   │   ├── schemas/            Zod schemas for request validation
│   │   ├── services/           Side-effect services (e.g. email)
│   │   ├── sockets/            Socket.io setup and event handlers
│   │   ├── utils/              Shared helpers (e.g. authorization)
│   │   ├── app.js              Express app: middleware + routes + error handler
│   │   └── server.js           HTTP + Socket.io entry point
│   ├── .env.example            Template for required environment variables
│   └── package.json
│
└── frontend/
    ├── public/                 Static assets
    ├── src/
    │   ├── components/         Reusable UI components
    │   ├── context/            React context (auth, etc.)
    │   ├── lib/                API client, Socket.io client, helpers
    │   └── pages/              Route views, grouped by role
    │       ├── admin/          Admin dashboard views
    │       ├── doctor/         Doctor dashboard views
    │       └── patient/        Patient-facing views (incl. triage)
    ├── index.html
    ├── vite.config.js
    ├── vercel.json
    └── package.json
```

---

## Getting Started

The project is a monorepo with two siblings — `backend/` and `frontend/` — run as separate processes during development.

### Prerequisites

- **Node.js** 20+ and npm
- A **Supabase project** (free tier is sufficient)
- A **Groq API key** for AI triage — free at [console.groq.com](https://console.groq.com)
- *(Optional)* A **Resend API key** for transactional email — free at [resend.com](https://resend.com)

### 1. Clone

```bash
git clone https://github.com/wazzenaziz/MediConnect.git
cd MediConnect
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in your values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-or-anon-key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# AI triage (required for the triage feature)
GROQ_API_KEY=your-groq-api-key

# Transactional email (optional — sends are skipped if unset)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=MediConnect <onboarding@resend.dev>
```

You'll find `SUPABASE_URL` and `SUPABASE_KEY` in your Supabase project settings under **API**. If `RESEND_API_KEY` is unset, email sends are skipped (and logged) but doctor creation still succeeds.

### 3. Run database migrations

Migrations live in `backend/migrations/` and are numbered in the order they should be applied. Open each file in your Supabase **SQL Editor** and run them in numeric order:

```
001_initial_schema.sql
002_add_schedule_validity.sql
…
012_nearby_doctors.sql
…
016_email_templates_and_force_password_change.sql
```

> Migrations are kept as a faithful history of the schema's evolution — including early decisions later corrected by subsequent migrations.

### 4. Start the backend

```bash
npm run dev
```

The API runs at `http://localhost:5000`. Check `http://localhost:5000/api/health` to confirm it's up.

### 5. Set up the frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000
# Optional — only needed for Google sign-in
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

> Vite bakes `VITE_*` variables in at **build time**. If you change them in a deployed environment (e.g. Vercel), you must **redeploy** for the change to take effect.

### 6. Start the frontend

```bash
npm run dev
```

The app runs at `http://localhost:5173` and talks to the backend at `VITE_API_URL`.

---

## Usage

### Common commands

**Backend** (`cd backend`)

```bash
npm run dev      # start with nodemon (auto-reload)
npm start        # start in production mode
```

**Frontend** (`cd frontend`)

```bash
npm run dev      # start the Vite dev server (HMR)
npm run build    # production build to dist/
npm run preview  # preview the production build locally
npm run lint     # run ESLint
```

### Try the flow

1. **Register** as a patient at `/register` (self-registration always creates a patient account).
2. Go to **Triage**, describe your symptoms, and let the AI suggest a specialty.
3. **Search doctors** — allow location access to see the nearest specialists on the map.
4. Open a doctor's profile, pick a slot, and **book**.
5. Log in as a **doctor** (provisioned by an admin) to manage schedules, appointments, and consultation notes.
6. Log in as an **admin** to manage doctors/patients, view stats, and edit email templates.

---

## API Overview

All endpoints are prefixed with `/api`. Most require a JWT in the `Authorization: Bearer <token>` header.

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

### AI Triage
- `POST /api/triage` — Submit symptom text → returns a suggested specialty with confidence and reasoning

### Geocoding
- `GET /api/geocode` — Resolve a clinic address to coordinates (used when provisioning doctors)

### Admin
- `GET /api/admin/stats` — Aggregate platform stats *(admin)*
- Email-template management endpoints *(admin)* — list, read, and update the DB-backed templates

---

## Architectural Notes

A few decisions worth understanding before reading the code:

### Hybrid inheritance for users
Patients and admins live in a shared `users` table with a `role` column (Single Table Inheritance). Doctors have their own `doctors` table linked via `user_id` (Class Table Inheritance), because only doctors carry domain-specific fields (specialty, clinic address, geolocation). This keeps lightweight roles cheap and gives doctors a clean place to grow.

### Double-booking prevented at the database level
The `appointments` table has a Postgres `EXCLUDE` constraint over `(doctor_id, time-range)` using a GIST index. Even under concurrent requests, two overlapping appointments for the same doctor cannot both succeed. The application layer also checks availability for UX, but **correctness is enforced by the database**.

### Proximity search without PostGIS
Nearest-doctor search uses a plain SQL `nearby_doctors` RPC implementing the Haversine formula over stored latitude/longitude — no PostGIS extension required, which keeps the schema portable across Supabase tiers.

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
- **[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)** — triggers on a successful CI run on `main`. POSTs to Vercel and Render deploy hooks. Concurrency-limited so back-to-back pushes don't queue obsolete deploys.

Dependabot ([`.github/dependabot.yml`](.github/dependabot.yml)) groups weekly minor/patch bumps for `frontend/`, `backend/`, and the GitHub Actions themselves.

---

## Roadmap

- TypeScript migration
- Automated tests (Jest + Supertest for backend, Vitest + Testing Library for frontend)
- Row-Level Security policies in Supabase as a deeper second auth layer
- Email / SMS appointment reminders (24h + 1h before)
- Doctor verification workflow (license number check)
- Mobile-first refinements + a native app via Capacitor

---

## Contributing

This is primarily an academic project, but contributions and suggestions are welcome.

1. Fork the repository and create a feature branch (`git checkout -b feature/your-feature`).
2. Keep changes atomic — the app should always boot between commits.
3. Run `npm run lint` (frontend) and confirm the backend starts cleanly before opening a PR.
4. Open a pull request against `main` with a clear description.

Found a bug or have an idea? Please [open an issue](https://github.com/wazzenaziz/MediConnect/issues).

---

## Author

**Mohamed Aziz Wazzeni** — PFA project, 2026.

This project is submitted as a Projet de Fin d'Année (PFA) and is part of a larger plan to learn full-stack delivery end-to-end: from database design through API hardening, to UI implementation, third-party AI integration, and production deployment.

- GitHub: [@wazzenaziz](https://github.com/wazzenaziz)
- Issues: [github.com/wazzenaziz/MediConnect/issues](https://github.com/wazzenaziz/MediConnect/issues)

---

## License

Released under the [MIT License](LICENSE). You are free to use, modify, and distribute this software with attribution.
