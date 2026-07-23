import { authenticateAdmin, signAccessToken } from "../../../../lib/auth";
import { jsonBody, routeError, success } from "../../../../lib/http";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = await jsonBody<LoginBody>(request);
    const admin = await authenticateAdmin(body.email || "", body.password || "");
    return success({
      admin,
      accessToken: await signAccessToken(admin),
    });
  } catch (error) {
    return routeError(error);
  }
}
