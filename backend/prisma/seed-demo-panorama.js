const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed script to add demo 360° panorama URL to vendor house H-102
 *
 * To replace the demo panorama:
 * - Upload a new image via Admin => Map Management
 * - Or replace frontend/public/fevvareler.jpg with your 360° equirectangular image
 *
 * Run with: node prisma/seed-demo-panorama.js
 */
async function main() {
  console.log('Setting demo 360° panorama for vendor house H-102...\n');

  try {
    const result = await prisma.vendorHouse.update({
      where: { houseNumber: 'H-102' },
      data: {
        panorama360Url: '/fevvareler.jpg',
      },
    });
    console.log(`Updated ${result.houseNumber} with panorama URL: /fevvareler.jpg`);
  } catch (error) {
    if (error.code === 'P2025') {
      console.log('Vendor house H-102 not found. Creating it...');

      // Create the house if it doesn't exist
      const newHouse = await prisma.vendorHouse.create({
        data: {
          houseNumber: 'H-102',
          latitude: 40.371267,
          longitude: 49.836949,
          areaSqm: 25.0,
          price: 500.00,
          description: 'Demo vendor house with 360° tour',
          panorama360Url: '/fevvareler.jpg',
          isEnabled: true,
        },
      });
      console.log(`Created ${newHouse.houseNumber} with panorama URL: /fevvareler.jpg`);
    } else {
      throw error;
    }
  }

  console.log('\nDemo panorama setup complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
