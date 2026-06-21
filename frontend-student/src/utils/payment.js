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

export function isPaymentPending(application) {
  return application?.payment?.required && application.payment.status === 'pending';
}

export function isPaymentPaid(application) {
  return application?.payment?.status === 'paid';
}

export function shouldShowPaymentPanel(application, offering) {
  if (!offering?.paymentConfig?.enabled) return false;
  if (!application) {
    return offering.paymentConfig.timing === 'before_submit';
  }
  return application.payment?.required === true;
}
