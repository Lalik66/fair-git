import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { prisma } from '../index';

/**
 * Configure Passport.js with Google OAuth 2.0 Strategy
 *
 * This configuration is optional - the app works without Google OAuth credentials.
 * When GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are provided, users can:
 * - Feature 2: Register with Google (creates new account)
 * - Feature 3: Login with Google (authenticates existing account)
 * - Feature 221: Link Google account to existing email-based account
 */

/**
 * Check if Google OAuth is properly configured with required environment variables
 */
export const isGoogleOAuthConfigured = (): boolean => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

/**
 * Initialize Passport Google OAuth strategy
 * Only configures the strategy if credentials are available
 */
export const initializePassport = (): void => {
  if (!isGoogleOAuthConfigured()) {
    console.log('Google OAuth not configured - GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET missing');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3002/api/auth/google/callback',
        scope: ['profile', 'email'],
        state: true,  // Explicitly enable CSRF state parameter
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ): Promise<void> => {
        try {
          // Extract email from Google profile
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email provided by Google. Please ensure your Google account has a verified email.'));
          }

          const googleId = profile.id;
          const displayName = profile.displayName || '';

          // Parse first and last name from display name
          const nameParts = displayName.split(' ');
          const firstName = nameParts[0] || null;
          const lastName = nameParts.slice(1).join(' ') || null;

          // First, check if user exists with this Google ID
          let user = await prisma.user.findUnique({
            where: { googleId },
          });

          if (user) {
            // User found by Google ID - this is a returning Google user (Feature 3: Login)
            // Update last login
            user = await prisma.user.update({
              where: { id: user.id },
              data: { lastLogin: new Date() },
            });
            return done(null, user);
          }

          // Check if user exists with this email (but without Google ID)
          user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
          });

          if (user) {
            // User exists with email but no Google ID - link accounts (Feature 221)
            if (user.googleId && user.googleId !== googleId) {
              // Email is already linked to a different Google account
              return done(new Error('This email is already linked to another account.'));
            }

            // Link Google account to existing user
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId,
                // Only update name if not already set
                firstName: user.firstName || firstName,
                lastName: user.lastName || lastName,
                lastLogin: new Date(),
              },
            });
            return done(null, user);
          }

          // No user exists - create new account (Feature 2 & 3: Register with Google)
          // Create with role='user' (visitor) - they can choose to become vendor later
          // or we redirect to role selection for first-time users
          user = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              googleId,
              firstName,
              lastName,
              role: 'user', // Default to visitor - needs role selection (Feature 3)
              passwordHash: null, // No password for OAuth-only users
              isActive: true,
              lastLogin: new Date(),
            },
          });

          // Mark this as a new user for the callback handler
          (user as any).isNewUser = true;

          return done(null, user);
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error as Error);
        }
      }
    )
  );

  // Serialize user for session (we use JWT, but passport requires these)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  console.log('Google OAuth strategy configured successfully');
};

export default passport;
