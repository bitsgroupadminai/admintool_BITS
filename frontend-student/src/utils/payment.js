let razorpayScriptPromise = null;

export function loadRazorpayScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Payments are only available in the browser'));
  }
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        if (window.Razorpay) {
          resolve(window.Razorpay);
        } else {
          reject(new Error('Razorpay checkout failed to load'));
        }
      };
      script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

function getWorkflowSteps(offering, application) {
  if (application?.workflow?.steps?.length) {
    return application.workflow.steps;
  }
  return [...(offering?.workflowSteps ?? [])].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0),
  );
}

/**
 * Dedicated fee step in the student journey (configured step id, or a step named fee/payment).
 */
export function findWorkflowFeeStep(offering, application) {
  if (!offering?.paymentConfig?.enabled) return null;
  const steps = getWorkflowSteps(offering, application);
  const configuredId = offering.paymentConfig.workflowStepId;
  if (configuredId) {
    const match = steps.find((step) => step.stepId === configuredId);
    if (match) return match;
  }
  return steps.find((step) => /fee|payment/i.test(String(step.name || ''))) ?? null;
}

export function hasWorkflowFeeStep(offering, application) {
  return Boolean(findWorkflowFeeStep(offering, application));
}

export function isFeePaymentStep(step, offering, application) {
  const feeStep = findWorkflowFeeStep(offering, application);
  if (!feeStep || !step) return false;
  return step.id === feeStep.stepId || step.stepId === feeStep.stepId;
}

export function isAtWorkflowFeeStep(application, offering) {
  const feeStep = findWorkflowFeeStep(offering, application);
  if (!feeStep) return false;
  if (application?.workflow?.currentStep?.stepId === feeStep.stepId) return true;
  return (application?.workflow?.steps ?? []).some(
    (step) => step.stepId === feeStep.stepId && step.state === 'current',
  );
}

export function isPaymentPending(application, offering) {
  if (hasWorkflowFeeStep(offering, application)) return false;
  return application?.payment?.required && application.payment.status === 'pending';
}

export function isPaymentPaid(application) {
  return application?.payment?.status === 'paid';
}

export function shouldShowPaymentPanel(application, offering) {
  if (!offering?.paymentConfig?.enabled) return false;
  if (hasWorkflowFeeStep(offering, application)) return false;
  if (!application) {
    return offering.paymentConfig.timing === 'before_submit';
  }
  return application.payment?.required === true;
}
