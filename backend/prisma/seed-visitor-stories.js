const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed friendly, visitor-facing placeholder text (visitorStory) for vendor
 * houses that don't have one yet.
 *
 * This is the public "what is this place about" blurb shown to every visitor
 * on the map (alongside the 360 panorama and the vendor's business identity).
 * It is intentionally NOT the operational `description` field.
 *
 * Idempotent and safe to re-run: only houses whose visitorStory is still
 * empty/null are touched, so anything edited later in Admin -> Map Management
 * is never overwritten.
 *
 * Run with: node prisma/seed-visitor-stories.js
 */

// A small set of warm, generic placeholders. They rotate per house so the map
// doesn't read as identical copy-paste. Admin refines the real text later.
const PLACEHOLDERS = [
  'Bu künc yerli ustaların əl işləri ilə doludur — toxunma, keramika və xırda hədiyyəlik əşyalar. Rahat gəzin, sevdiyinizi seçin.',
  'Burada təzə bişmiş şirniyyatların və isti içkilərin ətri sizi qarşılayır. Bir fincan çay üçün dayanmağa dəyər.',
  'Ailəvi emalatxana: əl ilə hazırlanmış taxta və dəri məmulatları. Hər əşyanın öz hekayəsi var.',
  'Rəngarəng milli geyim və aksesuarlar guşəsi. Bayram əhval-ruhiyyəsi və gözəl fotolar üçün ideal yer.',
  'Yerli dadlar burada: ev şəraitində hazırlanmış mürəbbə, bal və ədviyyatlar. Dadına baxmaq pulsuzdur.',
  'Yaradıcı sənətkarların məkanı — zərgərlik, suvenirlər və unikal hədiyyələr. Bir baxış üçün qonaq olun.',
];

async function main() {
  console.log('Seeding visitor stories for vendor houses without one...\n');

  const houses = await prisma.vendorHouse.findMany({
    orderBy: { houseNumber: 'asc' },
    select: { id: true, houseNumber: true, visitorStory: true },
  });

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < houses.length; i++) {
    const house = houses[i];
    const current = (house.visitorStory || '').trim();

    if (current) {
      skipped++;
      continue;
    }

    const story = PLACEHOLDERS[i % PLACEHOLDERS.length];
    await prisma.vendorHouse.update({
      where: { id: house.id },
      data: { visitorStory: story },
    });
    updated++;
    console.log(`  ${house.houseNumber}: set placeholder visitor story`);
  }

  console.log(
    `\nDone. ${updated} house(s) updated, ${skipped} left untouched (already had a story).`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
