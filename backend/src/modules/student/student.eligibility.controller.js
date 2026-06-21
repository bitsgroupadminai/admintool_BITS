import * as eligibilityService from './student.eligibility.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export async function previewEligibility(req, res, next) {
  try {
    const result = await eligibilityService.previewStudentEligibility(
      req.user.instituteId,
      req.params.offeringId,
      req.user,
    );
    sendSuccess(res, 200, 'Eligibility preview', result);
  } catch (err) {
    next(err);
  }
}
