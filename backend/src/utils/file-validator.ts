import path from 'path';
import { AppError } from '../middleware/error.middleware';

export interface ValidatedFileResult {
  detectedType: 'pdf' | 'xlsx';
  extension: string;
  mimeType: string;
}

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.xlsx']);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', // Some browsers and OS send XLSX as generic ZIP
  'application/octet-stream', // Generic binary fallbacks
]);

/**
 * Validates extension, MIME type, and binary magic bytes.
 * Throws AppError(400) if any check fails.
 */
export function validateUploadedFile(file: Express.Multer.File): ValidatedFileResult {
  if (!file || !file.buffer) {
    throw new AppError(400, 'FILE_MISSING', 'No file was uploaded');
  }

  // 1. Validate File Size (10 MB limit)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.buffer.length > MAX_SIZE) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'Uploaded file exceeds the maximum 10 MB limit');
  }

  // 2. Validate Extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new AppError(
      400,
      'INVALID_EXTENSION',
      `File extension "${ext}" is not permitted. Only .pdf and .xlsx files are accepted.`
    );
  }

  // 3. Validate Reported MIME Type
  const reportedMime = file.mimetype.toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(reportedMime)) {
    throw new AppError(
      400,
      'INVALID_MIME_TYPE',
      `File MIME type "${reportedMime}" is not permitted. Only PDF and XLSX are accepted.`
    );
  }

  // 4. Validate Magic Bytes (True Binary Header)
  if (file.buffer.length < 4) {
    throw new AppError(400, 'CORRUPTED_FILE', 'File header is too short or corrupted');
  }

  const b0 = file.buffer[0];
  const b1 = file.buffer[1];
  const b2 = file.buffer[2];
  const b3 = file.buffer[3];

  const isPdfMagic = b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46; // %PDF
  const isZipMagic = b0 === 0x50 && b1 === 0x4b && b2 === 0x03 && b3 === 0x04; // PK\x03\x04 (ZIP container for XLSX)

  if (ext === '.pdf') {
    if (!isPdfMagic) {
      throw new AppError(
        400,
        'FAKE_EXTENSION',
        'File content does not match genuine PDF binary signature (magic bytes mismatch)'
      );
    }
    return {
      detectedType: 'pdf',
      extension: '.pdf',
      mimeType: 'application/pdf',
    };
  }

  if (ext === '.xlsx') {
    if (!isZipMagic) {
      throw new AppError(
        400,
        'FAKE_EXTENSION',
        'File content does not match genuine XLSX binary signature (magic bytes mismatch)'
      );
    }
    return {
      detectedType: 'xlsx',
      extension: '.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  throw new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF and XLSX documents are allowed');
}
