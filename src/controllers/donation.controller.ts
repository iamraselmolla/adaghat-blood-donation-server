import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../utils/ApiError";
import { Donor } from "../models/Donor.model";
import { Donation } from "../models/Donation.model";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination";
import { canDonateNow } from "../utils/eligibility";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const createDonation = catchAsync(async (req, res) => {
  const { donorId, donationDate, location, recipientName, requestedByName, requestedByPhone, notes } =
    req.body as {
      donorId: string;
      donationDate: string;
      location: string;
      recipientName: string;
      requestedByName?: string;
      requestedByPhone?: string;
      notes?: string;
    };

  const donor = await Donor.findById(donorId);
  if (!donor) throw ApiError.notFound("Donor not found");

  const eligibility = canDonateNow(donor);
  if (!eligibility.eligible) {
    throw ApiError.badRequest(
      eligibility.reason || "Donor is not currently eligible to donate",
      eligibility.remainingDays !== undefined
        ? { donorId: `Not eligible for ${eligibility.remainingDays} more day(s)` }
        : { donorId: eligibility.reason || "Not eligible" }
    );
  }

  const donation = await Donation.create({
    donorId: donor._id,
    donorName: donor.name,
    donorBloodGroup: donor.bloodGroup,
    donationDate: new Date(donationDate),
    location,
    recipientName,
    requestedByName,
    requestedByPhone,
    notes,
    recordedBy: req.user!.id,
    recordedByName: req.user!.name,
  });

  // Keep the donor's lastDonationDate as the most recent recorded donation.
  const newDonationTime = new Date(donationDate).getTime();
  const currentLastTime = donor.lastDonationDate ? new Date(donor.lastDonationDate).getTime() : -Infinity;
  if (newDonationTime > currentLastTime) {
    donor.lastDonationDate = new Date(donationDate);
    await donor.save();
  }

  res.status(201).json(donation);
});

export const listDonations = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const { donorId, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {};
  if (donorId) filter.donorId = donorId;
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ donorName: re }, { recipientName: re }, { location: re }];
  }

  const [data, total] = await Promise.all([
    Donation.find(filter).sort({ donationDate: -1 }).skip(skip).limit(limit),
    Donation.countDocuments(filter),
  ]);

  res.status(200).json(buildPaginatedResponse(data, total, page, limit));
});

export const listDonationsByDonor = catchAsync(async (req, res) => {
  const donations = await Donation.find({ donorId: req.params.id }).sort({ donationDate: -1 });
  res.status(200).json(donations);
});
