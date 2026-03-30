import { prisma } from "../lib/prisma";

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Create dummy users
  const users = [
    {
      clerkId: 'user_test_free_001',
      email: 'free.user@example.com',
      tier: 'FREE' as const,
      auditsUsedThisMonth: 2,
    },
    {
      clerkId: 'user_test_paid_001',
      email: 'paid.user@example.com',
      tier: 'PAID' as const,
      auditsUsedThisMonth: 15,
    },
    {
      clerkId: 'user_test_dev_001',
      email: 'dev@example.com',
      tier: 'FREE' as const,
      auditsUsedThisMonth: 0,
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    console.log(`✅ Created/found user: ${user.email} (${user.tier})`);
  }

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
