import { requireAdmin } from "../../../../lib/auth";
import { routeError, success } from "../../../../lib/http";

export async function GET(request: Request) {
  try {
    return success({ admin: await requireAdmin(request) });
  } catch (error) {
    return routeError(error);
  }
}
