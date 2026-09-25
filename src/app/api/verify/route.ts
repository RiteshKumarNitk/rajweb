import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { verifyCertificate } from "@/modules/verify/verify.service";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(
  async (request, { requestId }) => {
    const { searchParams } = new URL(request.url);
    const certificateNumber = searchParams.get("certificateNumber") ?? undefined;
    const qrCode = searchParams.get("qrCode") ?? undefined;
    const name = searchParams.get("name") ?? undefined;
    const district = searchParams.get("district") ?? undefined;
    const fatherName = searchParams.get("fatherName") ?? undefined;

    const result = await verifyCertificate({ certificateNumber, qrCode, name, district, fatherName });
    return jsonSuccess(result, requestId);
  },
  { module: "verify", rateLimit: { limit: 60, windowMs: 60000 } }
);

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const body = await request.json().catch(() => ({}));
    const result = await verifyCertificate(body);
    return jsonSuccess(result, requestId);
  },
  { module: "verify", rateLimit: { limit: 60, windowMs: 60000 } }
);
