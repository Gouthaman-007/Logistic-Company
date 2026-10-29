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

## Run the dashboard

```bash
npm install
npm run dev
```

Build and lint the frontend with `npm run build` and `npm run lint`.
