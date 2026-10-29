import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

function requireTls(value: string | undefined) {
  if (!value) throw new Error("DIRECT_URL is not configured.");
  return value.toLowerCase().includes("sslmode=")
    ? value
    : `${value}${value.includes("?") ? "&" : "?"}sslmode=require`;
}

const prisma = new PrismaClient({
  datasources: { db: { url: requireTls(process.env.DIRECT_URL) } }
});

async function main() {
  const email = process.env.ADMIN_RESET_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_RESET_PASSWORD;
  const confirmed = process.env.ADMIN_RESET_CONFIRM === "YES";

  if (!email || (confirmed && (!password || password.length < 12))) {
    throw new Error("Set ADMIN_RESET_EMAIL and, for a confirmed reset, ADMIN_RESET_PASSWORD (at least 12 characters).");
  }

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, email: true, emailVerified: true, accountStatus: true }
  });

  if (!confirmed) {
    const admin = admins.length === 1 ? admins[0] : undefined;
    console.log(JSON.stringify({
      adminFound: Boolean(admin),
      adminCount: admins.length,
      emailMatchesRequested: admin?.email === email,
      emailVerified: admin?.emailVerified,
      accountStatus: admin?.accountStatus,
      resetPerformed: false
    }));
    return;
  }

  if (!password || password.length < 12) {
    throw new Error("A confirmed reset requires an Admin password of at least 12 characters.");
  }

  if (admins.length === 0) throw new Error("No existing Admin account was found. No account was changed.");
  if (admins.length > 1) throw new Error("Multiple Admin accounts were found. No account was changed.");

  const admin = admins[0];
  if (admin.email !== email) {
    throw new Error("The requested email does not match the existing Admin account. No account was changed.");
  }

  const emailOwner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (emailOwner && emailOwner.id !== admin.id) {
    throw new Error("The requested email belongs to another account. No account was changed.");
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      emailVerified: true,
      accountStatus: "ACTIVE",
      mustChangePassword: false
    }
  });
  console.log("Admin credentials reset successfully. Credentials were not logged.");
}

main()
  .catch(() => {
    console.error("Admin reset failed. No credential or connection details were logged.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
