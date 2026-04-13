import { prisma } from './src/lib/prisma.js';

async function checkAndCreateUsers() {
  console.log('🔍 Checking for users...\n');

  // Check existing users
  const existingUsers = await prisma.user.findMany();
  console.log(`Found ${existingUsers.length} existing user(s):`);
  existingUsers.forEach(u => console.log(`  - ${u.email} (${u.tier}) - ID: ${u.id}`));

  console.log('\n🌱 Creating test users if needed...\n');

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
    console.log(`✅ Created/found user: ${user.email} (${user.tier}) - ID: ${user.id}`);
  }

  console.log('\n🎉 Setup completed!');
  console.log('\n📝 You can use these user IDs in your audit requests:');
  const finalUsers = await prisma.user.findMany();
  finalUsers.forEach(u => console.log(`  ${u.email}: "${u.id}"`));
}

checkAndCreateUsers()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
