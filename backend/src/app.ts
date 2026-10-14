import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import rfqRoutes from './routes/rfq.routes';
import attachmentRoutes from './routes/attachment.routes';
import adminRoutes from './routes/admin.routes';
import vendorRoutes from './routes/vendor.routes';
import buyerRoutes from './routes/buyer.routes';
import swaggerRoutes from './docs/swagger.routes';
import { errorHandler } from './middleware/error.middleware';

export const createApp = (): Application => {
  const app = express();

  // 1. Security Headers (configured to allow Swagger UI inline styles and scripts)
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  // 2. CORS Allow-list
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 3. Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // 5. Mount API Routes
  app.use('/api/docs', swaggerRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/rfqs', rfqRoutes);
  app.use('/api/attachments', attachmentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/vendor', vendorRoutes);
  app.use('/api/buyer', buyerRoutes);

  // 6. Unknown route 404 fallback
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested API endpoint does not exist',
      },
    });
  });

  // 7. Global Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
