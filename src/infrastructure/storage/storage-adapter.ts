import { NetlifyBlobsStorageAdapter } from "./netlify-blobs-adapter";
import { DatabaseStorageAdapter } from "./database-adapter";

export interface StoredFileContent {
  data: Buffer;
  contentType: string;
}

export interface StorageAdapter {
  upload(file: Buffer, filename: string, folder?: string): Promise<string>;
  /** The stored bytes, or null when the file does not exist. */
  read(path: string): Promise<StoredFileContent | null>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor() {
    this.basePath = process.env.STORAGE_LOCAL_PATH || "./uploads";
  }

  async upload(file: Buffer, filename: string, folder = ""): Promise<string> {
    const fs = await import("fs/promises");
    const path = await import("path");

    const dir = path.join(this.basePath, folder);
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, file);

    return folder ? `${folder}/${filename}` : filename;
  }

  async read(filePath: string): Promise<StoredFileContent | null> {
    const fs = await import("fs/promises");
    const path = await import("path");
    const basePath = path.resolve(this.basePath);
    const fullPath = path.resolve(basePath, filePath);
    if (!fullPath.startsWith(basePath + path.sep)) return null;
    try {
      return { data: await fs.readFile(fullPath), contentType: "application/pdf" };
    } catch {
      return null;
    }
  }

  async delete(filePath: string): Promise<void> {
    const fs = await import("fs/promises");
    const path = await import("path");
    const fullPath = path.join(this.basePath, filePath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File may not exist
    }
  }

  // Files live outside public/ and are only served through the
  // authorization-checked /api/files route — same URL shape as Netlify Blobs.
  getUrl(filePath: string): string {
    return `/api/files/${filePath.split("/").map(encodeURIComponent).join("/")}`;
  }
}

let storageInstance: StorageAdapter | null = null;

/**
 * STORAGE_TYPE wins; otherwise Netlify → Blobs, Vercel → database (its
 * filesystem is not persistent, so a local file would be lost), else local disk.
 */
export function resolveStorageType(): string {
  if (process.env.STORAGE_TYPE) return process.env.STORAGE_TYPE;
  if (process.env.NETLIFY === "true") return "netlify";
  if (process.env.VERCEL === "1") return "database";
  return "local";
}

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    const type = resolveStorageType();
    switch (type) {
      case "netlify":
        storageInstance = new NetlifyBlobsStorageAdapter();
        break;
      case "database":
        storageInstance = new DatabaseStorageAdapter();
        break;
      case "local":
      default:
        storageInstance = new LocalStorageAdapter();
    }
  }
  return storageInstance;
}
