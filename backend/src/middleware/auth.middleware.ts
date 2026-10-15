import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AppError } from './error.middleware';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-replace-with-secure-key-in-prod';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token missing or invalid format'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    if (!decoded || !decoded.id || !decoded.role) {
      return next(new AppError(401, 'INVALID_TOKEN', 'Token payload is missing required claims'));
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name || '',
    };
    next();
  } catch (err: any) {
    if (err instanceof AppError) {
      return next(err);
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Authentication token has expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError(401, 'INVALID_TOKEN', 'Authentication token is invalid'));
    }
    return next(err);
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', `Access forbidden: requires one of [${allowedRoles.join(', ')}] role`));
    }

    next();
  };
};

export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    if (decoded && decoded.id && decoded.role) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name || '',
      };
    }
    next();
  } catch (_err) {
    next();
  }
};


