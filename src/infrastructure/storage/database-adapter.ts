import prisma from "@/infrastructure/database/prisma";
import type { StorageAdapter, StoredFileContent } from "@/infrastructure/storage/storage-adapter";

/**
 * Keeps files in the `stored_files` table. Used where the server has no
 * persistent disk (Vercel), so issued certificate PDFs survive deployments.
 * Paths are write-once: an issued file is never replaced in place.
 */
export class DatabaseStorageAdapter implements StorageAdapter {
  async upload(file: Buffer, filename: string, folder = ""): Promise<string> {
    const path = folder ? `${folder}/${filename}` : filename;
    await prisma.storedFile.create({
      data: { path, mimeType: filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream", size: file.length, data: Uint8Array.from(file) },
    });
    return path;
  }

  async read(path: string): Promise<StoredFileContent | null> {
    const row = await prisma.storedFile.findUnique({ where: { path }, select: { data: true, mimeType: true } });
    return row ? { data: Buffer.from(row.data), contentType: row.mimeType } : null;
  }

  async delete(path: string): Promise<void> {
    await prisma.storedFile.deleteMany({ where: { path } });
  }

  getUrl(path: string): string {
    return `/api/files/${path.split("/").map(encodeURIComponent).join("/")}`;
  }
}
