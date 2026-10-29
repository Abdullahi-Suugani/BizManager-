import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) before provisioning.");
  }

  await prisma.$transaction(async (tx) => {
    const existingAdmin = await tx.user.count({ where: { role: Role.ADMIN } });
    if (existingAdmin > 0) throw new Error("An Admin account already exists. No account was changed.");

    const existingUser = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) throw new Error("That email already belongs to an account. No account was changed.");

    await tx.user.create({
      data: {
        name: process.env.ADMIN_NAME?.trim() || "Administrator",
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: Role.ADMIN,
        emailVerified: true,
        accountStatus: "ACTIVE"
      }
    });
  }, { isolationLevel: "Serializable" });
  console.log("Initial Admin account created. Sign in through the normal Login page.");
}

main().catch(() => {
  console.error("Admin provisioning failed. No credential or connection details were logged.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
