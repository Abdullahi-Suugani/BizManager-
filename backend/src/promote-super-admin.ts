import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

class BootstrapError extends Error {}

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new BootstrapError("Set SUPER_ADMIN_EMAIL to the exact email of an existing Admin account.");

  await prisma.$transaction(async (tx) => {
    const existingSuperAdmin = await tx.user.findFirst({ where: { role: Role.SUPER_ADMIN }, select: { id: true } });
    if (existingSuperAdmin) throw new BootstrapError("A Super Admin already exists. No account was changed.");

    const admin = await tx.user.findUnique({ where: { email } });
    if (!admin || admin.role !== Role.ADMIN) {
      throw new BootstrapError("The specified email must belong to an existing Admin. No account was changed.");
    }

    await tx.user.update({ where: { id: admin.id }, data: { role: Role.SUPER_ADMIN } });
    await tx.activityLog.create({
      data: {
        actorId: admin.id,
        actorName: admin.name,
        actorRole: Role.SUPER_ADMIN,
        action: "SUPER_ADMIN_DESIGNATED",
        recordType: "USER",
        recordId: admin.id,
        description: "Existing Admin designated as the initial Super Admin",
        previousValues: { role: Role.ADMIN },
        newValues: { role: Role.SUPER_ADMIN },
        success: true
      }
    });
  }, { isolationLevel: "Serializable" });
  console.log("The existing Admin was designated as Super Admin. Password and other account data were preserved.");
}

main().catch((error: unknown) => {
  if (error instanceof BootstrapError) console.error(error.message);
  else console.error("Super Admin designation failed. Check the local database configuration; sensitive connection details were not logged.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
