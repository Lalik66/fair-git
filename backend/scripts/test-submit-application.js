const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:3002/api';

async function main() {
  try {
    // Login as vendor
    console.log('Logging in as vendor...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test-vendor-1768374646143-1@test.com',
        password: 'vendor123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      console.log('Login failed:', loginData);
      return;
    }
    const token = loginData.token;
    console.log('Login successful!');

    // Get available fairs
    const fairsRes = await fetch(`${API_URL}/public/fairs`);
    const fairsData = await fairsRes.json();
    const fairs = fairsData.fairs;
    console.log('\nAvailable fairs:');
    fairs.forEach(f => console.log(`  - ${f.name} (${f.id})`));

    // Use the Winter 2026 fair (upcoming)
    const winterFair = fairs.find(f => f.name === 'Winter 2026');
    if (!winterFair) {
      console.log('Winter 2026 fair not found');
      return;
    }

    // Get vendor houses - need to find one that's not already booked for Winter 2026
    // Use H-103 which might be available
    const houseNumber = 'H-103';

    const house = await prisma.vendorHouse.findUnique({ where: { houseNumber } });
    if (!house) {
      console.log(`House ${houseNumber} not found`);
      await prisma.$disconnect();
      return;
    }
    console.log(`\nUsing house: ${house.houseNumber} (${house.id})`);

    // Get vendor profile
    const vendor = await prisma.user.findUnique({
      where: { email: 'test-vendor-1768374646143-1@test.com' },
      include: { vendorProfile: true }
    });

    // Check if there's already an application
    const existingApp = await prisma.application.findFirst({
      where: {
        vendorHouseId: house.id,
        fairId: winterFair.id,
        vendorProfileId: vendor.vendorProfile.id
      }
    });

    if (existingApp) {
      console.log('Existing application found, deleting it first...');
      await prisma.application.delete({ where: { id: existingApp.id } });
    }

    // Check for existing booking
    const existingBooking = await prisma.booking.findFirst({
      where: {
        vendorHouseId: house.id,
        fairId: winterFair.id,
        bookingStatus: { in: ['pending', 'approved'] }
      }
    });

    if (existingBooking) {
      console.log('House is already booked for this fair. Trying H-104...');
      const house2 = await prisma.vendorHouse.findUnique({ where: { houseNumber: 'H-104' } });
      if (house2) {
        // Check for existing app and booking for H-104
        const existingApp2 = await prisma.application.findFirst({
          where: {
            vendorHouseId: house2.id,
            fairId: winterFair.id,
            vendorProfileId: vendor.vendorProfile.id
          }
        });
        if (existingApp2) {
          await prisma.application.delete({ where: { id: existingApp2.id } });
        }
        const existingBooking2 = await prisma.booking.findFirst({
          where: {
            vendorHouseId: house2.id,
            fairId: winterFair.id,
            bookingStatus: { in: ['pending', 'approved'] }
          }
        });
        if (!existingBooking2) {
          house.id = house2.id;
          house.houseNumber = house2.houseNumber;
          console.log(`Using house: ${house.houseNumber} (${house.id})`);
        } else {
          console.log('H-104 also booked. Please try a different house.');
          await prisma.$disconnect();
          return;
        }
      }
    }

    await prisma.$disconnect();

    // Submit application
    console.log('\nSubmitting application...');
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
      console.log('\n>>> Check the backend console for the email notification! <<<');
    } else {
      console.log('Application submission failed:', submitData);
    }

  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

main();
