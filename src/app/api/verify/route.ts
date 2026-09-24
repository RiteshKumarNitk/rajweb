import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { verifyCertificate } from "@/modules/verify/verify.service";

export const GET = withApiHandler(
  async (request, { requestId }) => {
    const { searchParams } = new URL(request.url);
    const certificateNumber = searchParams.get("certificateNumber") ?? undefined;
    const qrCode = searchParams.get("qrCode") ?? undefined;

    const result = await verifyCertificate({ certificateNumber, qrCode });
    return jsonSuccess(result, requestId);
  },
  { module: "verify", rateLimit: { limit: 30, windowMs: 60000 } }
);
