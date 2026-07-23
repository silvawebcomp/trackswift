import { getDatabase, requireAdmin } from "../../../../lib/auth";
import { jsonBody, routeError, success } from "../../../../lib/http";
import { createShipment, listShipments } from "../../../../lib/shipments";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return success({ shipments: await listShipments(getDatabase()) });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await jsonBody<Record<string, unknown>>(request);
    return success(
      { shipment: await createShipment(getDatabase(), body) },
      201,
    );
  } catch (error) {
    return routeError(error);
  }
}
