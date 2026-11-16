import { Request } from 'express';
import { AuthenticatedUser } from '../../types/express.js';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
}
