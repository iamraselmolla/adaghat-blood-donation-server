import bcrypt from "bcryptjs";

import { connectDB, disconnectDB } from "../src/config/db";
import { env } from "../src/config/env";
import { User } from "../src/models/user.model";
import { Donor } from "../src/models/donor.model";
import { Donation } from "../src/models/Donation.model";
import { computeEligibilityStatus } from "../src/utils/eligibility";

async function upsertUser(name: string, identifier: string, password: string, role: "SUPER_ADMIN" | "ADMIN" | "MEMBER") {
  const existing = await User.findOne({ identifier: identifier.toLowerCase() });
  if (existing) {
    console.log(`- User already exists, skipping: ${identifier}`);
    return existing;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, identifier: identifier.toLowerCase(), passwordHash, role, status: "ACTIVE" });
  console.log(`- Created ${role}: ${identifier} / ${password}`);
  return user;
}

async function seedDonor(input: {
  name: string;
  phone: string;
  email: string;
  bloodGroup: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  gender: "MALE" | "FEMALE" | "OTHER";
  dob: string;
  division: string;
  district: string;
  upazila: string;
  lastDonationDate: string | null;
  weightKg: number;
  bloodPressure: string;
  hemoglobin: number;
  conditions: Partial<{
    diabetes: boolean;
    hepatitis: boolean;
    hiv: boolean;
    heartDisease: boolean;
    recentSurgery: boolean;
    recentTattoo: boolean;
  }>;
}) {
  const existing = await Donor.findOne({ phone: input.phone });
  if (existing) {
    console.log(`- Donor already exists, skipping: ${input.name}`);
    return existing;
  }

  const conditions = {
    diabetes: false,
    hepatitis: false,
    hiv: false,
    heartDisease: false,
    recentSurgery: false,
    recentTattoo: false,
    ...input.conditions,
  };

  const eligibilityStatus = computeEligibilityStatus({
    gender: input.gender,
    dob: input.dob,
    weightKg: input.weightKg,
    hemoglobin: input.hemoglobin,
    conditions,
  });

  const donor = await Donor.create({
    name: input.name,
    phone: input.phone,
    email: input.email,
    bloodGroup: input.bloodGroup,
    gender: input.gender,
    dob: new Date(input.dob),
    address: { division: input.division, district: input.district, upazila: input.upazila },
    lastDonationDate: input.lastDonationDate ? new Date(input.lastDonationDate) : null,
    availability: true,
    medicalRecord: {
      weightKg: input.weightKg,
      bloodPressure: input.bloodPressure,
      hemoglobin: input.hemoglobin,
      conditions,
      eligibilityStatus,
      updatedAt: new Date(),
    },
  });

  console.log(`- Created donor: ${input.name} (${eligibilityStatus})`);
  return donor;
}

async function main() {
  await connectDB();
  console.log("Connected to MongoDB. Seeding...\n");

  const superAdmin = await upsertUser(env.seed.name, env.seed.identifier, env.seed.password, "SUPER_ADMIN");
  await upsertUser("Ayesha Rahman", "ayesha.admin@lifedrop.app", "AdminPass123!", "ADMIN");
  const member = await upsertUser("Karim Hossain", "karim.member@lifedrop.app", "MemberPass123!", "MEMBER");

  const donorA = await seedDonor({
    name: "Fahim Ahmed",
    phone: "+8801711111111",
    email: "fahim.ahmed@example.com",
    bloodGroup: "O+",
    gender: "MALE",
    dob: "1996-04-12",
    division: "Dhaka",
    district: "Dhaka",
    upazila: "Dhanmondi",
    lastDonationDate: null,
    weightKg: 72,
    bloodPressure: "118/76",
    hemoglobin: 15.2,
    conditions: {},
  });

  await seedDonor({
    name: "Nusrat Jahan",
    phone: "+8801722222222",
    email: "nusrat.jahan@example.com",
    bloodGroup: "A-",
    gender: "FEMALE",
    dob: "1999-09-02",
    division: "Khulna",
    district: "Khulna",
    upazila: "Sonadanga",
    lastDonationDate: "2025-12-01",
    weightKg: 58,
    bloodPressure: "110/70",
    hemoglobin: 13.1,
    conditions: {},
  });

  await seedDonor({
    name: "Rashed Kabir",
    phone: "+8801733333333",
    email: "rashed.kabir@example.com",
    bloodGroup: "B+",
    gender: "MALE",
    dob: "1990-01-20",
    division: "Chattogram",
    district: "Chattogram",
    upazila: "Panchlaish",
    lastDonationDate: null,
    weightKg: 80,
    bloodPressure: "130/85",
    hemoglobin: 14.0,
    conditions: { hepatitis: true },
  });

  if (donorA) {
    const existingDonation = await Donation.findOne({ donorId: donorA._id });
    if (!existingDonation) {
      await Donation.create({
        donorId: donorA._id,
        donorName: donorA.name,
        donorBloodGroup: donorA.bloodGroup,
        donationDate: new Date("2026-02-10"),
        location: "Dhaka Medical College Hospital",
        recipientName: "Patient in Ward 4B",
        requestedByName: "Dr. Sultana",
        requestedByPhone: "+8801799999999",
        notes: "Routine transfusion request",
        recordedBy: member!._id,
        recordedByName: member!.name,
      });
      donorA.lastDonationDate = new Date("2026-02-10");
      await donorA.save();
      console.log("- Created sample donation record for Fahim Ahmed");
    }
  }

  console.log("\nSeed complete.");
  console.log(`Login as SUPER_ADMIN with: ${superAdmin.identifier} / ${env.seed.password}`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
