import { Request, Response } from "express";
import { User } from "@/models/user.model";
import { Donor } from "@/models/donor.model";
import { MedicalRecord } from "@/models/medicalRecord.model";
import { ApiError } from "@/utils/ApiError";
import { serializeStaffMember } from "@/utils/serializers";
import { ELIGIBILITY, ROLES, STATUS } from "@/constants/roles";
import { UpdateStaffRoleInput, UpdateStaffStatusInput } from "@/validators/admin.validator";

/** GET /admin/stats — dashboard overview counters. */
export async function getStats(_req: Request, res: Response) {
  const [totalDonors, eligibleDonors, activeAdmins] = await Promise.all([
    Donor.countDocuments(),
    MedicalRecord.countDocuments({ eligibilityStatus: ELIGIBILITY.ELIGIBLE }),
    User.countDocuments({ role: { $in: [ROLES.SUPER_ADMIN, ROLES.ADMIN] }, status: STATUS.ACTIVE }),
  ]);

  res.status(200).json({
    totalDonors,
    eligibleDonors,
    // Emergency Requests is a scaffolded feature on the frontend with no
    // backing model yet — reporting 0 until that module is built out.
    emergencyRequests: 0,
    activeAdmins,
  });
}

/** GET /admin/staff — Super Admin only. */
export async function listStaff(_req: Request, res: Response) {
  const staff = await User.find({}).sort({ createdAt: -1 });
  res.status(200).json(staff.map(serializeStaffMember));
}

/** PUT /admin/staff/:id/role — Super Admin only. */
export async function updateStaffRole(
  req: Request<{ id: string }, unknown, UpdateStaffRoleInput>,
  res: Response
) {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound("Staff member not found");
  if (target.role === ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden("Cannot change the role of a Super Admin");
  }

  target.role = req.body.role;
  await target.save();

  res.status(200).json(serializeStaffMember(target));
}

/** PUT /admin/staff/:id/status — Super Admin only. */
export async function toggleStaffStatus(
  req: Request<{ id: string }, unknown, UpdateStaffStatusInput>,
  res: Response
) {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound("Staff member not found");
  if (target.role === ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden("Cannot change the status of a Super Admin");
  }
  if (target.id === req.user!.id) {
    throw ApiError.badRequest("You cannot change your own account status");
  }

  target.status = req.body.status;
  if (target.status === STATUS.DISABLED) {
    // Immediately invalidate any outstanding refresh tokens for this user.
    target.tokenVersion += 1;
  }
  await target.save();

  res.status(200).json(serializeStaffMember(target));
}
