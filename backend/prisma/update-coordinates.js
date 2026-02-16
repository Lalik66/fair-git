const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating map marker coordinates...\n');

  // Vendor house coordinate updates
  const vendorHouseUpdates = [
    { houseNumber: 'H-101', latitude: 40.370784545887915, longitude: 49.83648502562042 },
    { houseNumber: 'H-102', latitude: 40.371267, longitude: 49.836949 },
    { houseNumber: 'H-103', latitude: 40.370979, longitude: 49.837301 },
    { houseNumber: 'H-104', latitude: 40.370829, longitude: 49.835945 },
  ];

  // Facility coordinate updates
  const facilityUpdates = [
    { name: 'Coffee Corner', latitude: 40.371015, longitude: 49.836117 },
    { name: 'Fair Restaurant', latitude: 40.371444, longitude: 49.837361 },
    { name: 'Kids Play Zone', latitude: 40.371052, longitude: 49.837550 },
    { name: 'Public Restroom', latitude: 40.371431, longitude: 49.837743 },
    { name: 'Visitor Parking', latitude: 40.369612, longitude: 49.835404 },
  ];

  // Update vendor houses
  console.log('Updating vendor houses:');
  for (const update of vendorHouseUpdates) {
    try {
      const result = await prisma.vendorHouse.update({
        where: { houseNumber: update.houseNumber },
        data: {
          latitude: update.latitude,
          longitude: update.longitude,
        },
      });
      console.log(`  Updated ${update.houseNumber}: (${update.latitude}, ${update.longitude})`);
    } catch (error) {
      console.error(`  Failed to update ${update.houseNumber}: ${error.message}`);
    }
  }

  // Update facilities
  console.log('\nUpdating facilities:');
  for (const update of facilityUpdates) {
    try {
      const result = await prisma.facility.updateMany({
        where: { name: update.name },
        data: {
          latitude: update.latitude,
          longitude: update.longitude,
        },
      });
      if (result.count > 0) {
        console.log(`  Updated ${update.name}: (${update.latitude}, ${update.longitude})`);
      } else {
        console.log(`  No facility found with name: ${update.name}`);
      }
    } catch (error) {
      console.error(`  Failed to update ${update.name}: ${error.message}`);
    }
  }

  console.log('\nCoordinate update complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
