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

3. Create a `.env` file in `api-project/` (same folder as `app.js`). Set variables for your environment (e.g. local development or your hosted database and API key):

```env
PORT=<port your server listens on>
DB_USER=<database user>
DB_HOST=<database host>
DB_NAME=<database name>
DB_PASSWORD=<database password>
DB_PORT=<database port>
API_KEY=<your secret API key for admin routes>
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
cd api-project
docker build -t uk-housing-api .
```

Run the container with environment variables set for `PORT`, `DB_*`, and `API_KEY`. The Dockerfile uses a multi-stage build (builder + production) and runs as a non-root user. Docker Compose in this repo is for the database only; the API can be run on the host or by another orchestrator.

### Notes and Troubleshooting

- **Database connection:** Ensure Postgres is reachable and `.env` has correct `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` for your environment.
- **API key:** Set `API_KEY` in `.env` to use POST/PUT/DELETE on regions. Without it, those routes return 401.
- **Seeding:** Run `npm run seed:all` after migrations. For per-script details and CSV file names, see [api-project/scripts/README.md](api-project/scripts/README.md).
- **Tests:** Run `npm run test:ci` from `api-project/`. Requires Postgres and `API_KEY` in `.env` for full CRUD tests.

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

- **Migrations:** `npm run db:migrate` (run from `api-project/`). SQL files in `api-project/scripts/sql/` run in order to create or alter tables.
- **Seeding:** `npm run seed:all` runs, in order: regions, property-types, housing-sales, buyer-dwelling, affordability, rental, implied-income. Each table has a dedicated seed (regions and property_types via `seed:regions` and `seed:property-types`; buyer_dwelling_categories via migration 04; the rest via the scripts above). For prerequisites and per-script details, see [api-project/scripts/README.md](api-project/scripts/README.md).
- **Testing:** `npm test` (watch) or `npm run test:ci` (single run). Tests live in `api-project/__tests__/api.test.js` and cover status codes, affordability index shape and boundary cases, and regions CRUD with teardown.

## Configuration

- **Environment variables:** Stored in `api-project/.env`. Required: `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT` for PostgreSQL; optional `PORT` (server listen port); `API_KEY` for admin write operations.
- **API key:** Send the key in the `x-api-key` header or as `Authorization: Bearer <key>` for POST, PUT, PATCH, and DELETE. GET does not require a key.
- **Swagger:** Served at `/api-docs`; no auth required to view. Use the "Authorize" button in Swagger UI to set your API key when testing protected routes.

