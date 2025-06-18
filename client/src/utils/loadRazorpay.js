// src/utils/loadRazorpay.js
export function loadRazorpay(timeout = 10000) {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (window.Razorpay) {
      return resolve();
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.defer = true;

    // Success handler
    script.onload = () => {
      clearTimeout(timer);
      if (window.Razorpay) {
        resolve();
      } else {
        reject(new Error("Razorpay SDK loaded but unavailable."));
      }
    };

    // Error handler
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Failed to load Razorpay SDK."));
    };

    // Timeout guard
    const timer = setTimeout(() => {
      script.onload = null;
      script.onerror = null;
      if (!window.Razorpay) {
        reject(new Error("Razorpay SDK load timed out."));
      }
    }, timeout);

    document.body.appendChild(script);
  });
}
