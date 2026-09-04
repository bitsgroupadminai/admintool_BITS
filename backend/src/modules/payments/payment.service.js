import { Payment } from './payment.model.js';
import { Application } from '../applications/application.model.js';
import { AppError } from '../../core/utils/AppError.js';
import {
  PAYMENT_PURPOSE,
  PAYMENT_STATUS,
  PAYMENT_TIMING,
} from '../../shared/enums/payment.enums.js';
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyRazorpayPaymentSignature,
} from '../../shared/services/razorpay.service.js';
import {
  applyWorkflowOutcome,
  findStepOutcome,
  getCurrentWorkflowStep,
  getWorkflowSteps,
} from '../../shared/helpers/workflowExecution.helper.js';
import { settleAiWorkflowSteps } from '../ai-verification/ai-step.helper.js';
import { enqueueApplicationAiVerification } from '../../core/queues/ai-verification.queue.js';
import { OUTCOME_TYPE } from '../../shared/enums/workflow.enums.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { ROLES } from '../../shared/constants/roles.js';
import { refreshApplicationRuntime } from '../../shared/services/applicationRuntime.service.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { emitApplicationUpdated } from '../../shared/helpers/realtime.helper.js';
import { notifyWorkflowStepCompleted } from '../../shared/templates/workflowStepEmails.js';
import { notifyPaymentReceipt } from '../../shared/templates/paymentEmails.js';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Institute } from '../institutes/institute.model.js';
import { Appointment, APPOINTMENT_STATUS as APPOINTMENT_VISIT_STATUS } from '../appointments/appointment.model.js';
import { logger } from '../../core/logger/index.js';

function normalizePaymentConfig(config) {
  if (!config?.enabled) {
    return { enabled: false };
  }
  return {
    enabled: true,
    amount: Number(config.amount),
    currency: config.currency ?? 'INR',
    label: config.label?.trim() || 'Service fee',
    timing: config.timing ?? PAYMENT_TIMING.BEFORE_SUBMIT,
    workflowStepId: config.workflowStepId?.trim() || null,
  };
}

function getOfferingWorkflowSteps(offering, application) {
  if (application?.workflow?.steps?.length) {
    return application.workflow.steps;
  }
  return offering?.workflowSteps ?? [];
}

/**
 * Prefer a dedicated fee/payment workflow step over pay-before-submit when
 * the offering already has one (e.g. "Fee Payment" as step 5).
 */
function findWorkflowFeeStep(offering, application, config = null) {
  const steps = getOfferingWorkflowSteps(offering, application);
  const configuredId = config?.workflowStepId || offering?.paymentConfig?.workflowStepId;
  if (configuredId) {
    const match = steps.find((step) => step.stepId === configuredId);
    if (match) return match;
  }
  return (
    steps.find((step) => /fee|payment/i.test(String(step.name || ''))) ?? null
  );
}

function resolvePaymentConfig(offering, application) {
  const config = normalizePaymentConfig(offering?.paymentConfig);
  if (!config.enabled) return config;
  const feeStep = findWorkflowFeeStep(offering, application, config);
  if (!feeStep) return config;
  return {
    ...config,
    timing: PAYMENT_TIMING.WORKFLOW_STEP,
    workflowStepId: feeStep.stepId,
  };
}

export function formatPaymentConfig(config) {
  const normalized = normalizePaymentConfig(config ?? {});
  if (!normalized.enabled) {
    return { enabled: false };
  }
  return normalized;
}

function rupeesToPaise(amount) {
  const rupees = Number(amount);
  if (!Number.isFinite(rupees) || rupees < 1) {
    throw new AppError('Payment amount is not configured correctly for this offering', 400);
  }
  return Math.round(rupees * 100);
}

function formatAmountDisplay(amount, currency = 'INR') {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return `${currency} ${amount}`;
}

async function findPaidPayment(applicationId, purpose, workflowStepId = null) {
  const query = {
    applicationId,
    purpose,
    status: PAYMENT_STATUS.PAID,
  };
  if (workflowStepId) {
    query.workflowStepId = workflowStepId;
  }
  return Payment.findOne(query).sort({ paidAt: -1 });
}

/**
 * @param {import('../offerings/offering.model.js').Offering} offering
 * @param {import('../applications/application.model.js').Application} application
 */
export async function getApplicationPaymentState(offering, application) {
  const config = resolvePaymentConfig(offering, application);
  if (!config.enabled) {
    return {
      required: false,
      status: 'not_required',
      configured: isRazorpayConfigured(),
    };
  }

  const base = {
    configured: isRazorpayConfigured(),
    label: config.label,
    amount: config.amount,
    amountDisplay: formatAmountDisplay(config.amount, config.currency),
    currency: config.currency,
    timing: config.timing,
    workflowStepId: config.workflowStepId,
  };

  if (config.timing === PAYMENT_TIMING.BEFORE_SUBMIT) {
    const paid = await findPaidPayment(application._id, PAYMENT_PURPOSE.BEFORE_SUBMIT);
    return {
      ...base,
      required: true,
      status: paid ? 'paid' : 'pending',
      paidAt: paid?.paidAt ?? null,
    };
  }

  const currentStep = getCurrentWorkflowStep(application);
  let atFeeStep =
    [APPLICATION_STATUS.IN_REVIEW, APPLICATION_STATUS.SUBMITTED].includes(application.status) &&
    currentStep?.stepId === config.workflowStepId;

  if (!atFeeStep && config.workflowStepId && currentStep?.stepId === config.workflowStepId) {
    const visitCompleted = await Appointment.exists({
      applicationId: application._id,
      status: APPOINTMENT_VISIT_STATUS.COMPLETED,
    });
    if (visitCompleted && application.status !== APPLICATION_STATUS.DRAFT) {
      atFeeStep = true;
    }
  }

  if (!atFeeStep) {
    const paid = config.workflowStepId
      ? await findPaidPayment(application._id, PAYMENT_PURPOSE.WORKFLOW_STEP, config.workflowStepId)
      : null;
    return {
      ...base,
      required: false,
      status: paid ? 'paid' : 'not_required',
      paidAt: paid?.paidAt ?? null,
    };
  }

  const paid = await findPaidPayment(
    application._id,
    PAYMENT_PURPOSE.WORKFLOW_STEP,
    config.workflowStepId,
  );

  return {
    ...base,
    required: true,
    status: paid ? 'paid' : 'pending',
    paidAt: paid?.paidAt ?? null,
  };
}

async function assertApplicationOwnership(application, userEmail) {
  if (application.applicantEmail !== userEmail.toLowerCase()) {
    throw new AppError('You can only pay for your own requests', 403);
  }
}

async function advanceWorkflowAfterPayment(application, offering, user, instituteId) {
  const config = resolvePaymentConfig(offering, application);
  if (config.timing !== PAYMENT_TIMING.WORKFLOW_STEP || !config.workflowStepId) {
    return { enqueueAiVerification: false };
  }

  const step = getCurrentWorkflowStep(application);
  if (!step || step.stepId !== config.workflowStepId) {
    return { enqueueAiVerification: false };
  }

  const outcome = findStepOutcome(step, OUTCOME_TYPE.APPROVED);
  if (!outcome) {
    throw new AppError('This workflow step is not configured for payment completion', 400);
  }

  const actor = {
    userId: user.userId ?? user._id?.toString?.() ?? 'student',
    name: user.name ?? 'Student',
    role: ROLES.STUDENT,
  };

  const result = applyWorkflowOutcome(application, step, outcome, actor, 'Fee paid online');
  const enqueueAiVerification = settleAiWorkflowSteps(application, actor);
  await refreshApplicationRuntime(application, instituteId);

  if (result.terminal || result.autoAdvance) {
    const [service, institute] = await Promise.all([
      Service.findById(application.serviceId).select('name'),
      Institute.findById(instituteId).select('name'),
    ]);
    const following = getWorkflowSteps(application).find(
      (item) => Number(item.order) > Number(step.order),
    );
    await notifyWorkflowStepCompleted({
      application,
      step,
      steps: getWorkflowSteps(application),
      context: {
        serviceName: service?.name ?? 'Service',
        offeringName: offering.name,
        instituteName: institute?.name ?? 'Your institute',
        nextStepName: following?.name,
      },
      offering,
    });
  }

  return { enqueueAiVerification };
}

/**
 * @param {string} instituteId
 * @param {{ email: string, name: string, userId?: string }} user
 * @param {string} serviceId
 * @param {string} offeringId
 */
/**
 * After a visit appointment is completed, move the request to the linked fee step
 * when the student is one step away (or still before) that payment step.
 *
 * @param {import('../applications/application.model.js').Application} application
 * @param {import('../offerings/offering.model.js').Offering} offering
 * @param {string} instituteId
 */
export async function unlockWorkflowPaymentAfterVisit(application, offering, instituteId) {
  const config = resolvePaymentConfig(offering, application);
  if (!config.enabled || config.timing !== PAYMENT_TIMING.WORKFLOW_STEP || !config.workflowStepId) {
    return { unlocked: false };
  }

  const paid = await findPaidPayment(
    application._id,
    PAYMENT_PURPOSE.WORKFLOW_STEP,
    config.workflowStepId,
  );
  if (paid) {
    return { unlocked: false, alreadyPaid: true };
  }

  const steps = getWorkflowSteps(application);
  const paymentStep = steps.find((step) => step.stepId === config.workflowStepId);
  if (!paymentStep) {
    return { unlocked: false };
  }

  const currentStep = getCurrentWorkflowStep(application);
  if (!currentStep) {
    return { unlocked: false };
  }

  if (currentStep.order < paymentStep.order - 1) {
    return { unlocked: false, waitingForEarlierSteps: true };
  }

  if (currentStep.stepId === config.workflowStepId) {
    return { unlocked: true, alreadyAtStep: true };
  }

  if (currentStep.order >= paymentStep.order) {
    return { unlocked: false };
  }

  application.currentStepId = config.workflowStepId;
  application.status = APPLICATION_STATUS.IN_REVIEW;
  await refreshApplicationRuntime(application, instituteId);
  await application.save();

  return { unlocked: true, advanced: true };
}

export async function createServicePaymentOrder(instituteId, user, serviceId, offeringId) {
  if (!isRazorpayConfigured()) {
    throw new AppError('Online payments are not available right now', 503);
  }

  const applicantEmail = user?.email?.toLowerCase?.();
  if (!applicantEmail) {
    throw new AppError('Your session is missing an email. Please sign in again.', 401);
  }

  const offering = await Offering.findOne({
    _id: offeringId,
    instituteId,
    serviceId,
  });
  if (!offering) {
    throw new AppError('Service option not found', 404);
  }

  const application = await Application.findOne({
    instituteId,
    serviceId,
    offeringId,
    applicantEmail,
  });
  if (!application) {
    throw new AppError('Start your request before paying', 400);
  }

  const config = resolvePaymentConfig(offering, application);
  if (!config.enabled) {
    throw new AppError('This service option does not require payment', 400);
  }

  await assertApplicationOwnership(application, applicantEmail);

  try {
    await unlockWorkflowPaymentAfterVisit(application, offering, instituteId);
  } catch (err) {
    logger.error({ err, applicationId: application._id }, 'Could not unlock workflow payment step');
  }

  let paymentState = await getApplicationPaymentState(offering, application);

  if (!paymentState.required) {
    const currentStep = getCurrentWorkflowStep(application);
    const visitCompleted = await Appointment.exists({
      applicationId: application._id,
      status: APPOINTMENT_VISIT_STATUS.COMPLETED,
    });
    if (
      visitCompleted &&
      config.timing === PAYMENT_TIMING.WORKFLOW_STEP &&
      currentStep?.stepId === config.workflowStepId &&
      paymentState.status !== 'paid'
    ) {
      paymentState = { ...paymentState, required: true, status: 'pending' };
    }
  }

  if (!paymentState.required) {
    throw new AppError('Payment is not required at this stage', 400);
  }
  if (paymentState.status === 'paid') {
    throw new AppError('Payment has already been completed', 400);
  }

  const purpose =
    config.timing === PAYMENT_TIMING.WORKFLOW_STEP
      ? PAYMENT_PURPOSE.WORKFLOW_STEP
      : PAYMENT_PURPOSE.BEFORE_SUBMIT;
  const workflowStepId =
    config.timing === PAYMENT_TIMING.WORKFLOW_STEP ? config.workflowStepId : undefined;

  const amountPaise = rupeesToPaise(config.amount);
  const receipt = `p${application._id.toString().slice(-10)}${Date.now().toString(36)}`;

  const order = await createRazorpayOrder({
    amountPaise,
    currency: config.currency,
    receipt,
    notes: {
      applicationId: application._id.toString(),
      offeringId: offering._id.toString(),
      purpose,
    },
  });

  const payment = await Payment.create({
    instituteId,
    applicationId: application._id,
    serviceId,
    offeringId,
    applicantEmail,
    purpose,
    workflowStepId,
    label: config.label,
    amountPaise,
    currency: String(config.currency || 'INR').toUpperCase(),
    razorpayOrderId: order.id,
    status: PAYMENT_STATUS.CREATED,
  });

  return {
    paymentId: payment._id.toString(),
    orderId: order.id,
    amount: amountPaise,
    amountDisplay: formatAmountDisplay(config.amount, config.currency),
    currency: String(config.currency || 'INR').toUpperCase(),
    label: config.label,
    keyId: getRazorpayKeyId(),
    prefill: {
      name: application.applicantName,
      email: application.applicantEmail,
    },
  };
}

/**
 * @param {string} instituteId
 * @param {{ email: string, name: string, userId?: string }} user
 * @param {string} serviceId
 * @param {string} offeringId
 * @param {{ razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string }} payload
 */
export async function verifyServicePayment(
  instituteId,
  user,
  serviceId,
  offeringId,
  payload,
) {
  const payment = await Payment.findOne({
    razorpayOrderId: payload.razorpayOrderId,
    instituteId,
    serviceId,
    offeringId,
    applicantEmail: user.email.toLowerCase(),
  });

  if (!payment) {
    throw new AppError('Payment record not found', 404);
  }

  if (payment.status === PAYMENT_STATUS.PAID) {
    return { alreadyPaid: true, paymentId: payment._id.toString() };
  }

  const valid = verifyRazorpayPaymentSignature(
    payload.razorpayOrderId,
    payload.razorpayPaymentId,
    payload.razorpaySignature,
  );

  if (!valid) {
    payment.status = PAYMENT_STATUS.FAILED;
    await payment.save();
    throw new AppError('Payment verification failed', 400);
  }

  payment.status = PAYMENT_STATUS.PAID;
  payment.razorpayPaymentId = payload.razorpayPaymentId;
  payment.razorpaySignature = payload.razorpaySignature;
  payment.paidAt = new Date();
  await payment.save();

  const [application, offering] = await Promise.all([
    Application.findOne({ _id: payment.applicationId, instituteId }),
    Offering.findOne({ _id: payment.offeringId, instituteId }),
  ]);

  if (!application || !offering) {
    throw new AppError('Application not found', 404);
  }

  const { enqueueAiVerification } = await advanceWorkflowAfterPayment(
    application,
    offering,
    user,
    instituteId,
  );
  if (enqueueAiVerification) {
    application.aiVerificationPending = true;
  }
  await application.save();

  if (enqueueAiVerification) {
    await enqueueApplicationAiVerification(instituteId, application._id.toString()).catch(() => {});
  }

  const [service, institute] = await Promise.all([
    Service.findById(payment.serviceId).select('name'),
    Institute.findById(instituteId).select('name'),
  ]);

  notifyPaymentReceipt({
    payment,
    application,
    offering,
    serviceName: service?.name ?? 'Service',
    instituteName: institute?.name ?? 'Your institute',
  }).catch(() => {});

  emitApplicationUpdated({
    instituteId,
    applicationId: application._id.toString(),
    studentUserId: user.userId ?? null,
    assigneeUserId: application.assignedTo?.toString() ?? null,
    summary: {
      status: application.status,
      serviceId: application.serviceId.toString(),
      offeringId: application.offeringId.toString(),
      updatedAt: application.updatedAt,
    },
  });

  await flushInstituteReadCache(instituteId);

  return {
    paymentId: payment._id.toString(),
    paidAt: payment.paidAt,
    applicationStatus: application.status,
  };
}

export async function assertBeforeSubmitPaymentComplete(offering, application) {
  const paymentState = await getApplicationPaymentState(offering, application);
  if (paymentState.required && paymentState.status !== 'paid') {
    throw new AppError(
      `Complete ${paymentState.label ?? 'fee'} payment (${paymentState.amountDisplay}) before submitting`,
      400,
    );
  }
}
