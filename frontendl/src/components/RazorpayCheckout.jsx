import { useEffect, useState } from 'react';
// import { createOrder, verifyPayment } from '../utils/api'; // COMMENTED OUT
// RAZORPAY API CODE COMMENTED OUT - Using direct payment links instead

// Dummy component - Razorpay integration commented out
const RazorpayCheckout = ({ isOpen, onClose, onSuccess, planId, amount, planName }) => {
  return null; // Component not used - redirect to Razorpay.me instead
};

/*
// ORIGINAL RAZORPAY CODE BELOW - COMMENTED OUT FOR REFERENCE

const RazorpayCheckout_Original = ({ isOpen, onClose, onSuccess, planId, amount, planName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load Razorpay script dynamically
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => console.log('✅ Razorpay script loaded');
      script.onerror = () => console.error('❌ Failed to load Razorpay script');
      document.body.appendChild(script);
    }
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Create order on backend
      console.log(`📝 Creating order for plan: ${planName}, amount: ${amount} paise`);
      let orderData;
      try {
        orderData = await createOrder(planId, amount, planName);
      } catch (apiErr) {
        console.error('❌ API Error creating order:', apiErr);
        setError(`Failed to create order: ${apiErr.message || 'Server error'}. Please try again.`);
        setLoading(false);
        return;
      }
      
      if (!orderData || !orderData.id) {
        throw new Error('Failed to create order: No order ID received');
      }

      const orderId = orderData.id;
      console.log(`✅ Order created: ${orderId}`);

      // Step 2: Initialize Razorpay checkout
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) {
        throw new Error('Razorpay Key ID not configured in environment');
      }

      const options = {
        key: keyId,
        amount: amount, // in paise
        currency: 'INR',
        order_id: orderId,
        name: 'StudyBuddy',
        description: `Subscribe to ${planName} Plan`,
        handler: async (response) => {
          try {
            console.log('✅ Payment successful!', response);
            
            // Step 3: Verify payment on backend
            const verificationResult = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            console.log('✅ Payment verified:', verificationResult);
            
            // Call success callback
            if (onSuccess) {
              onSuccess(verificationResult);
            }
            
            // Close modal
            onClose();
          } catch (err) {
            console.error('❌ Payment verification failed:', err);
            setError(`Payment verification failed: ${err.message}`);
            setLoading(false);
          }
        },
        prefill: {
          name: 'StudyBuddy User',
          email: 'user@example.com',
        },
        theme: {
          color: '#3b82f6', // Tailwind blue
        },
        modal: {
          ondismiss: () => {
            console.log('⚠️ Payment modal dismissed');
            setLoading(false);
          },
        },
      };

      // Step 4: Open Razorpay checkout
      if (!window.Razorpay) {
        throw new Error('Razorpay script not loaded. Please refresh the page and try again.');
      }

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', (response) => {
        console.error('❌ Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description || response.error.reason}`);
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      console.error('❌ Error during payment:', err);
      setError(err.message || 'An error occurred during payment. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Complete Purchase</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Plan</p>
            <p className="text-lg font-semibold text-gray-900">{planName}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Amount</p>
            <p className="text-lg font-semibold text-gray-900">
              ₹{(amount / 100).toFixed(2)}
            </p>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition ${
            loading
              ? 'bg-blue-400 cursor-not-allowed opacity-75'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="mr-2">Processing...</span>
              <span className="inline-block animate-spin">↻</span>
            </span>
          ) : (
            'Pay Now with Razorpay'
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Secure payment powered by Razorpay
        </p>
      </div>
    </div>
  );
};

*/
// END OF COMMENTED OUT RAZORPAY CODE

export default RazorpayCheckout;
