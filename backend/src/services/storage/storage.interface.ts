import { Readable } from 'stream';

export interface SavedFile {
  storedFilename: string;
  filePath: string;
  fileSize: number;
}

export interface StorageProvider {
  /**
   * Persists a file buffer into underlying storage (local disk, S3, etc.).
   */
  save(fileBuffer: Buffer, extension: string): Promise<SavedFile>;

  /**
   * Retrieves a readable stream for authenticated file delivery.
   */
  getStream(filePath: string): Readable;

  /**
   * Removes a file from storage.
   */
  delete(filePath: string): Promise<void>;

  /**
   * Verifies if a file exists in storage.
   */
  exists(filePath: string): Promise<boolean>;
}
