import { NextResponse } from "next/server";
import { withApiHandler } from "@/core/api/with-api-handler";
import { AppError } from "@/core/errors/app-error";

export const GET = withApiHandler(
  async (_request, { params }) => {
    const pathParam = params?.path;
    const segments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];
    if (segments.length === 0) {
      throw AppError.badRequest("File path required");
    }

    const filePath = segments.join("/");

    if (filePath.includes("..")) {
      throw AppError.badRequest("Invalid file path");
    }

    const storageType = process.env.STORAGE_TYPE || (process.env.NETLIFY ? "netlify" : "local");

    if (storageType === "netlify") {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({
        name: process.env.NETLIFY_BLOBS_STORE || "rra-uploads",
        consistency: "strong",
      });
      const blob = await store.get(filePath, { type: "blob" });

      if (!blob) {
        throw AppError.notFound("File not found");
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": blob.type || "application/pdf",
          "Content-Disposition": `inline; filename="${filePath.split("/").pop()}"`,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const fs = await import("fs/promises");
    const path = await import("path");
    const basePath = process.env.STORAGE_LOCAL_PATH || "./uploads";
    const fullPath = path.join(basePath, filePath);

    try {
      const buffer = await fs.readFile(fullPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${path.basename(fullPath)}"`,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      throw AppError.notFound("File not found");
    }
  },
  { module: "files" }
);
