# UK Housing Market API

## REST API for UK Housing and Affordability Data

This repository contains the **UK Housing Market API**: a Node.js and Express backend that exposes UK housing sales, affordability metrics, rental data, and an affordability index. The API aggregates data from ONS and UK House Price Index (UKHPI) sources, stores it in PostgreSQL, and serves it as JSON. Third-party developers can build dashboards, calculators, or reports without scraping multiple government sources. Interactive API documentation is provided via Swagger UI at `/api-docs` when the server is running.

### Why This Exists

UK housing and affordability data is spread across several ONS and UKHPI publications. This project provides a single REST API that:

- Exposes housing sales (UKHPI), affordability metrics (ONS Table 30), and rental metrics in a consistent, filterable format
- Offers an affordability index that compares a user's salary to regional rents and implied borrower income and returns an **affordability band** (Affordable / Stretched / Unaffordable)
- Allows admins to manage regions (create, update, delete) when an API key is supplied
- Documents all endpoints with OpenAPI 3.0 and Swagger UI so integrators can try requests without reading source code

### Extensibility

The codebase is structured for clarity and extension:

- **Data sources:** Seed scripts in `api-project/scripts/` load CSV/ONS data; you can add new scripts or endpoints for additional datasets
- **Endpoints:** Routes live in `api-project/routes/` and controllers in `api-project/controllers/`; new resources follow the same pattern (lookups, filters, pagination)
- **Auth:** Write operations (POST, PUT, DELETE) are protected by a single API key (see Configuration); you can replace or extend this in `api-project/middleware/requireApiKey.js`
- **Docs:** Swagger is defined in `api-project/config/swagger.js`; add new paths and schemas there so they appear in `/api-docs`

## Dependencies

The API (`api-project/`) uses the following npm packages:

| Package | Purpose |
|---------|---------|
| `@google/generative-ai` | Gemini API for AI market summary endpoint |
| `bcryptjs` | Password hashing for user registration and login |
| `csv-parse` | Parsing CSV files in seed scripts |
| `dotenv` | Loading environment variables from `.env` |
| `express` | Web framework |
| `joi` | Request body, query and params validation |
| `pg` | PostgreSQL client |
| `swagger-jsdoc` | OpenAPI spec generation |
| `swagger-ui-express` | Swagger UI at `/api-docs` |

**Dev dependencies:** `jest` (tests), `nodemon` (dev server with reload), `supertest` (HTTP assertions in tests).

## Prerequisites

- Node.js v20 or higher (LTS recommended)
- PostgreSQL 15 (or use the provided Docker Compose)
- npm (included with Node)

## Running the Application

### Quick Start

1. Clone the repository and go into the API project:

```bash
git clone <your-repo-url>
cd Web_services_web_data/api-project
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in `api-project/` (same folder as `app.js`). These variables are for **you as the deployer** (or for local development). Only the person running or deploying the API needs these; API consumers do not.

```env
# All of these are for the deployer only. API consumers do not set them.
PORT=<port your server listens on>
DB_USER=<database user>
DB_HOST=<database host>
DB_NAME=<database name>
DB_PASSWORD=<database password>
DB_PORT=<database port>
API_KEY=<key you choose for admin CRUD; give this to clients who need it>
GEMINI_API_KEY=<optional; for AI insight endpoints; you are charged, not consumers>
```

4. Start Postgres (optional, e.g. for local development with Docker Compose):

```bash
docker-compose up -d
```

If you use Docker Compose, set `DB_*` in `.env` to match the Postgres container (user, host, database name, password, port). For a hosted deployment (e.g. Railway), use the credentials provided by your database service.

5. Run migrations and seed data:

```bash
npm run db:migrate
npm run seed:all
```

6. Start the server:

```bash
npm start
```

Once the server is running, the API is available at your configured base URL. Interactive API documentation (Swagger UI) is served at path `/api-docs` (base URL + `/api-docs`).

### Building and Running with Docker

To build the API image (from `api-project/`):

```bash
docker build -t uk-housing-api .
```

Run the container with environment variables set for `PORT`, `DB_*`, `API_KEY`, and optionally `GEMINI_API_KEY`. These are for the deployer only; API consumers do not set them. The Dockerfile uses a multi-stage build (builder + production) and runs as a non-root user. Docker Compose in this repo is for the database only; the API can be run on the host or by another orchestrator.

### Notes and Troubleshooting (deployers)

- **Database connection:** Ensure Postgres is reachable and your env has correct `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- **API key:** Set `API_KEY` in your env so that POST/PUT/DELETE on regions work. Without it, those routes return 401. This is the key you may share with clients who need CRUD.
- **GEMINI_API_KEY:** Set only if you enable AI insight endpoints. You (the deployer) are charged when those endpoints are called; consumers do not need this key.
- **Seeding:** Run `npm run seed:all` after migrations.
- **Tests:** Run `npm run test:ci` from `api-project/`. Requires Postgres and `API_KEY` in `.env` for full CRUD tests.

## Configuration (for deployers / API owners)

All of the following are set by **whoever runs or deploys the API** (e.g. you on Railway). End-users of your deployed API do not set these; they only need your API base URL and, for CRUD, the API key you give them.

- **Environment variables** (in `api-project/.env` or your host's env): `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT` for PostgreSQL; optional `PORT`; `API_KEY` for protecting admin routes (you choose this key and share it with clients who need CRUD); `GEMINI_API_KEY` for AI-powered endpoints (get a key at [Google AI Studio](https://aistudio.google.com/) — you are charged for Gemini usage when consumers call the insight endpoint; consumers do not need a Gemini key).
- **API key (for consumers):** Clients that need to call POST/PUT/DELETE on regions use the key you set as `API_KEY`, in the `x-api-key` header or `Authorization: Bearer <key>`. GET endpoints do not require a key.
- **Swagger:** Served at `/api-docs`; no auth required to view. Use the "Authorize" button in Swagger UI to set the API key when testing protected routes.

## Features

- Housing sales data from UKHPI, filterable by region, property type, period, and build type
- Affordability metrics (advance price %, price/income ratio) by region and buyer-dwelling category
- Rental metrics (average rents, annual change) by region and property breakdown
- Affordability index: compare annual salary to regional rent and implied income; returns an affordability band and ratios
- Admin CRUD for regions (create, update, delete) with API key
- OpenAPI 3.0 and Swagger UI for interactive documentation
- Automated tests (Jest + Supertest) for status codes, affordability shape, boundary cases, and regions CRUD
- Docker and Docker Compose for Postgres; multi-stage Dockerfile for the API

## API Overview

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/names` | API health check (connectivity: API and DB) | Public |
| GET | `/api/regions` | List regions | Public |
| POST | `/api/regions` | Create region | Admin (API key) |
| PUT | `/api/regions/:id` | Update region | Admin (API key) |
| DELETE | `/api/regions/:id` | Delete region | Admin (API key) |
| GET | `/api/property-types` | List property types | Public |
| GET | `/api/buyer-dwelling-categories` | List buyer/dwelling categories | Public |
| GET | `/api/housing-sales` | UKHPI housing sales | Public |
| GET | `/api/housing-sales-by-buyer` | Prices by buyer/dwelling type | Public |
| GET | `/api/affordability` | ONS affordability metrics | Public |
| GET | `/api/rental-metrics` | Rental prices and change | Public |
| GET | `/api/affordability-index` | Salary vs rent (affordability band: Affordable/Stretched/Unaffordable) | Public |

Full parameter tables, request/response examples, and schemas are in Swagger UI at `/api-docs`.

## Public vs Admin Routes

| Route type | Methods | Auth required |
|------------|---------|---------------|
| Public (read-only) | GET | No |
| Admin (write) | POST, PUT, PATCH, DELETE | Yes (header `x-api-key` or `Authorization: Bearer <key>`) |

All GET endpoints are public. Only region CRUD (POST/PUT/DELETE `/api/regions`) requires the API key.

### For API consumers (using a deployed API)

If the API is already deployed (e.g. on Railway), **you do not need any database credentials or a Gemini key.** You only need:

- **Base URL** of the API (e.g. `https://your-app.railway.app`). Use it for all GET and POST/PUT/DELETE requests.
- **API key** only if you need to call admin routes (POST/PUT/DELETE on regions). The API owner gives you this key; send it in the `x-api-key` header or `Authorization: Bearer <key>`.

All environment variables (database, `API_KEY`, `GEMINI_API_KEY`) are set by the **deployer** who runs the server. You are not charged for Gemini; the API owner is.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (v20+) |
| Framework | Express 5.x |
| Database | PostgreSQL 15 |
| API docs | OpenAPI 3.0, Swagger UI (`/api-docs`) |
| Testing | Jest, Supertest |
| Container | Docker, Docker Compose (Postgres) |

## How It Works

1. **Data ingestion:** CSV and ONS/UKHPI data are loaded by seed scripts in `api-project/scripts/` into PostgreSQL (regions, housing_sales_data, affordability_metrics, rental_metrics, etc.).
2. **API layer:** Express in `api-project/app.js` mounts routes for lookups (regions, property types, buyer-dwelling categories) and data endpoints (housing-sales, affordability, rental-metrics, affordability-index). GET is public; POST/PUT/DELETE for regions require the API key.
3. **Requests:** Clients send HTTP requests (e.g. GET with query params for filters and pagination). The API reads from the database and returns JSON. Admin routes require the `x-api-key` header (or `Authorization: Bearer <key>`).
4. **Documentation:** Swagger UI at `/api-docs` is generated from `api-project/config/swagger.js` and allows trying endpoints interactively.

Data flows: external sources → seed scripts → PostgreSQL; clients → Express API → PostgreSQL; responses → JSON to client.

## Scripts and Data

- **Migrations:** `npm run db:migrate` (run from `api-project/`). SQL files in `api-project/scripts/sql/` run in order (01–07 create tables; 08 adds performance indexes on region_id, period, category_id, property_type_id).
- **Seeding:** `npm run seed:all` runs, in order: regions, property-types, housing-sales, buyer-dwelling, affordability, rental, implied-income. Each table has a dedicated seed (regions and property_types via `seed:regions` and `seed:property-types`; buyer_dwelling_categories via migration 04; the rest via the scripts above).
- **Testing:** `npm test` (watch) or `npm run test:ci` (single run). Tests live in `api-project/__tests__/api.test.js` and cover status codes, affordability index shape and boundary cases, and regions CRUD with teardown.
