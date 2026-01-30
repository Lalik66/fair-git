const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create test facilities near Baku fairground
  const facilities = [
    {
      name: 'Fair Restaurant',
      type: 'restaurant',
      description: 'Traditional Azerbaijani cuisine with modern twist',
      latitude: 40.4095,
      longitude: 49.8680,
      photoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
      icon: '🍽️',
      color: '#F59E0B'
    },
    {
      name: 'Coffee Corner',
      type: 'cafe',
      description: 'Fresh coffee and pastries',
      latitude: 40.4090,
      longitude: 49.8665,
      photoUrl: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400',
      icon: '☕',
      color: '#8B5CF6'
    },
    {
      name: 'Kids Play Zone',
      type: 'kids_zone',
      description: 'Safe play area for children',
      latitude: 40.4088,
      longitude: 49.8675,
      photoUrl: null,
      icon: '🎠',
      color: '#EC4899'
    },
    {
      name: 'Public Restroom',
      type: 'restroom',
      description: 'Clean restroom facilities',
      latitude: 40.4098,
      longitude: 49.8660,
      photoUrl: null,
      icon: '🚻',
      color: '#6366F1'
    },
    {
      name: 'Visitor Parking',
      type: 'parking',
      description: 'Free parking for visitors',
      latitude: 40.4085,
      longitude: 49.8685,
      photoUrl: null,
      icon: '🅿️',
      color: '#6B7280'
    }
  ];

  for (const facility of facilities) {
    await prisma.facility.create({ data: facility });
    console.log(`Created facility: ${facility.name}`);
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
