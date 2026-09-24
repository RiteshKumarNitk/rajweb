import { getStore } from "@netlify/blobs";
import type { StorageAdapter } from "@/infrastructure/storage/storage-adapter";

export class NetlifyBlobsStorageAdapter implements StorageAdapter {
  private storeName: string;

  constructor() {
    this.storeName = process.env.NETLIFY_BLOBS_STORE || "rra-uploads";
  }

  private getStore() {
    return getStore({ name: this.storeName, consistency: "strong" });
  }

  async upload(file: Buffer, filename: string, folder = ""): Promise<string> {
    const key = folder ? `${folder}/${filename}` : filename;
    const store = this.getStore();
    const bytes = Uint8Array.from(file);
    await store.set(key, new Blob([bytes], { type: "application/pdf" }), {
      metadata: { contentType: "application/pdf" },
    });
    return key;
  }

  async delete(filePath: string): Promise<void> {
    const store = this.getStore();
    await store.delete(filePath);
  }

  getUrl(filePath: string): string {
    return `/api/files/${filePath.split("/").map(encodeURIComponent).join("/")}`;
  }
}
