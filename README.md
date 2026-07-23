# TrackSwift

TrackSwift is a private shipment-tracking platform for packages travelling from Italy to the United States. It uses the same customer-access pattern as FixHub Track Repair: a customer enters the shipment tracking number and the email registered by the administrator. No customer password or customer account is required.

Administrators have a separate password-protected portal for registering shipments and publishing progress updates.

## Access model

### Customer

1. The administrator registers a shipment with the customer’s name and email.
2. TrackSwift creates a tracking number, or the administrator supplies one.
3. The customer enters that tracking number and the exact registered email.
4. Only a matching pair reveals the shipment route, delivery estimate, notes, and progress history.

### Administrator

- Signs in with the administrator credentials stored in the TrackSwift database.
- Registers shipments and customer contact details.
- Views every active shipment.
- Updates location, progress stage, carrier notes, and estimated delivery.
- Has exclusive access to all write operations.

## Current capabilities

- Responsive TrackSwift landing page
- Tracking-number and email customer verification
- Generic mismatch responses to avoid exposing customer information
- Rate limiting on customer verification and administrator login
- Administrator-only JWT authentication
- PostgreSQL data model through Prisma
- Shipment registration with generated or custom tracking numbers
- Transactional progress updates with append-only customer-visible history
- Ten-stage Italy-to-America delivery workflow
- Functional customer result screen and administrator workspace
- Initial administrator seed command

## Local setup

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Copy `.env.example` to `.env` and provide:

   - A PostgreSQL `DATABASE_URL`
   - A random `JWT_SECRET` containing at least 32 characters
   - `ADMIN_NAME`, `ADMIN_EMAIL`, and an `ADMIN_PASSWORD` of at least 10 characters

3. Create the database tables and administrator:

   ```powershell
   npm.cmd run db:deploy
   npm.cmd run db:seed
   ```

4. Start TrackSwift:

   ```powershell
   npm.cmd run dev
   ```

5. Open `http://localhost:4173`.

Never commit `.env`; it is excluded by `.gitignore`.

## API overview

### Customer verification

- `POST /api/tracking`

```json
{
  "trackingId": "TS-260722-A1B2C3",
  "email": "customer@example.com"
}
```

The response omits the stored customer email and administrator information.

### Administrator authentication

- `POST /api/auth/login` — sign in with administrator email and password
- `GET /api/auth/me` — validate the administrator session

### Administrator shipment operations

All administrator endpoints expect `Authorization: Bearer <accessToken>`.

- `GET /api/admin/shipments` — list all shipments
- `POST /api/admin/shipments` — register a shipment and its customer email
- `PATCH /api/admin/shipments/:trackingId/progress` — append a progress event

Example shipment registration:

```json
{
  "customerName": "Alex Johnson",
  "customerEmail": "alex@example.com",
  "description": "Personal effects — 1 parcel",
  "originCity": "Milan",
  "originCountry": "Italy",
  "destinationCity": "New York",
  "destinationCountry": "United States",
  "weightKg": 2.4,
  "dimensions": "30 × 25 × 15 cm",
  "estimatedDelivery": "2026-07-30T18:00:00.000Z"
}
```

Example progress update:

```json
{
  "stage": "CUSTOMS_CLEARANCE",
  "location": "John F. Kennedy International Airport, New York",
  "notes": "Shipment submitted to United States customs.",
  "estimatedDelivery": "2026-07-30T18:00:00.000Z"
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
