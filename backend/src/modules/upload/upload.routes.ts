import { Router, IRouter, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { getStorageService } from '../../shared/storage/index.js';
import { success } from '../../shared/utils/response.js';
import { AppError } from '../../shared/errors/AppError.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Unsupported file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`, 422));
    }
  },
});

// Mounted at /api/v1/admin/upload
export const uploadRouter: IRouter = Router();

uploadRouter.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded. Send a multipart/form-data request with field "file".', 422);
      const url = await getStorageService().upload(req.file);
      success(res, { url }, 201);
    } catch (err) {
      next(err);
    }
  },
);

// Translate multer size errors into clean AppErrors
uploadRouter.use((err: unknown, _req: Request, _res: Response, next: NextFunction) => {
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return next(new AppError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`, 422));
  }
  next(err);
});
