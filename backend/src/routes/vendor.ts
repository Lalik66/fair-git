import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index';
import { authenticateToken, requireVendor } from '../middleware/auth';

const router = Router();

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/logos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

// Configure multer for product image uploads
const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

const productImageUpload = multer({
  storage: productImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

// All vendor routes require authentication and vendor role
router.use(authenticateToken);
router.use(requireVendor);

// Get vendor's bookings
router.get('/bookings', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the vendor profile for the current user
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    // Get all bookings for this vendor
    const bookings = await prisma.booking.findMany({
      where: { vendorProfileId: vendorProfile.id },
      include: {
        fair: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
            locationAddress: true,
          },
        },
        vendorHouse: {
          select: {
            id: true,
            houseNumber: true,
            areaSqm: true,
            price: true,
            description: true,
          },
        },
        application: {
          select: {
            id: true,
            submittedAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format bookings for frontend
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      bookingStatus: booking.bookingStatus,
      startDate: booking.startDate,
      endDate: booking.endDate,
      createdAt: booking.createdAt,
      // Fair info
      fairId: booking.fair.id,
      fairName: booking.fair.name,
      fairStartDate: booking.fair.startDate,
      fairEndDate: booking.fair.endDate,
      fairStatus: booking.fair.status,
      fairLocation: booking.fair.locationAddress,
      // House info
      houseId: booking.vendorHouse.id,
      houseNumber: booking.vendorHouse.houseNumber,
      houseArea: booking.vendorHouse.areaSqm,
      housePrice: booking.vendorHouse.price,
      houseDescription: booking.vendorHouse.description,
      // Application info
      applicationId: booking.application.id,
      applicationSubmittedAt: booking.application.submittedAt,
    }));

    res.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Get vendor bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vendor profile - contact info
router.put('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone, email, companyName, businessDescription, productCategory } = req.body;

    // Get current vendor profile
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== req.user!.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingUser && existingUser.id !== req.user!.id) {
        res.status(400).json({ error: 'Email is already in use by another account' });
        return;
      }
    }

    // Update user contact info
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email ? email.toLowerCase() : undefined,
      },
    });

    // Update vendor profile (company info)
    await prisma.vendorProfile.update({
      where: { id: vendorProfile.id },
      data: {
        companyName: companyName !== undefined ? companyName : undefined,
        businessDescription: businessDescription !== undefined ? businessDescription : undefined,
        productCategory: productCategory !== undefined ? productCategory : undefined,
      },
    });

    // Get updated profile
    const updatedProfile = await prisma.vendorProfile.findUnique({
      where: { id: vendorProfile.id },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        productImages: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: updatedProfile!.id,
        companyName: updatedProfile!.companyName,
        businessDescription: updatedProfile!.businessDescription,
        productCategory: updatedProfile!.productCategory,
        logoUrl: updatedProfile!.logoUrl,
        contactEmail: updatedProfile!.user.email,
        contactName: `${updatedProfile!.user.firstName || ''} ${updatedProfile!.user.lastName || ''}`.trim(),
        firstName: updatedProfile!.user.firstName,
        lastName: updatedProfile!.user.lastName,
        contactPhone: updatedProfile!.user.phone,
        productImages: updatedProfile!.productImages.map(img => ({
          id: img.id,
          imageUrl: img.imageUrl,
          orderIndex: img.orderIndex,
        })),
      },
    });
  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor profile
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        productImages: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    res.json({
      profile: {
        id: vendorProfile.id,
        companyName: vendorProfile.companyName,
        businessDescription: vendorProfile.businessDescription,
        productCategory: vendorProfile.productCategory,
        logoUrl: vendorProfile.logoUrl,
        contactEmail: vendorProfile.user.email,
        contactName: `${vendorProfile.user.firstName || ''} ${vendorProfile.user.lastName || ''}`.trim(),
        firstName: vendorProfile.user.firstName,
        lastName: vendorProfile.user.lastName,
        contactPhone: vendorProfile.user.phone,
        productImages: vendorProfile.productImages.map(img => ({
          id: img.id,
          imageUrl: img.imageUrl,
          orderIndex: img.orderIndex,
        })),
      },
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor's applications
router.get('/applications', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    const applications = await prisma.application.findMany({
      where: { vendorProfileId: vendorProfile.id },
      include: {
        fair: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        vendorHouse: {
          select: {
            id: true,
            houseNumber: true,
            areaSqm: true,
            price: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Format applications - note: adminNotes should NOT be included for vendors
    const formattedApplications = applications.map(app => ({
      id: app.id,
      submittedAt: app.submittedAt,
      status: app.status,
      rejectionReason: app.rejectionReason,
      reviewedAt: app.reviewedAt,
      // Fair info
      fairId: app.fair.id,
      fairName: app.fair.name,
      fairStartDate: app.fair.startDate,
      fairEndDate: app.fair.endDate,
      fairStatus: app.fair.status,
      // House info
      houseId: app.vendorHouse.id,
      houseNumber: app.vendorHouse.houseNumber,
      houseArea: app.vendorHouse.areaSqm,
      housePrice: app.vendorHouse.price,
    }));

    res.json({ applications: formattedApplications });
  } catch (error) {
    console.error('Get vendor applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit a new application
router.post('/applications', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fairId, vendorHouseId } = req.body;

    if (!fairId || !vendorHouseId) {
      res.status(400).json({ error: 'Fair ID and Vendor House ID are required' });
      return;
    }

    // Get vendor profile
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: true,
      },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    // Verify fair exists and is active/upcoming
    const fair = await prisma.fair.findUnique({
      where: { id: fairId },
    });

    if (!fair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }

    if (fair.status !== 'active' && fair.status !== 'upcoming') {
      res.status(400).json({ error: 'Applications can only be submitted for active or upcoming fairs' });
      return;
    }

    // Verify vendor house exists
    const vendorHouse = await prisma.vendorHouse.findUnique({
      where: { id: vendorHouseId },
    });

    if (!vendorHouse) {
      res.status(404).json({ error: 'Vendor house not found' });
      return;
    }

    if (!vendorHouse.isEnabled) {
      res.status(400).json({ error: 'This house is currently not available for applications' });
      return;
    }

    // Check if vendor already has an application for this fair and house
    const existingApplication = await prisma.application.findFirst({
      where: {
        vendorProfileId: vendorProfile.id,
        fairId: fairId,
        vendorHouseId: vendorHouseId,
      },
    });

    if (existingApplication) {
      res.status(400).json({ error: 'You have already submitted an application for this house at this fair' });
      return;
    }

    // Check if the house is already booked for this fair
    const existingBooking = await prisma.booking.findFirst({
      where: {
        vendorHouseId: vendorHouseId,
        fairId: fairId,
        bookingStatus: { in: ['pending', 'approved'] },
      },
    });

    if (existingBooking) {
      res.status(400).json({ error: 'This house is already booked for this fair' });
      return;
    }

    // Create the application
    const application = await prisma.application.create({
      data: {
        vendorProfileId: vendorProfile.id,
        fairId: fairId,
        vendorHouseId: vendorHouseId,
        status: 'pending',
        submittedAt: new Date(),
      },
      include: {
        fair: true,
        vendorHouse: true,
      },
    });

    // Send email notification (logged to console in development)
    const userLang = vendorProfile.user.preferredLanguage || 'az';
    const vendorName = vendorProfile.user.firstName || 'Vendor';
    const companyName = vendorProfile.companyName || 'Your Company';
    const fairName = fair.name;
    const houseNumber = vendorHouse.houseNumber;
    const fairStartDate = fair.startDate.toISOString().split('T')[0];
    const fairEndDate = fair.endDate.toISOString().split('T')[0];

    console.log('='.repeat(60));
    console.log(`EMAIL NOTIFICATION (Development Mode) - Language: ${userLang.toUpperCase()}`);
    console.log('='.repeat(60));
    console.log(`To: ${vendorProfile.user.email}`);

    if (userLang === 'en') {
      console.log(`Subject: Application Received - ${fairName}`);
      console.log('');
      console.log(`Dear ${vendorName},`);
      console.log('');
      console.log(`Thank you for submitting your application for ${fairName}!`);
      console.log('');
      console.log('Application Details:');
      console.log(`  - Company: ${companyName}`);
      console.log(`  - Fair: ${fairName}`);
      console.log(`  - House Number: ${houseNumber}`);
      console.log(`  - Fair Dates: ${fairStartDate} to ${fairEndDate}`);
      console.log('');
      console.log('Your application is now being reviewed by our team. You will receive');
      console.log('an email notification once your application has been processed.');
      console.log('');
      console.log('Thank you for your interest in participating in our fair!');
    } else {
      // Azerbaijani
      console.log(`Mövzu: Müraciət Qəbul Edildi - ${fairName}`);
      console.log('');
      console.log(`Hörmətli ${vendorName},`);
      console.log('');
      console.log(`${fairName} üçün müraciətinizi göndərdiyiniz üçün təşəkkür edirik!`);
      console.log('');
      console.log('Müraciət Detalları:');
      console.log(`  - Şirkət: ${companyName}`);
      console.log(`  - Yarmarka: ${fairName}`);
      console.log(`  - Ev Nömrəsi: ${houseNumber}`);
      console.log(`  - Yarmarka Tarixləri: ${fairStartDate} - ${fairEndDate}`);
      console.log('');
      console.log('Müraciətiniz hazırda komandamız tərəfindən nəzərdən keçirilir.');
      console.log('Müraciətiniz işləndikdən sonra e-poçt bildirişi alacaqsınız.');
      console.log('');
      console.log('Yarmarkamızda iştirak etmək marağınıza görə təşəkkür edirik!');
    }
    console.log('='.repeat(60));

    res.status(201).json({
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
        fairId: application.fair.id,
        fairName: application.fair.name,
        fairStartDate: application.fair.startDate,
        fairEndDate: application.fair.endDate,
        houseId: application.vendorHouse.id,
        houseNumber: application.vendorHouse.houseNumber,
        houseArea: application.vendorHouse.areaSqm,
        housePrice: application.vendorHouse.price,
      },
    });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload or replace vendor logo
router.post('/logo', logoUpload.single('logo'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    // Delete old logo file if it exists
    if (vendorProfile.logoUrl) {
      const oldLogoPath = vendorProfile.logoUrl.replace('/uploads/', '');
      const fullOldPath = path.join(__dirname, '../../uploads/', oldLogoPath);
      if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
      }
    }

    // Construct the URL for the uploaded file
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Update the vendor profile with the new logo URL
    const updatedProfile = await prisma.vendorProfile.update({
      where: { id: vendorProfile.id },
      data: { logoUrl },
    });

    res.json({
      message: 'Logo uploaded successfully',
      logoUrl: updatedProfile.logoUrl,
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Delete vendor logo
router.delete('/logo', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    if (!vendorProfile.logoUrl) {
      res.status(400).json({ error: 'No logo to delete' });
      return;
    }

    // Delete the logo file
    const logoPath = vendorProfile.logoUrl.replace('/uploads/', '');
    const fullPath = path.join(__dirname, '../../uploads/', logoPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Update the vendor profile to remove the logo URL
    await prisma.vendorProfile.update({
      where: { id: vendorProfile.id },
      data: { logoUrl: null },
    });

    res.json({ message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Logo delete error:', error);
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});



// Upload product image
router.post('/product-images', productImageUpload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
      include: { productImages: true },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    // Check if already at max (5 images)
    if (vendorProfile.productImages.length >= 5) {
      // Delete the uploaded file
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'Maximum of 5 product images allowed' });
      return;
    }

    // Calculate next order index
    const maxOrderIndex = vendorProfile.productImages.reduce((max, img) =>
      Math.max(max, img.orderIndex), -1);
    const nextOrderIndex = maxOrderIndex + 1;

    // Create the product image record
    const imageUrl = `/uploads/products/${req.file.filename}`;
    const productImage = await prisma.vendorProductImage.create({
      data: {
        vendorProfileId: vendorProfile.id,
        imageUrl,
        orderIndex: nextOrderIndex,
      },
    });

    res.json({
      message: 'Product image uploaded successfully',
      productImage: {
        id: productImage.id,
        imageUrl: productImage.imageUrl,
        orderIndex: productImage.orderIndex,
      },
    });
  } catch (error) {
    console.error('Product image upload error:', error);
    res.status(500).json({ error: 'Failed to upload product image' });
  }
});

// Delete product image
router.delete('/product-images/:imageId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageId } = req.params;

    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    // Find the image and verify it belongs to this vendor
    const productImage = await prisma.vendorProductImage.findFirst({
      where: {
        id: imageId,
        vendorProfileId: vendorProfile.id,
      },
    });

    if (!productImage) {
      res.status(404).json({ error: 'Product image not found' });
      return;
    }

    // Delete the file
    const imagePath = productImage.imageUrl.replace('/uploads/', '');
    const fullPath = path.join(__dirname, '../../uploads/', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Delete the database record
    await prisma.vendorProductImage.delete({
      where: { id: imageId },
    });

    res.json({ message: 'Product image deleted successfully' });
  } catch (error) {
    console.error('Product image delete error:', error);
    res.status(500).json({ error: 'Failed to delete product image' });
  }
});

export default router;
