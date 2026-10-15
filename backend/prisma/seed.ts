import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const employeePassword = process.env.SEED_EMPLOYEE_PASSWORD;

if (!adminEmail || !adminPassword || !employeePassword) throw new Error("SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and SEED_EMPLOYEE_PASSWORD must be set before running the seed");

const users = [
  { name: "Admin", email: adminEmail, role: Role.ADMIN, password: adminPassword },
  { name: "Ahmed", email: "ahmed@example.com", role: Role.EMPLOYEE, password: employeePassword },
  { name: "Ali", email: "ali@example.com", role: Role.EMPLOYEE, password: employeePassword },
  { name: "Hassan", email: "hassan@example.com", role: Role.EMPLOYEE, password: employeePassword }
];

async function main() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash
        ,emailVerified: true
        ,accountStatus: "ACTIVE"
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
