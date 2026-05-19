import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import {
  sendApplicationReceivedEmail,
  sendNewApplicationAdminEmail,
} from '../utils/notifications';

// Public-facing vendor application flow.
//
// Unlike /api/vendor/* (which is gated by requireVendor), these routes are
// open to any authenticated account. A regular `user` fills in the
// application form and only becomes a `vendor` once an admin approves it
// (see admin.ts approve handler). A minimal VendorProfile is created on
// first submit so the existing Application -> VendorProfile FK still holds
// and the admin panel keeps working unchanged.

const router = Router();

router.use(authenticateToken);

// The application form has no fair picker; every application targets the
// single open fair. Prefer an active fair, fall back to the soonest upcoming.
async function resolveOpenFair() {
  const active = await prisma.fair.findFirst({
    where: { status: 'active' },
    orderBy: { startDate: 'asc' },
  });
  if (active) return active;
  return prisma.fair.findFirst({
    where: { status: 'upcoming' },
    orderBy: { startDate: 'asc' },
  });
}

// A house is unavailable for a fair if it has a pending/approved booking OR
// a pending/approved application. Mirrors the availability logic in
// public.ts so the form modal and the public map agree.
async function occupiedHouseIds(fairId: string): Promise<Set<string>> {
  const [bookings, applications] = await Promise.all([
    prisma.booking.findMany({
      where: { fairId, bookingStatus: { in: ['pending', 'approved'] } },
      select: { vendorHouseId: true },
    }),
    prisma.application.findMany({
      where: { fairId, status: { in: ['pending', 'approved'] } },
      select: { vendorHouseId: true },
    }),
  ]);
  const set = new Set<string>();
  bookings.forEach((b) => set.add(b.vendorHouseId));
  applications.forEach((a) => set.add(a.vendorHouseId));
  return set;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Houses with availability for the in-form map modal. Unlike the public
// vendor-houses endpoint (which hides availability from non-privileged
// viewers), an applicant must see which houses are free to apply for.
router.get('/available-houses', async (req: Request, res: Response): Promise<void> => {
  try {
    const fair = await resolveOpenFair();
    if (!fair) {
      res.json({ fair: null, houses: [] });
      return;
    }

    const houses = await prisma.vendorHouse.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        houseNumber: true,
        areaSqm: true,
        price: true,
        description: true,
        visitorStory: true,
        latitude: true,
        longitude: true,
        panorama360Url: true,
      },
      orderBy: { houseNumber: 'asc' },
    });

    const occupied = await occupiedHouseIds(fair.id);

    res.json({
      fair: { id: fair.id, name: fair.name },
      houses: houses.map((h) => ({
        ...h,
        // 'free' = selectable; 'occupied' = rented/approved or pending app.
        availability: occupied.has(h.id) ? 'occupied' : 'free',
      })),
    });
  } catch (error) {
    console.error('Get available houses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Current user's own applications (the profile "Applications" tab). Works for
// `user` role too — unlike GET /api/vendor/applications which is vendor-gated.
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendorProfile) {
      res.json({ applications: [] });
      return;
    }

    const applications = await prisma.application.findMany({
      where: { vendorProfileId: vendorProfile.id },
      include: {
        fair: { select: { id: true, name: true, startDate: true, endDate: true, status: true } },
        vendorHouse: { select: { id: true, houseNumber: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      applications: applications.map((app) => ({
        id: app.id,
        status: app.status,
        submittedAt: app.submittedAt,
        reviewedAt: app.reviewedAt,
        rejectionReason: app.rejectionReason,
        fairId: app.fair.id,
        fairName: app.fair.name,
        fairStartDate: app.fair.startDate,
        fairEndDate: app.fair.endDate,
        fairStatus: app.fair.status,
        houseId: app.vendorHouse.id,
        houseNumber: app.vendorHouse.houseNumber,
      })),
    });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit a new vendor application.
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      patronymic,
      email,
      code,
      codeConfirmation,
      phone,
      idSeries,
      idNumber,
      financialId,
      dateOfBirth,
      houseNumber,
      country,
      city,
      rulesAccepted,
      paymentAccepted,
    } = req.body;

    // --- Required-field & format validation (server-side; never trust UI) ---
    const trimmed = {
      firstName: typeof firstName === 'string' ? firstName.trim() : '',
      lastName: typeof lastName === 'string' ? lastName.trim() : '',
      patronymic: typeof patronymic === 'string' ? patronymic.trim() : '',
      email: typeof email === 'string' ? email.trim() : '',
      phone: typeof phone === 'string' ? phone.trim() : '',
      idSeries: typeof idSeries === 'string' ? idSeries.trim() : '',
      idNumber: typeof idNumber === 'string' ? idNumber.trim() : '',
      financialId: typeof financialId === 'string' ? financialId.trim() : '',
      houseNumber: typeof houseNumber === 'string' ? houseNumber.trim() : '',
      country: typeof country === 'string' ? country.trim() : '',
      city: typeof city === 'string' ? city.trim() : '',
    };

    const missing = Object.entries(trimmed)
      .filter(([, v]) => v.length === 0)
      .map(([k]) => k);
    if (missing.length > 0) {
      res.status(400).json({ error: 'All fields are required', missing });
      return;
    }

    if (!isValidEmail(trimmed.email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    if (!code || !codeConfirmation || code !== codeConfirmation) {
      res.status(400).json({ error: 'Code and code confirmation must match' });
      return;
    }

    if (rulesAccepted !== true || paymentAccepted !== true) {
      res.status(400).json({ error: 'You must accept the rules and payment terms' });
      return;
    }

    const dob = dateOfBirth ? new Date(dateOfBirth) : null;
    if (!dob || isNaN(dob.getTime())) {
      res.status(400).json({ error: 'Invalid date of birth' });
      return;
    }

    // --- Resolve the open fair ---
    const fair = await resolveOpenFair();
    if (!fair) {
      res.status(400).json({ error: 'No active or upcoming fair is open for applications' });
      return;
    }

    // --- House existence / availability ---
    const house = await prisma.vendorHouse.findUnique({
      where: { houseNumber: trimmed.houseNumber },
    });
    if (!house) {
      res.status(404).json({ error: 'House not found', code: 'HOUSE_NOT_FOUND' });
      return;
    }
    if (!house.isEnabled) {
      res.status(400).json({ error: 'This house is not available', code: 'HOUSE_OCCUPIED' });
      return;
    }
    const occupied = await occupiedHouseIds(fair.id);
    if (occupied.has(house.id)) {
      res.status(400).json({
        error: 'This house is already occupied or has a pending application',
        code: 'HOUSE_OCCUPIED',
      });
      return;
    }

    // --- One pending application per user ---
    let vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (vendorProfile) {
      const existingPending = await prisma.application.findFirst({
        where: { vendorProfileId: vendorProfile.id, status: 'pending' },
      });
      if (existingPending) {
        res.status(400).json({
          error: 'You already have a pending application',
          code: 'DUPLICATE_APPLICATION',
        });
        return;
      }
    }

    // --- Auto-create a minimal VendorProfile so the FK + admin panel hold ---
    if (!vendorProfile) {
      vendorProfile = await prisma.vendorProfile.create({
        data: {
          userId: req.user!.id,
          companyName: `${trimmed.firstName} ${trimmed.lastName}`.trim(),
        },
      });
    }

    // Backfill the User's name/phone if empty so the admin Users table and
    // applications list (which derive contact from User) stay meaningful.
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        firstName: req.user!.firstName || trimmed.firstName,
        lastName: req.user!.lastName || trimmed.lastName,
        phone: trimmed.phone,
      },
    });

    const application = await prisma.application.create({
      data: {
        vendorProfileId: vendorProfile.id,
        fairId: fair.id,
        vendorHouseId: house.id,
        status: 'pending',
        submittedAt: new Date(),
        firstName: trimmed.firstName,
        lastName: trimmed.lastName,
        patronymic: trimmed.patronymic,
        applicantEmail: trimmed.email,
        applicantPhone: trimmed.phone,
        idSeries: trimmed.idSeries,
        idNumber: trimmed.idNumber,
        financialId: trimmed.financialId,
        dateOfBirth: dob,
        country: trimmed.country,
        city: trimmed.city,
        rulesAccepted: true,
        paymentAccepted: true,
      },
      include: { fair: true, vendorHouse: true },
    });

    // --- Notifications: applicant + all admins ---
    const applicantName = `${trimmed.firstName} ${trimmed.lastName}`.trim();
    const emailCtx = {
      applicantName,
      applicantEmail: trimmed.email,
      houseNumber: house.houseNumber,
      fairName: fair.name,
      submittedAt: application.submittedAt,
    };
    const submitter = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { preferredLanguage: true },
    });
    sendApplicationReceivedEmail({ ...emailCtx, lang: submitter?.preferredLanguage });

    const admins = await prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { email: true },
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    admins.forEach((a) =>
      sendNewApplicationAdminEmail(a.email, emailCtx, `${frontendUrl}/admin/applications`)
    );

    res.status(201).json({
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
        fairId: application.fair.id,
        fairName: application.fair.name,
        houseId: application.vendorHouse.id,
        houseNumber: application.vendorHouse.houseNumber,
      },
    });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
