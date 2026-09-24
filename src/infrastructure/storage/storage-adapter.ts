import { NetlifyBlobsStorageAdapter } from "./netlify-blobs-adapter";

export interface StorageAdapter {
  upload(file: Buffer, filename: string, folder?: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;
  private publicUrl: string;

  constructor() {
    this.basePath = process.env.STORAGE_LOCAL_PATH || "./uploads";
    this.publicUrl = process.env.STORAGE_PUBLIC_URL || "/uploads";
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

  getUrl(filePath: string): string {
    return `${this.publicUrl}/${filePath}`;
  }
}

let storageInstance: StorageAdapter | null = null;

function resolveStorageType(): string {
  if (process.env.STORAGE_TYPE) return process.env.STORAGE_TYPE;
  if (process.env.NETLIFY === "true") return "netlify";
  return "local";
}

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    const type = resolveStorageType();
    switch (type) {
      case "netlify":
        storageInstance = new NetlifyBlobsStorageAdapter();
        break;
      case "local":
      default:
        storageInstance = new LocalStorageAdapter();
    }
  }
  return storageInstance;
}
