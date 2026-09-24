import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { generateCsrfToken, setCsrfCookie } from "@/security/csrf";

export const GET = withApiHandler(async (_request, { requestId }) => {
  const token = generateCsrfToken();
  const response = jsonSuccess({ token }, requestId);
  setCsrfCookie(response, token);
  return response;
}, { module: "csrf" });
