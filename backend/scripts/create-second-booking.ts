import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSecondBooking() {
  try {
    // Get the vendor profile for Artisan Vendor (test-vendor-1768374646124-0@test.com)
    const vendorProfile = await prisma.vendorProfile.findFirst({
      where: {
        user: { email: 'test-vendor-1768374646124-0@test.com' }
      },
      include: { user: true }
    });

    if (!vendorProfile) {
      console.error('Vendor profile not found');
      return;
    }

    console.log(`Found vendor: ${vendorProfile.companyName} (${vendorProfile.user.email})`);

    // Get the fair - Winter 2026
    const fair = await prisma.fair.findFirst({
      where: { name: 'Winter 2026' }
    });

    if (!fair) {
      console.error('Fair not found');
      return;
    }

    console.log(`Found fair: ${fair.name}`);

    // Get a different house (H-104) that's not already booked by this vendor
    const house = await prisma.vendorHouse.findFirst({
      where: { houseNumber: 'H-104' }
    });

    if (!house) {
      console.error('House H-104 not found');
      return;
    }

    console.log(`Found house: ${house.houseNumber}`);

    // Check if already booked
    const existingBooking = await prisma.booking.findFirst({
      where: {
        vendorHouseId: house.id,
        fairId: fair.id,
        bookingStatus: 'approved'
      }
    });

    if (existingBooking) {
      console.log('House H-104 is already booked for Winter 2026, trying H-103...');

      const house2 = await prisma.vendorHouse.findFirst({
        where: { houseNumber: 'H-103' }
      });

      if (!house2) {
        console.error('House H-103 not found');
        return;
      }

      const existingBooking2 = await prisma.booking.findFirst({
        where: {
          vendorHouseId: house2.id,
          fairId: fair.id,
          bookingStatus: 'approved'
        }
      });

      if (existingBooking2) {
        console.log('House H-103 is also already booked');
        return;
      }

      // Create application for H-103
      const application = await prisma.application.create({
        data: {
          vendorProfileId: vendorProfile.id,
          fairId: fair.id,
          vendorHouseId: house2.id,
          status: 'approved',
          reviewedAt: new Date(),
        }
      });

      console.log(`Created application: ${application.id}`);

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          applicationId: application.id,
          vendorProfileId: vendorProfile.id,
          vendorHouseId: house2.id,
          fairId: fair.id,
          bookingStatus: 'approved',
          startDate: fair.startDate,
          endDate: fair.endDate,
        }
      });

      console.log(`Created booking for H-103: ${booking.id}`);
      return;
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        vendorProfileId: vendorProfile.id,
        fairId: fair.id,
        vendorHouseId: house.id,
        status: 'approved',
        reviewedAt: new Date(),
      }
    });

    console.log(`Created application: ${application.id}`);

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        applicationId: application.id,
        vendorProfileId: vendorProfile.id,
        vendorHouseId: house.id,
        fairId: fair.id,
        bookingStatus: 'approved',
        startDate: fair.startDate,
        endDate: fair.endDate,
      }
    });

    console.log(`Created booking for H-104: ${booking.id}`);
    console.log('\nSecond booking created successfully!');
    console.log(`Vendor ${vendorProfile.companyName} now has multiple bookings for ${fair.name}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSecondBooking();
