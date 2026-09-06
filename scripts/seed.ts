/* eslint-disable no-console */
import { connectDB, disconnectDB } from "@/config/db";
import { env } from "@/config/env";
import { User } from "@/models/user.model";
import { ROLES, STATUS } from "@/constants/roles";

async function seed() {
  await connectDB();

  const identifier = env.seed.identifier.trim().toLowerCase();
  const existing = await User.findByIdentifier(identifier);

  if (existing) {
    console.log(`[seed] A user with identifier "${identifier}" already exists (role: ${existing.role}). Skipping.`);
  } else {
    const user = await User.create({
      name: env.seed.name,
      identifier,
      passwordHash: env.seed.password, // hashed by the User pre-save hook
      role: ROLES.SUPER_ADMIN,
      status: STATUS.ACTIVE,
    });
    console.log("[seed] Super Admin created:");
    console.log(`        identifier: ${user.identifier}`);
    console.log(`        password:   ${env.seed.password}`);
    console.log("[seed] Please log in and change this password immediately.");
  }

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
