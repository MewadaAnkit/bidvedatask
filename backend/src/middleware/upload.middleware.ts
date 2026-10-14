import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
  },
});

export const singleFileUpload = (fieldName: string = 'file') => {
  const multerMiddleware = upload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    multerMiddleware(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(400, 'FILE_TOO_LARGE', 'Uploaded file exceeds the maximum 10 MB size limit'));
        }
        return next(new AppError(400, 'UPLOAD_ERROR', err.message));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};
