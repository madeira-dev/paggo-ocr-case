import { Request } from 'express';
import { User as PrismaUser } from '../../../generated/prisma';

export interface AuthenticatedRequest extends Request {
    user: Omit<PrismaUser, 'password'>;
}