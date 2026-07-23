export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function success(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function failure(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}

export function routeError(error: unknown) {
  if (error instanceof ApiError) {
    return failure(error.message, error.status);
  }

  console.error(error);
  return failure("The request could not be completed.", 500);
}

export async function jsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "A valid JSON request body is required.");
  }
}
