# TrackSwift

TrackSwift is an authenticated shipment-tracking platform for customers and administrators. Customers create accounts and can only see shipments assigned to them. Administrators create shipments, assign them to registered customers, and append progress events from Italy through final delivery in the United States.

## Current capabilities

- Public responsive landing page and tracking demonstration
- Customer self-registration and login API
- Password hashing with bcrypt
- JWT-protected customer and administrator routes
- PostgreSQL data model through Prisma
- Customer shipment ownership enforcement
- Administrator customer listing and shipment creation
- Transactional shipment-stage updates with append-only progress history
- Ten-stage Italy-to-America delivery workflow
- Seed command for creating the first administrator

## Local setup

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Copy `.env.example` to `.env` and provide a PostgreSQL `DATABASE_URL`, a random `JWT_SECRET` of at least 32 characters, and the initial administrator credentials.

3. Create the database tables and administrator:

   ```powershell
   npm.cmd run db:migrate -- --name initial_auth_and_shipments
   npm.cmd run db:seed
   ```

4. Start TrackSwift:

   ```powershell
   npm.cmd run dev
   ```

5. Open `http://localhost:4173`.

Never commit `.env`; it is excluded by `.gitignore`.

## API overview

All authenticated endpoints expect `Authorization: Bearer <accessToken>`.

### Authentication

- `POST /api/auth/register` — create a customer account with `name`, `email`, and `password`
- `POST /api/auth/login` — log in with `email` and `password`
- `GET /api/auth/me` — return the authenticated account

### Customer shipments

- `GET /api/shipments` — list shipments owned by the current customer
- `GET /api/shipments/:trackingId` — return one owned shipment and its visible history

### Administrator operations

- `GET /api/admin/customers` — list registered customers
- `GET /api/admin/shipments` — list all shipments
- `POST /api/admin/shipments` — create and assign a shipment using `customerEmail`
- `PATCH /api/admin/shipments/:trackingId/progress` — append a progress event and update the shipment summary

An administrator progress request uses the database enum value, for example:

```json
{
  "stage": "CUSTOMS_CLEARANCE",
  "location": "John F. Kennedy International Airport, New York",
  "notes": "Shipment submitted to United States customs.",
  "estimatedDelivery": "2026-07-26T18:00:00.000Z",
  "customerVisible": true
}
```

## Shipment stages

1. `SHIPMENT_CREATED`
2. `PROCESSING_IN_ITALY`
3. `PACKAGE_PICKED_UP`
4. `DEPARTED_ORIGIN_FACILITY`
5. `INTERNATIONAL_TRANSIT`
6. `CUSTOMS_CLEARANCE`
7. `ARRIVED_IN_UNITED_STATES`
8. `LOCAL_DISTRIBUTION_FACILITY`
9. `OUT_FOR_DELIVERY`
10. `DELIVERED`

## Next frontend phase

The next slice will connect this API to registration, login, customer-dashboard, shipment-detail, and protected administrator screens. The landing-page admin table remains a visual demonstration until those screens are connected.
