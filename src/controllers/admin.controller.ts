import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../utils/ApiError";
import { Donor } from "../models/donor.model";
import { User } from "../models/user.model";
import { toStaffMember } from "../utils/serializers";
import { env } from "../config/env";

function percentTrend(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10; // one decimal place
}

export const getStats = catchAsync(async (_req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalDonors, totalDonors30dAgo, eligibleDonors, eligibleDonors30dAgo, activeAdmins] = await Promise.all([
    Donor.countDocuments({}),
    Donor.countDocuments({ createdAt: { $lte: thirtyDaysAgo } }),
    Donor.countDocuments({
      "medicalRecord.eligibilityStatus": "ELIGIBLE",
      $or: [
        { lastDonationDate: null },
        {
          lastDonationDate: {
            $lte: new Date(now.getTime() - env.eligibility.minDonationGapDays * 24 * 60 * 60 * 1000),
          },
        },
      ],
    }),
    // Approximation: eligible donors among those already registered 30 days
    // ago, using their *current* medical status (historical eligibility
    // snapshots aren't stored).
    Donor.countDocuments({
      createdAt: { $lte: thirtyDaysAgo },
      "medicalRecord.eligibilityStatus": "ELIGIBLE",
      $or: [
        { lastDonationDate: null },
        {
          lastDonationDate: {
            $lte: new Date(now.getTime() - env.eligibility.minDonationGapDays * 24 * 60 * 60 * 1000),
          },
        },
      ],
    }),
    User.countDocuments({ role: { $in: ["SUPER_ADMIN", "ADMIN"] }, status: "ACTIVE" }),
  ]);

  res.status(200).json({
    totalDonors,
    eligibleDonors,
    // Requests aren't modeled yet on the backend - the frontend's Requests
    // page is still a placeholder ("wire this up next"). Wire up a Request
    // model + this count together when that feature is built.
    emergencyRequests: 0,
    activeAdmins,
    totalDonorsTrend: percentTrend(totalDonors, totalDonors30dAgo),
    eligibleDonorsTrend: percentTrend(eligibleDonors, eligibleDonors30dAgo),
  });
});

export const listStaff = catchAsync(async (_req, res) => {
  const staff = await User.find({}).sort({ createdAt: -1 });
  res.status(200).json(staff.map(toStaffMember));
});

export const updateStaffRole = catchAsync(async (req, res) => {
  const { role } = req.body as { role: "SUPER_ADMIN" | "ADMIN" | "MEMBER" };

  if (req.params.id === req.user!.id && role !== "SUPER_ADMIN") {
    throw ApiError.badRequest("You cannot demote your own account");
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw ApiError.notFound("Staff member not found");

  res.status(200).json(toStaffMember(user));
});

export const toggleStaffStatus = catchAsync(async (req, res) => {
  const { status } = req.body as { status: "ACTIVE" | "DISABLED" };

  if (req.params.id === req.user!.id && status === "DISABLED") {
    throw ApiError.badRequest("You cannot disable your own account");
  }

  // Disabling an account also invalidates any tokens already issued to it.
  const update =
    status === "DISABLED" ? { $set: { status }, $inc: { tokenVersion: 1 } } : { $set: { status } };

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) throw ApiError.notFound("Staff member not found");

  res.status(200).json(toStaffMember(user));
});
