const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function main() {
  // Find and delete the test booking
  const bookings = await prisma.booking.findMany({
    where: {
      vendorHouse: { houseNumber: 'H-101' },
      bookingStatus: 'active',
    },
    select: { id: true, applicationId: true, bookingStatus: true },
  });
  console.log('Found', bookings.length, 'active bookings for H-101');

  for (const b of bookings) {
    // Delete the booking first
    await prisma.booking.delete({ where: { id: b.id } });
    console.log('Deleted booking:', b.id);

    // Delete the associated application
    if (b.applicationId) {
      try {
        await prisma.application.delete({ where: { id: b.applicationId } });
        console.log('Deleted application:', b.applicationId);
      } catch (e) {
        console.log('Could not delete application:', b.applicationId, e.message);
      }
    }
  }

  // Verify house still exists
  const house = await prisma.vendorHouse.findFirst({
    where: { houseNumber: 'H-101' },
    include: {
      bookings: { select: { id: true, bookingStatus: true } },
      applications: { select: { id: true, status: true } },
    },
  });
  console.log('House H-101 still exists:', !!house);
  console.log('Remaining bookings:', house?.bookings.length || 0);
  console.log('Remaining applications:', house?.applications.length || 0);
}

main().then(() => prisma.$disconnect());
