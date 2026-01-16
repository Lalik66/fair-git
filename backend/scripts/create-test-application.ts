// Script to create a test application for testing email notifications
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestApplication(language: 'az' | 'en') {
  try {
    // Create a new test user
    const timestamp = Date.now();
    const email = `test-email-lang-${timestamp}@test.com`;

    const user = await prisma.user.create({
      data: {
        email,
        firstName: language === 'en' ? 'English' : 'Azərbaycanca',
        lastName: 'Test Vendor',
        role: 'vendor',
        preferredLanguage: language,
        passwordHash: '$2a$10$fakehashfortest',
      },
    });
    console.log(`Created user: ${user.email} with language: ${language}`);

    // Create vendor profile
    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        companyName: `Test Company ${language.toUpperCase()}`,
        businessDescription: `Test business for ${language} email notification testing`,
        productCategory: 'handicrafts',
      },
    });
    console.log(`Created vendor profile: ${vendorProfile.companyName}`);

    // Find an available house for the active fair
    const activeFair = await prisma.fair.findFirst({
      where: { status: 'active' },
    });

    if (!activeFair) {
      console.log('No active fair found. Looking for upcoming fair...');
      const upcomingFair = await prisma.fair.findFirst({
        where: { status: 'upcoming' },
      });
      if (!upcomingFair) {
        throw new Error('No active or upcoming fair found');
      }
    }

    const fair = activeFair || await prisma.fair.findFirst({ where: { status: 'upcoming' } });
    console.log(`Using fair: ${fair!.name}`);

    // Find house that's not already booked for this fair
    const bookedHouseIds = await prisma.booking.findMany({
      where: { fairId: fair!.id },
      select: { vendorHouseId: true },
    });
    const bookedIds = bookedHouseIds.map(b => b.vendorHouseId);

    const availableHouse = await prisma.vendorHouse.findFirst({
      where: {
        id: { notIn: bookedIds },
        isEnabled: true,
      },
    });

    if (!availableHouse) {
      // Create a new house
      const newHouse = await prisma.vendorHouse.create({
        data: {
          houseNumber: `TEST-H-${timestamp}`,
          areaSqm: 50,
          price: 1000,
          latitude: 40.4093,
          longitude: 49.8671,
        },
      });
      console.log(`Created new house: ${newHouse.houseNumber}`);

      // Create application with the new house
      const application = await prisma.application.create({
        data: {
          vendorProfileId: vendorProfile.id,
          fairId: fair!.id,
          vendorHouseId: newHouse.id,
          status: 'pending',
        },
      });
      console.log(`Created application ID: ${application.id}`);
      console.log(`Application ready for approval/rejection testing`);
    } else {
      console.log(`Using available house: ${availableHouse.houseNumber}`);

      // Create application
      const application = await prisma.application.create({
        data: {
          vendorProfileId: vendorProfile.id,
          fairId: fair!.id,
          vendorHouseId: availableHouse.id,
          status: 'pending',
        },
      });
      console.log(`Created application ID: ${application.id}`);
      console.log(`Application ready for approval/rejection testing`);
    }

    return { email, language };
  } catch (error) {
    console.error('Error creating test application:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const language = args[0] as 'az' | 'en' || 'en';

if (!['az', 'en'].includes(language)) {
  console.error('Language must be "az" or "en"');
  process.exit(1);
}

createTestApplication(language)
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
