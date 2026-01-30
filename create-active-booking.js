const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function main() {
  // Find a vendor house to use for testing
  const house = await prisma.vendorHouse.findFirst({
    where: { houseNumber: 'H-101' },
  });
  if (!house) {
    console.log('No house H-101 found');
    return;
  }
  console.log('Found house:', house.id, house.houseNumber);

  // Find a fair
  const fair = await prisma.fair.findFirst({ where: { status: 'upcoming' } });
  if (!fair) {
    console.log('No upcoming fair found');
    return;
  }
  console.log('Using fair:', fair.id, fair.name);

  // Find a vendor profile
  const vendorProfile = await prisma.vendorProfile.findFirst();
  if (!vendorProfile) {
    console.log('No vendor profile found');
    return;
  }
  console.log('Found vendor profile:', vendorProfile.id);

  // Create an approved application first
  const application = await prisma.application.create({
    data: {
      vendorProfileId: vendorProfile.id,
      fairId: fair.id,
      vendorHouseId: house.id,
      status: 'approved',
      submittedAt: new Date(),
      reviewedAt: new Date(),
    },
  });
  console.log('Created application:', application.id, 'status:', application.status);

  // Now create an active booking linked to this application
  const booking = await prisma.booking.create({
    data: {
      applicationId: application.id,
      vendorProfileId: vendorProfile.id,
      vendorHouseId: house.id,
      fairId: fair.id,
      bookingStatus: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });
  console.log('Created booking:', booking.id, 'bookingStatus:', booking.bookingStatus);

  // Verify
  const check = await prisma.vendorHouse.findUnique({
    where: { id: house.id },
    include: {
      bookings: {
        where: { bookingStatus: 'active' },
        select: { id: true, bookingStatus: true },
      },
    },
  });
  console.log('House now has', check.bookings.length, 'active booking(s)');
  console.log('Test data IDs - application:', application.id, 'booking:', booking.id);
}

main().then(() => prisma.$disconnect());
