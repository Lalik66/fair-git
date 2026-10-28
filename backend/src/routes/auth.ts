import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import passport from 'passport';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import { isGoogleOAuthConfigured } from '../config/passport';
import { JWT_SECRET } from '../config/env';
import { sendPasswordResetEmail } from '../utils/notifications';

const router = Router();

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

    // A soft-deleted account no longer exists from the user's point of view,
    // so answer exactly as for an unknown email rather than "deactivated".
    if (!user || user.deletedAt) {
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
      { expiresIn: '24h', algorithm: 'HS256' }
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
router.get('/oauth-status', (_req: Request, res: Response): void => {
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
    // Always show Google's account chooser. Without this, a browser with an
    // existing Google session is silently re-authenticated as that same
    // account, so a different user can never be selected.
    prompt: 'select_account',
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
        { expiresIn: '24h', algorithm: 'HS256' }
      );

      // Redirect to frontend OAuth callback page with token
      // Include isNewUser flag for first-time OAuth users (Feature 3 & 221: Role selection)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const isNewUser = (user as any).isNewUser ? '&newUser=true' : '';
      res.redirect(`${frontendUrl}/oauth-callback?token=${token}${isNewUser}`);
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

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // OAuth-only accounts have no passwordHash, so /change-password cannot
    // succeed for them. Without this clear error, a stale `mustChangePassword`
    // flag on an OAuth user would trap them in a ProtectedRoute redirect loop
    // (see frontend/src/components/ProtectedRoute.tsx). Currently latent
    // because OAuth users are created with mustChangePassword=false, but the
    // guard is cheap and removes the failure mode for good.
    if (!user.passwordHash) {
      res.status(400).json({
        error: 'OAUTH_ACCOUNT_NO_PASSWORD',
        message:
          'This account was created via Google sign-in and has no password set. ' +
          'Sign in with Google instead of using the password form.',
      });
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
// Forgot / Reset Password
// =====================================
//
// Stateless reset tokens: a short-lived JWT signed with JWT_SECRET *plus the
// user's current password hash*. No table is needed, and the token is
// single-use by construction — once the password changes, the hash changes and
// every outstanding link stops verifying. It also can't be used as a login
// token, because authenticateToken verifies with JWT_SECRET alone.

const RESET_TOKEN_TTL_MINUTES = 60;
const RESET_PURPOSE = 'password_reset';

const resetSecretFor = (passwordHash: string | null) => `${JWT_SECRET}:${passwordHash ?? ''}`;

// 5 reset emails per 15 minutes per IP, so the endpoint can't be used to spam
// an inbox.
const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/forgot-password  { email }
 * Always answers 200 with the same message, whether or not the email exists,
 * so the endpoint can't be used to discover which addresses have accounts.
 */
router.post('/forgot-password', forgotPasswordRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const genericResponse = {
    message: 'If an account exists for this email, a password reset link has been sent.',
  };

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Unknown, deleted or deactivated accounts get the same answer and no email.
    if (!user || user.deletedAt || !user.isActive) {
      res.json(genericResponse);
      return;
    }

    const token = jwt.sign(
      { sub: user.id, purpose: RESET_PURPOSE },
      resetSecretFor(user.passwordHash),
      { expiresIn: `${RESET_TOKEN_TTL_MINUTES}m`, algorithm: 'HS256' }
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

    sendPasswordResetEmail({
      email: user.email,
      name,
      resetUrl,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      lang: user.preferredLanguage,
    });

    res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/reset-password  { token, newPassword }
 * Sets a new password from a reset link. Also works for Google-only accounts,
 * which then gain a password alongside their Google sign-in.
 */
router.post('/reset-password', forgotPasswordRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    const invalidLink = () =>
      res.status(400).json({
        error: 'INVALID_RESET_TOKEN',
        message: 'This reset link is invalid or has expired. Please request a new one.',
      });

    // Read the user id first (unverified) to know which password hash the
    // token must be verified against; the real check is jwt.verify below.
    const decoded = jwt.decode(token) as { sub?: string; purpose?: string } | null;
    if (!decoded?.sub || decoded.purpose !== RESET_PURPOSE) {
      invalidLink();
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.deletedAt || !user.isActive) {
      invalidLink();
      return;
    }

    try {
      const payload = jwt.verify(token, resetSecretFor(user.passwordHash), {
        algorithms: ['HS256'],
      }) as { sub?: string; purpose?: string };
      if (payload.sub !== user.id || payload.purpose !== RESET_PURPOSE) {
        invalidLink();
        return;
      }
    } catch {
      // Expired, tampered with, or already used (password changed since).
      invalidLink();
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    res.json({ message: 'Password has been reset. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================
// Role Selection Routes (Feature 3 & 221)
// =====================================

/**
 * POST /api/auth/select-role
 * Allow a new OAuth user to select their role (visitor or vendor)
 * Feature 3: Google OAuth sign-in for visitors
 * Feature 221: First-time user onboarding via OAuth
 */
router.post('/select-role', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;

    // Validate role
    if (!role || !['user', 'vendor'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be "user" (visitor) or "vendor"' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Role selection is typically for new OAuth users
    // Allow changing from 'user' role
    if (user.role !== 'user' && role !== user.role) {
      res.status(400).json({
        error: 'Role has already been set. Use upgrade-to-vendor endpoint instead.'
      });
      return;
    }

    if (role === 'vendor') {
      // Upgrade to vendor and create vendor profile
      const result = await prisma.$transaction(async (tx) => {
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

        // Create vendor profile if it doesn't exist
        const existingProfile = await tx.vendorProfile.findUnique({
          where: { userId: req.user!.id }
        });

        if (!existingProfile) {
          await tx.vendorProfile.create({
            data: { userId: req.user!.id },
          });
        }

        return updatedUser;
      });

      res.json({
        message: 'Role set to vendor successfully',
        user: result
      });
    } else {
      // Keep as visitor (user role)
      const updatedUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
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

      res.json({
        message: 'Role set to visitor successfully',
        user: updatedUser
      });
    }
  } catch (error) {
    console.error('Select role error:', error);
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

      // Create vendor profile only if one doesn't already exist. A plain
      // 'user' can already own a VendorProfile (the public application flow
      // creates one), and VendorProfile.userId is @unique — an unconditional
      // create there throws P2002 and surfaces as a 500 on a normal upgrade.
      const existingProfile = await tx.vendorProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!existingProfile) {
        await tx.vendorProfile.create({
          data: {
            userId: req.user!.id,
          },
        });
      }

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
