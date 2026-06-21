import { Offering } from '../offerings/offering.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import {
  evaluateEligibilityRules,
  buildStudentEligibilityProfile,
} from '../../shared/helpers/eligibilityEvaluation.helper.js';

/**
 * Preview eligibility for a student against an offering.
 * @param {string} instituteId
 * @param {string} offeringId
 * @param {Object} user
 */
export async function previewStudentEligibility(instituteId, offeringId, user) {
  const offering = await Offering.findOne({ _id: offeringId, instituteId });
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }

  const rules = offering.eligibilityRules ?? [];
  if (!rules.length) {
    return {
      offeringId: offering._id.toString(),
      offeringName: offering.name,
      eligible: true,
      needsReview: false,
      results: [],
      message: 'No eligibility rules configured for this option.',
    };
  }

  let profileUser = user;
  if (!user.enrolledProgrammeName && user.enrolledOfferingId) {
    const enrolledOffering = await Offering.findOne({
      _id: user.enrolledOfferingId,
      instituteId,
    }).select('name');
    profileUser = {
      ...user,
      enrolledProgrammeName: enrolledOffering?.name ?? null,
    };
  }

  const dbUser = await User.findById(user.userId).select(
    'enrolledProgrammeName enrollmentStatus enrolledOfferingId',
  );

  const profile = buildStudentEligibilityProfile({
    ...profileUser,
    enrolledProgrammeName: dbUser?.enrolledProgrammeName ?? profileUser.enrolledProgrammeName,
    enrollmentStatus: dbUser?.enrollmentStatus,
  });

  const evaluation = evaluateEligibilityRules(rules, profile);
  const needsReview = evaluation.results.some((r) => r.status === 'unchecked');

  return {
    offeringId: offering._id.toString(),
    offeringName: offering.name,
    eligible: evaluation.eligible,
    needsReview,
    failures: evaluation.failures,
    results: evaluation.results,
    message: evaluation.eligible
      ? needsReview
        ? 'You appear eligible, but some requirements need institute review.'
        : 'You meet all eligibility requirements.'
      : 'You do not meet all eligibility requirements based on your profile.',
  };
}
