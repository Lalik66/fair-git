const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function main() {
  const houses = await prisma.vendorHouse.findMany({
    include: {
      applications: {
        select: { id: true, status: true }
      },
      bookings: {
        select: { id: true, bookingStatus: true }
      }
    },
    orderBy: { houseNumber: 'asc' }
  });

  for (const h of houses) {
    const pendingApps = h.applications.filter(a => a.status === 'pending').length;
    const activeBookings = h.bookings.filter(b => b.bookingStatus === 'active').length;
    console.log(`${h.houseNumber} (${h.id}): ${h.applications.length} apps (${pendingApps} pending), ${h.bookings.length} bookings (${activeBookings} active)`);
  }
}

main().then(() => prisma.$disconnect());
