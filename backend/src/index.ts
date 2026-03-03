import express, { Express, Request, Response, NextFunction } from 'express';
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

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Create Express app
const app: Express = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (increased for testing)
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session middleware (required for Google OAuth state handling)
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
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
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API root
app.get('/api', (req: Request, res: Response) => {
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
import publicRoutes from './routes/public';
import userRoutes from './routes/user';
import friendsRoutes from './routes/friends';
import inviteRoutes from './routes/invite';
import aiRoutes from './routes/ai';

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/user', userRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/ai', aiRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
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

// Start server
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');

    // Create first admin if needed
    await createFirstAdmin();

    // Start listening
    app.listen(PORT, () => {
      console.log(`
========================================
  Fair Marketplace Backend Server
========================================
  Environment: ${process.env.NODE_ENV || 'development'}
  Server running on: http://localhost:${PORT}
  API root: http://localhost:${PORT}/api
  Health check: http://localhost:${PORT}/health
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

// Start the server
startServer();
