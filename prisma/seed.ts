import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/build?schema=public";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "admin@staridb.com";
  const plainPassword = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";
  const hash = await bcrypt.hash(plainPassword, 10);

  await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true },
    create: {
      email,
      passwordHash: hash,
      name: "Admin",
      isAdmin: true,
    },
  });
  console.log("Seed: user created or updated:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
