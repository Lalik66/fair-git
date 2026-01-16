const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:3002/api';

async function main() {
  try {
    // Update vendor language to English
    await prisma.user.update({
      where: { email: 'test-vendor-1768374646143-1@test.com' },
      data: { preferredLanguage: 'en' }
    });
    console.log('Updated vendor language to English');

    // Login as vendor
    console.log('\nLogging in as vendor...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test-vendor-1768374646143-1@test.com',
        password: 'vendor123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful!');

    // Get fairs
    const fairsRes = await fetch(`${API_URL}/public/fairs`);
    const fairsData = await fairsRes.json();
    const winterFair = fairsData.fairs.find(f => f.name === 'Winter 2026');

    // Use H-102 this time
    const houseNumber = 'H-102';
    const house = await prisma.vendorHouse.findUnique({ where: { houseNumber } });

    // Get vendor profile
    const vendor = await prisma.user.findUnique({
      where: { email: 'test-vendor-1768374646143-1@test.com' },
      include: { vendorProfile: true }
    });

    // Delete existing application if any
    const existingApp = await prisma.application.findFirst({
      where: {
        vendorHouseId: house.id,
        fairId: winterFair.id,
        vendorProfileId: vendor.vendorProfile.id
      }
    });
    if (existingApp) {
      await prisma.application.delete({ where: { id: existingApp.id } });
    }

    // Check for booking
    const existingBooking = await prisma.booking.findFirst({
      where: {
        vendorHouseId: house.id,
        fairId: winterFair.id,
        bookingStatus: { in: ['pending', 'approved'] }
      }
    });

    if (existingBooking) {
      console.log('House H-102 is booked. Using H-101 instead...');
      const house2 = await prisma.vendorHouse.findUnique({ where: { houseNumber: 'H-101' } });
      house.id = house2.id;
      house.houseNumber = house2.houseNumber;

      // Delete existing app for H-101
      const existingApp2 = await prisma.application.findFirst({
        where: {
          vendorHouseId: house2.id,
          fairId: winterFair.id,
          vendorProfileId: vendor.vendorProfile.id
        }
      });
      if (existingApp2) {
        // Also delete booking if exists
        await prisma.booking.deleteMany({ where: { applicationId: existingApp2.id } });
        await prisma.application.delete({ where: { id: existingApp2.id } });
      }
    }

    await prisma.$disconnect();

    console.log(`\nUsing house: ${house.houseNumber} (${house.id})`);

    // Submit application
    console.log('\nSubmitting application (English language)...');
    const submitRes = await fetch(`${API_URL}/vendor/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fairId: winterFair.id,
        vendorHouseId: house.id
      })
    });

    const submitData = await submitRes.json();

    if (submitRes.ok) {
      console.log('\n=== APPLICATION SUBMITTED SUCCESSFULLY ===');
      console.log(JSON.stringify(submitData, null, 2));
      console.log('\n>>> Check the backend console for the ENGLISH email notification! <<<');
    } else {
      console.log('Application submission failed:', submitData);
    }

  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

main();
