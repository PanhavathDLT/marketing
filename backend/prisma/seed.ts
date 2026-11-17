import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL ?? ''),
});

const DEV_DEFAULT_EMAIL = 'adminmkt@dlt.com';
const DEV_DEFAULT_PASSWORD = 'Admin1234!';

function adminCredentials() {
  const isProd = process.env.NODE_ENV === 'production';
  const email = process.env.ADMIN_EMAIL ?? (isProd ? undefined : DEV_DEFAULT_EMAIL);
  const password = process.env.ADMIN_PASSWORD ?? (isProd ? undefined : DEV_DEFAULT_PASSWORD);

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set when NODE_ENV=production');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }
  return { email: email.toLowerCase(), password };
}

async function seedAdmin() {
  const { email, password } = adminCredentials();
  const existing = await prisma.staffProfile.findUnique({ where: { email } });

  if (existing) {
    // Idempotent: check that the linked user is ADMIN.
    const user = await prisma.user.findUnique({ where: { id: existing.userId } });
    if (user && user.role !== Role.ADMIN) {
      await prisma.user.update({ where: { id: existing.userId }, data: { role: Role.ADMIN } });
      console.log(`✔ Promoted existing user ${email} to ADMIN`);
    } else {
      console.log(`• Admin ${email} already exists, skipping`);
    }
    return;
  }

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const hashed = await bcrypt.hash(password, rounds);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { role: Role.ADMIN } });
    await tx.staffProfile.create({
      data: {
        userId: user.id,
        email,
        password: hashed,
        name: 'Admin',
      },
    });
  });
  console.log(`✔ Created admin ${email}`);
}

// ─── Permission catalogue ────────────────────────────────────────────────────
// Permissions are immutable infrastructure — seed them idempotently.
// Admin users get their access by assigning a StaffRole that holds a subset of these.
const PERMISSIONS = [
  { module: 'CAMPAIGN',        action: 'View'   },
  { module: 'CAMPAIGN',        action: 'Create' },
  { module: 'CAMPAIGN',        action: 'Update' },
  { module: 'CAMPAIGN',        action: 'Delete' },
  { module: 'MISSION',         action: 'View'   },
  { module: 'MISSION',         action: 'Create' },
  { module: 'MISSION',         action: 'Update' },
  { module: 'MISSION',         action: 'Delete' },
  { module: 'REWARD_STORE',    action: 'View'   },
  { module: 'REWARD_STORE',    action: 'Create' },
  { module: 'REWARD_STORE',    action: 'Update' },
  { module: 'REWARD_STORE',    action: 'Delete' },
  { module: 'ANALYTICS',       action: 'View'   },
  { module: 'USER_MANAGEMENT', action: 'View'   },
  { module: 'USER_MANAGEMENT', action: 'Create' },
  { module: 'USER_MANAGEMENT', action: 'Update' },
  { module: 'USER_MANAGEMENT', action: 'Delete' },
  { module: 'TIER',            action: 'View'   },
  { module: 'TIER',            action: 'Create' },
  { module: 'TIER',            action: 'Update' },
  { module: 'TIER',            action: 'Delete' },
  { module: 'SETTINGS',        action: 'View'   },
  { module: 'SETTINGS',        action: 'Update' },
];

async function seedPermissions() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: {},
      create: p,
    });
  }
  console.log(`✔ Seeded ${PERMISSIONS.length} permissions`);
}

const DEFAULT_TIERS = [
  { name: 'BRONZE',   minPoints: 0    },
  { name: 'SILVER',   minPoints: 200  },
  { name: 'GOLD',     minPoints: 500  },
  { name: 'PLATINUM', minPoints: 1000 },
  { name: 'DIAMOND',  minPoints: 2000 },
];

async function seedDefaultTiers() {
  for (const t of DEFAULT_TIERS) {
    await prisma.tierConfig.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log(`✔ Seeded ${DEFAULT_TIERS.length} default tiers`);
}

const DEV_DEFAULT_LOS_CLIENT_ID = 'los-backend';
const DEV_DEFAULT_LOS_CLIENT_SECRET = 'dev-los-secret-change-in-production';

async function seedMachineClients() {
  const isProd = process.env.NODE_ENV === 'production';
  const clientId = process.env.LOS_CLIENT_ID ?? (isProd ? undefined : DEV_DEFAULT_LOS_CLIENT_ID);
  const clientSecret = process.env.LOS_CLIENT_SECRET ?? (isProd ? undefined : DEV_DEFAULT_LOS_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error('LOS_CLIENT_ID and LOS_CLIENT_SECRET must be set when NODE_ENV=production');
  }

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const hashed = await bcrypt.hash(clientSecret, rounds);

  await prisma.machineClient.upsert({
    where: { clientId },
    update: { clientSecret: hashed, name: 'LOS Backend' },
    create: { clientId, clientSecret: hashed, name: 'LOS Backend' },
  });
  console.log(`✔ Seeded machine client: ${clientId}`);
}

async function seedReferralConfig() {
  const existing = await prisma.referralConfig.findFirst();
  if (existing) {
    console.log(`• ReferralConfig already exists (refereeBonus=${existing.refereeBonus}), skipping`);
    return;
  }
  await prisma.referralConfig.create({ data: { refereeBonus: 50 } });
  console.log(`✔ Seeded ReferralConfig (refereeBonus=50)`);
}

async function main() {
  await seedAdmin();
  await seedPermissions();
  await seedDefaultTiers();
  await seedMachineClients();
  await seedReferralConfig();
}

main()
  .catch((err) => {
    console.error('✖ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
