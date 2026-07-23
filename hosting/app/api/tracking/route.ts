import { getDatabase } from "../../../lib/auth";
import { ApiError, jsonBody, routeError, success } from "../../../lib/http";
import {
  findShipment,
  normalizedEmail,
  normalizedTrackingId,
  shipmentWithEvents,
} from "../../../lib/shipments";

interface TrackingBody {
  trackingId?: string;
  email?: string;
}

export async function POST(request: Request) {
  try {
    const body = await jsonBody<TrackingBody>(request);
    const trackingId = normalizedTrackingId(body.trackingId);
    const email = normalizedEmail(body.email);
    if (!trackingId || !email) {
      throw new ApiError(
        400,
        "Enter both your tracking number and registered email.",
      );
    }

    const database = getDatabase();
    const row = await findShipment(database, trackingId, email);
    if (!row) {
      throw new ApiError(
        404,
        "We could not verify a shipment with that tracking number and email.",
      );
    }

    return success({
      shipment: await shipmentWithEvents(database, row, true),
    });
  } catch (error) {
    return routeError(error);
  }
}
