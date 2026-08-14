import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. Définition propre du Payload
export interface JwtUserPayload {
  id: string;
  role: string;
  email: string;
  pseudo: string;
  avatarUrl?: string;
  birthday?: string;    
  location?: {           
    city?: string;
    country?: string;
  };
}

// 2. Extension du type Request d'Express pour inclure l'utilisateur
// Cela permet d'éviter les "as any" partout dans le projet
declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // On vérifie d'abord le cookie, puis le header (pour rester flexible)
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const jwtSecret = process.env.JWT_SECRET;
  
  try {
    const payload = jwt.verify(token, jwtSecret!) as JwtUserPayload;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token =
    req.cookies.token ||
    req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET;

  try {
    const payload = jwt.verify(
      token,
      jwtSecret!
    ) as JwtUserPayload;

    req.user = payload;
  } catch {
    // Token absent/invalide : on continue simplement
    // comme visiteur anonyme.
  }

  next();
}

// 3. Gestionnaire de rôles générique
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
}


// 4. Shortcut pour l'admin (Plus propre et réutilisable)
export const requireAdmin = [requireAuth, requireRole(['admin'])];