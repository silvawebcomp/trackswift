import { getDatabase, requireAdmin } from "../../../../../../lib/auth";
import { jsonBody, routeError, success } from "../../../../../../lib/http";
import {
  normalizedTrackingId,
  updateShipmentProgress,
} from "../../../../../../lib/shipments";

interface RouteContext {
  params: Promise<{ trackingId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { trackingId: parameter } = await context.params;
    const trackingId = normalizedTrackingId(decodeURIComponent(parameter));
    const body = await jsonBody<Record<string, unknown>>(request);
    return success({
      shipment: await updateShipmentProgress(
        getDatabase(),
        trackingId,
        body,
      ),
    });
  } catch (error) {
    return routeError(error);
  }
}
