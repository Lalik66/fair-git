// Create a test application for Feature 151 testing
const path = require('path');
const backendPath = path.join(__dirname, 'backend');
module.paths.unshift(path.join(backendPath, 'node_modules'));

async function main() {
  const { PrismaClient } = await import('./backend/node_modules/@prisma/client/index.js');
  const prisma = new PrismaClient();

  try {
    const email = 'searchtest-vendor@test.com';

    // Get the user and vendor profile
    const user = await prisma.user.findUnique({
      where: { email },
      include: { vendorProfile: true }
    });

    if (!user || !user.vendorProfile) {
      console.log('User or vendor profile not found');
      return;
    }

    console.log('Found vendor:', user.vendorProfile.companyName);

    // Get a fair and vendor house
    const fair = await prisma.fair.findFirst({ where: { status: 'upcoming' } });
    const house = await prisma.vendorHouse.findFirst({ where: { isEnabled: true } });

    if (!fair || !house) {
      console.log('No fair or house found');
      return;
    }

    console.log('Fair:', fair.name);
    console.log('House:', house.houseNumber);

    // Create the application
    const application = await prisma.application.create({
      data: {
        vendorProfileId: user.vendorProfile.id,
        fairId: fair.id,
        vendorHouseId: house.id,
        status: 'pending',
      },
    });

    console.log('');
    console.log('Created application:', application.id);
    console.log('Company Name: SEARCHTEST123');
    console.log('Status: pending');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
