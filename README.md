# Mini RFQ Portal — Lead Developer Assignment

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-teal.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-19%20Passed-brightgreen.svg)]()

A full-stack, enterprise-grade **Request for Quotation (RFQ) Portal** engineered for B2B industrial procurement. Enables Buyers to publish multi-line-item RFQs, Vendors to submit and revise sealed bids before deadlines, and Buyers to evaluate bids using a side-by-side comparison matrix and execute atomic contract awards.

---

## 1. Quick Start: One-Command Setup

The entire solution runs with **one command** using Docker Compose (PostgreSQL, Backend API with automatic migrations & seed, and Nginx-powered React Frontend):

```bash
docker compose up --build
```

Once started:
- **Frontend Web Portal:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Interactive OpenAPI / Swagger UI:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Healthcheck:** [http://localhost:5000/health](http://localhost:5000/health)

---

## 2. Seeded Test Credentials

The database is seeded automatically with 6 demo accounts across all three platform roles:

| Role | Email | Password | Pre-seeded Workload |
|---|---|---|---|
| **System Admin** | `admin@bidveda.com` | `Password123!` | System-wide visibility across all buyers and vendors |
| **Buyer 1** | `buyer1@company.com` | `Password123!` | Owns RFQ #1 (`DRAFT`), RFQ #2 (`PUBLISHED` active), RFQ #4 (`AWARDED`) |
| **Buyer 2** | `buyer2@company.com` | `Password123!` | Owns RFQ #3 (`CLOSED` / expired deadline) |
| **Vendor 1** | `vendor1@tech.com` | `Password123!` | Submitted bid on RFQ #2; Winner of RFQ #4 |
| **Vendor 2** | `vendor2@build.com` | `Password123!` | Submitted Revision #1 & #2 on RFQ #2; Shortlisted on RFQ #3 |
| **Vendor 3** | `vendor3@supply.com` | `Password123!` | Submitted bid on RFQ #3 and losing bid on RFQ #4 |

> **Pro-Tip:** The login page features **1-Click Fast Login buttons** for each role for instant evaluation without typing credentials.

---

## 3. Local Development Setup (Without Docker)

### Prerequisites
- Node.js 20+ & npm
- PostgreSQL 14+ running locally on port 5432

### Steps

```bash
# 1. Setup Backend
cd backend
npm install
cp .env.example .env

# Run database migrations and seed
npx prisma migrate deploy
npm run prisma:seed

# Start backend development server
npm run dev
# (Server starts at http://localhost:5000)

# 2. Setup Frontend (in a new terminal)
cd ../frontend
npm install
npm run dev
# (Frontend starts at http://localhost:5173 with proxy to backend)
```

---

## 4. How to Run Automated Tests

The backend includes a comprehensive Jest + Supertest integration test suite covering all 11 required core flows:

```bash
cd backend
npm test
```

### Verified Test Suite (19 / 19 Passed):
1. `business_logic.test.ts`:
   - Computes effective status as `CLOSED` lazily when deadline elapses
   - Rejects cross-buyer RFQ queries with `404` (sealed information hiding)
   - Rejects vendor queries on `DRAFT` RFQs with `404`
   - Rejects vendor queries on competing quotes with `404` (sealed bids)
   - Rejects quote submissions after deadline has elapsed (`400 DEADLINE_PASSED`)
   - Rejects incomplete quotes omitting any required line item (`400 INCOMPLETE_QUOTE`)
   - Rejects premature award attempts before deadline has passed (`400 DEADLINE_NOT_PASSED`)
   - Rejects double-awarding an already awarded RFQ (`400 ALREADY_AWARDED`)
   - Rejects awarding a quote belonging to another RFQ (`400 INVALID_QUOTE`)
2. `upload.test.ts`:
   - Rejects disallowed file extensions (`.exe`, `.txt`)
   - Rejects fake extensions via **binary magic bytes** (`%PDF` vs plain text)
   - Rejects files exceeding the 10 MB limit
3. `auth_and_roles.test.ts`:
   - Rejects unauthenticated requests (`401 UNAUTHORIZED`)
   - Rejects Vendors attempting to create an RFQ (`403 FORBIDDEN`)
   - Rejects Buyers attempting to submit quotes (`403 FORBIDDEN`)
   - Rejects public signup attempts targeting `ADMIN` role

---

## 5. Architectural Overview

```text
bidvedA/
├── backend/
│   ├── prisma/                     # Schema, migrations & comprehensive seed script
│   ├── src/
│   │   ├── routes/                 # Express route definitions (auth, rfq, quote, attachment)
│   │   ├── controllers/            # Thin request handlers & JSON formatters
│   │   ├── services/               # Core business invariants & PostgreSQL ACID transactions
│   │   │   └── storage/            # Abstract StorageProvider & LocalDiskStorage provider
│   │   ├── middleware/             # JWT auth, RBAC guards, multer buffer, error handler
│   │   ├── validators/             # Zod input schemas for bodies, queries & params
│   │   ├── utils/                  # Magic bytes binary validation (%PDF, PK\x03\x04)
│   │   ├── docs/                   # OpenAPI / Swagger definition and UI router
│   │   ├── db/                     # Prisma singleton client instance
│   │   ├── app.ts                  # Express application setup with Helmet & CORS
│   │   └── server.ts               # Server entry point & graceful shutdown
│   ├── tests/                      # Jest & Supertest automated test suite
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                    # Centralized fetch API client with auto-JWT injection
│   │   ├── components/             # Reusable UI (Navbar, StatusBadge, FileUploadModal, QuoteModal)
│   │   ├── context/                # AuthContext (JWT, user state, fast switcher)
│   │   ├── pages/                  # Views (Login, Register, RFQList, RFQDetail, RFQCreateEdit, Comparison)
│   │   ├── types/                  # TypeScript domain contracts
│   │   ├── App.tsx                 # ProtectedRoute guards and routing
│   │   └── main.tsx                # TanStack Query & React root
│   ├── nginx.conf                  # Production SPA reverse proxy
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── DESIGN.md                   # Complete architectural design document (10 sections)
├── docker-compose.yml              # Single-command spin-up
└── README.md
```

---

## 6. Assumptions & Key Design Decisions

1. **Money & Precision:** Handled as `NUMERIC(14,2)` in PostgreSQL and `Prisma.Decimal` in Node.js. All line totals and quote totals are computed strictly on the backend (`price * quantity`). Client amounts are never trusted.
2. **Sealed-Bid Privacy:** Quotes are sealed bids. Vendors can only query their own bids (`WHERE vendor_id = :id`). Accessing other bids or unauthorized RFQs returns `404 Not Found` rather than `403 Forbidden` to prevent resource enumeration.
3. **RFQ Lazy Closure:** Rather than relying on an external cron job, deadlines are evaluated dynamically using the server clock (`deadline <= NOW()`). A transition to `CLOSED` is persisted lazily upon access or mutation.
4. **Pessimistic Concurrency (`SELECT ... FOR UPDATE`):** Both quote submission and contract awarding execute within an interactive database transaction using row-level locking to guarantee zero race conditions.
5. **Storage Provider Pattern:** File storage operates behind a `StorageProvider` interface. Uploads are renamed using cryptographically secure UUIDs (`crypto.randomUUID()`) and validated against magic bytes (`%PDF` and `PK\x03\x04`).

---

## 7. Known Limitations & Next Steps

Written honestly from a Lead Developer perspective:
- **Scalability under 100x Concurrency:** While row-level locking prevents race conditions, at 10,000 bids/sec it would cause lock contention on the target RFQ row. In a 100x scale-up, quote submission would transition to an event-driven queue (e.g., Apache Kafka / RabbitMQ + Redis write buffer) with asynchronous validation.
- **Single Currency:** The platform strictly enforces Indian Rupees (`INR`). Multi-currency RFQs would require real-time FX rate snapshotting stored alongside each quote revision.
- **Local Disk Volume:** Files are stored on a Docker local volume. In a production cluster with multiple instances behind a load balancer, this would swap directly to `S3StorageProvider` using AWS S3 / Cloudflare R2 presigned URLs.
- **WebSockets / Push Notifications:** Currently, state updates rely on TanStack Query invalidation and polling. Real-time push updates for deadline countdowns and instant buyer alerts would be the next logical addition.

---

## 8. Note on AI Tool Usage

AI pair-programming assistance (Antigravity AI) was leveraged during the development of this project for:
- Accelerating boilerplate setup (Express TypeScript typing, Prisma declarative schema, and Jest configuration).
- Structuring realistic industrial seed data across hardware, machinery, and electrical parts.
- Drafting initial Tailwind CSS layouts and color tokens.
- Reviewing edge-case test matrix coverage.

All core business invariants (pessimistic row-level locking, server-side decimal math, lazy lifecycle state transitions, magic bytes binary inspection, and sealed-bid isolation) were designed and validated to guarantee complete defensibility during technical interviews.
