import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import passport from 'passport';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import { isGoogleOAuthConfigured } from '../config/passport';

const router = Router();

// JWT_SECRET validation - fail loudly in production if not set
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('JWT_SECRET environment variable is required');
  // In development, use a default; in production, this should be set
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
}
const JWT_SECRET = jwtSecret || 'development-secret-do-not-use-in-production';

// Login rate limiter - 5 attempts per 15 minutes per IP
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Login endpoint with rate limiting
router.post('/login', loginRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: 'Account is deactivated' });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ error: 'Password login not available for this account' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        preferredLanguage: true,
        mustChangePassword: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but we track it server-side for logs)
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Log the logout action for admins
    if (req.user!.role === 'admin') {
      await prisma.adminLog.create({
        data: {
          adminId: req.user!.id,
          action: 'logout',
          details: 'Admin logged out',
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update language preference
router.put('/language', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { language } = req.body;

    if (!language || !['az', 'en'].includes(language)) {
      res.status(400).json({ error: 'Invalid language. Must be "az" or "en"' });
      return;
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { preferredLanguage: language },
    });

    res.json({ message: 'Language preference updated', preferredLanguage: language });
  } catch (error) {
    console.error('Update language error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================
// Google OAuth Routes (Features 2, 3, 6, 221)
// =====================================

/**
 * GET /api/auth/oauth-status
 * Check if OAuth providers are configured (for frontend to conditionally show buttons)
 */
router.get('/oauth-status', (req: Request, res: Response): void => {
  res.json({
    googleEnabled: isGoogleOAuthConfigured(),
  });
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow (Feature 6)
 * Redirects user to Google's consent screen
 */
router.get('/google', (req: Request, res: Response, next: NextFunction): void => {
  if (!isGoogleOAuthConfigured()) {
    res.status(404).json({ error: 'Google OAuth is not configured on this server' });
    return;
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 * - Feature 2: Creates new account if user doesn't exist
 * - Feature 3: Logs in existing user
 * - Feature 221: Links Google account to existing email account
 */
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction): void => {
    if (!isGoogleOAuthConfigured()) {
      res.status(404).json({ error: 'Google OAuth is not configured on this server' });
      return;
    }

    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`,
    }, (err: Error | null, user: any) => {
      if (err) {
        console.error('Google OAuth callback error:', err);
        const errorMessage = encodeURIComponent(err.message || 'Authentication failed');
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=${errorMessage}`);
        return;
      }

      if (!user) {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=account_deactivated`);
        return;
      }

      // Generate JWT token (same as regular login)
      const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Redirect to frontend OAuth callback page with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/oauth-callback?token=${token}`);
    })(req, res, next);
  }
);

// =====================================
// Password-based Authentication Routes
// =====================================

// Change password
router.post('/change-password', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.passwordHash) {
      res.status(400).json({ error: 'Password change not available' });
      return;
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================
// Role Upgrade Routes (Feature 6)
// =====================================

/**
 * POST /api/auth/upgrade-to-vendor
 * Allow a visitor (role='user') to upgrade their account to vendor
 * Feature 6: Visitor upgrades to vendor role
 */
router.post('/upgrade-to-vendor', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Only visitors (role='user') can upgrade to vendor
    if (user.role !== 'user') {
      res.status(400).json({
        error: user.role === 'vendor'
          ? 'You are already a vendor'
          : 'Only visitors can upgrade to vendor role'
      });
      return;
    }

    // Upgrade role to vendor and create vendor profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user role
      const updatedUser = await tx.user.update({
        where: { id: req.user!.id },
        data: { role: 'vendor' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          preferredLanguage: true,
          mustChangePassword: true,
        },
      });

      // Create vendor profile
      await tx.vendorProfile.create({
        data: {
          userId: req.user!.id,
        },
      });

      return updatedUser;
    });

    res.json({
      message: 'Successfully upgraded to vendor role',
      user: result
    });
  } catch (error) {
    console.error('Upgrade to vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
