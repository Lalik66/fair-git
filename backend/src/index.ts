import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { initializePassport } from './config/passport';
import { initializeWebSocket } from './websocket';
import { startHeatmapAggregator } from './services/heatmapService';
import { SESSION_SECRET } from './config/env';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Create Express app. Exported so the test suite can drive it with supertest
// without booting the HTTP/WebSocket server (see the require.main guard below).
export const app: Express = express();
const PORT = Number.parseInt(process.env.PORT || '', 10) || 3002;

// Trust the first proxy hop in production (e.g. Nginx / a load balancer) so
// req.ip reflects the real client from X-Forwarded-For. Without this every
// client shares the proxy's IP, collapsing all per-IP rate limiters (login
// brute-force, SOS, AI) into a single global bucket. In dev there is no proxy,
// so trust nothing and use the socket address directly.
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting. A sane global cap that blunts scraping/brute force while
// leaving headroom for legitimate map/polling traffic. Sensitive actions
// (login, SOS, AI) have their own tighter per-route limiters. Overridable via
// RATE_LIMIT_MAX for load testing without editing code.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.RATE_LIMIT_MAX || '', 10) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session middleware (required for Google OAuth state handling)
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize Passport for OAuth authentication
initializePassport();
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API root
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Fair Marketplace API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      vendor: '/api/vendor',
      public: '/api/public',
    },
  });
});

// Import and use route modules
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import vendorRoutes from './routes/vendor';
import applicationRoutes from './routes/applications';
import publicRoutes from './routes/public';
import userRoutes from './routes/user';
import friendsRoutes from './routes/friends';
import inviteRoutes from './routes/invite';
import aiRoutes from './routes/ai';
import messagesRoutes, { setSocketIO } from './routes/messages';
import reactionsRoutes, { setSocketIO as setReactionsSocketIO } from './routes/reactions';
import analyticsRoutes from './routes/analytics';
import pinsRoutes from './routes/pins';
import zonesRoutes from './routes/zones';
import eventsRoutes from './routes/events';
import qrRoutes from './routes/qr';
import bannersRoutes from './routes/banners';
import reviewsRoutes from './routes/reviews';
import feedbackRoutes from './routes/feedback';
import marketingLeadsRoutes from './routes/marketing-leads';
import sosRoutes from './routes/sos';
import { setSosSocketIO } from './services/sosService';

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/user', userRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/friends/messages', messagesRoutes);
app.use('/api/friends/reactions', reactionsRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/pins', pinsRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/public/marketing-leads', marketingLeadsRoutes);
app.use('/api/sos', sosRoutes);

// 404 handler (must be registered after all routes, before the error handler)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handling middleware (4-arg signature so Express treats it as the
// terminal error handler). Registered last.
app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.statusCode || err.status || 500;

  console.error('Error:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error('Stack:', err.stack);
  }

  // Client (4xx) errors carry a safe, intentional message and may be surfaced.
  // Server (5xx) errors must never leak internal details to the client in any
  // environment — details stay in the server logs above.
  const isClientError = status >= 400 && status < 500;
  res.status(status).json({
    error: isClientError ? 'Bad Request' : 'Internal Server Error',
    message: isClientError ? err.message : 'Something went wrong',
  });
});

// Function to create first admin on startup
async function createFirstAdmin(): Promise<void> {
  const firstAdminEmail = process.env.FIRST_ADMIN_EMAIL;
  const firstAdminPassword = process.env.FIRST_ADMIN_PASSWORD;

  if (!firstAdminEmail || !firstAdminPassword) {
    console.log('First admin environment variables not set, skipping auto-creation.');
    return;
  }

  try {
    // Check if any admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (existingAdmin) {
      console.log('Admin account already exists, skipping creation.');
      return;
    }

    // Create first admin
    const passwordHash = await bcrypt.hash(firstAdminPassword, 10);

    await prisma.user.create({
      data: {
        email: firstAdminEmail.toLowerCase(),
        firstName: process.env.FIRST_ADMIN_FIRSTNAME || 'Admin',
        lastName: process.env.FIRST_ADMIN_LASTNAME || 'User',
        role: 'admin',
        passwordHash,
        mustChangePassword: false, // First admin doesn't need to change password
        isActive: true,
      },
    });

    console.log(`First admin account created: ${firstAdminEmail}`);
  } catch (error) {
    console.error('Error creating first admin:', error);
  }
}

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Start server
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');

    // Create first admin if needed
    await createFirstAdmin();

    // Initialize WebSocket server
    const io = initializeWebSocket(httpServer);

    // Set Socket.io instance for messages routes
    setSocketIO(io);
    setReactionsSocketIO(io);
    setSosSocketIO(io);

    console.log('WebSocket server initialized');

    // Periodic crowd-density aggregation for the map heatmap layer.
    startHeatmapAggregator(io);

    // Start listening
    httpServer.listen(PORT, () => {
      console.log(`
========================================
  Fair Marketplace Backend Server
========================================
  Environment: ${process.env.NODE_ENV || 'development'}
  Server running on: http://localhost:${PORT}
  API root: http://localhost:${PORT}/api
  Health check: http://localhost:${PORT}/health
  WebSocket: ws://localhost:${PORT}
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server only when this module is executed directly (e.g.
// `node dist/index.js` or ts-node-dev). Importing it — as the test suite does
// transitively via reviewService — must not boot the HTTP server or connect to
// the database.
if (require.main === module) {
  startServer();
}
