# TrackSwift hosted application

This directory contains the production TrackSwift application deployed with
OpenAI Sites.

- Customers verify shipments using a tracking number and registered email.
- Administrators sign in through the protected `#admin` portal.
- Shipment records and progress events are stored in the hosted D1 database.
- Production credentials are managed through the hosting environment and are
  never committed to Git.

## Local checks

```powershell
npm.cmd run build
npm.cmd test
```

The existing Express and PostgreSQL implementation remains at the repository
root for local development.
