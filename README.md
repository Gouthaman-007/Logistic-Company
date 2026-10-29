# Haulwise Logistics Dashboard

Haulwise is a delivery performance dashboard for monitoring shipments, carrier
performance, and logistics bottlenecks.

## Database models

Mongoose models are defined in `server/models`:

- `Carrier` stores carrier identifiers, contact details, service coverage, and
  performance metrics.
- `Shipment` stores customer and route details, delivery status and dates,
  tracking events, and a reference to its carrier.

Schemas validate required fields, enums, and metric ranges. Shipment indexes
support status/ETA and carrier/ETA lookups. Run the schema validation tests
without connecting to a database:

```bash
npm run test:models
```

## Database-backed API

Copy `.env.example` to `.env` and set `MONGODB_URI` to a MongoDB database you
can access. Keep `.env` private; it is ignored by Git.

Install the root API dependencies and seed the database:

```bash
npm install
npm run seed
npm run dev:server
```

In another terminal, start the Vite app from `client`:

```bash
cd client
npm install
npm run dev
```

The API listens on port `3001` by default. Vite proxies `/api` requests to it.
The seed script upserts example carriers and shipments and can be run again
safely.

- `GET /api/health` reports API and database connection status.
- `GET /api/carriers` reads active carriers.
- `GET /api/shipments` reads shipments and populates carrier details.
- `POST /api/shipments` validates and writes a shipment to MongoDB.

Run API tests with `npm run test:api`. They verify route validation against
injected models and exercise the connection, reads, and writes against a
temporary MongoDB instance; the first run downloads the MongoDB test binary.

Run the schema suite with `npm run test:models`, lint with `npm run lint`, and
build the client with `npm --prefix client run build`.
