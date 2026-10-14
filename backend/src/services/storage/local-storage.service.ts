import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { StorageProvider, SavedFile } from './storage.interface';

export class LocalDiskStorage implements StorageProvider {
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir || process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async save(fileBuffer: Buffer, extension: string): Promise<SavedFile> {
    this.ensureDirectoryExists();

    // Enforce random UUID stored filename to prevent path traversal & collisions
    const cleanExt = extension.startsWith('.') ? extension : `.${extension}`;
    const storedFilename = `${crypto.randomUUID()}${cleanExt}`;
    const fullPath = path.join(this.uploadDir, storedFilename);

    await fs.promises.writeFile(fullPath, fileBuffer);

    return {
      storedFilename,
      filePath: fullPath,
      fileSize: fileBuffer.length,
    };
  }

  getStream(filePath: string): Readable {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    return fs.createReadStream(filePath);
  }

  async delete(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    return fs.existsSync(filePath);
  }
}

export const defaultStorage = new LocalDiskStorage();
