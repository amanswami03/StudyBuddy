import { useState } from 'react';
// import RazorpayCheckout from './RazorpayCheckout'; // COMMENTED OUT - Using Razorpay Payment Buttons
import { getSubscriptionStatus } from '../utils/api';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  // const [showCheckout, setShowCheckout] = useState(false); // COMMENTED OUT
  // const [selectedPlan, setSelectedPlan] = useState(null); // COMMENTED OUT
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load Razorpay script on mount
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      try {
        const status = await getSubscriptionStatus();
        setSubscriptionStatus(status);
        console.log('Subscription status:', status);
      } catch (err) {
        console.error('Failed to load subscription status:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubscriptionStatus();
  }, []);

  const plans = [
    {
      id: 1,
      name: 'Free',
      price: 0,
      priceInPaise: 0,
      priceDisplay: '$0',
      period: '/mo',
      features: [
        'Up to 3 study groups',
        'Basic scheduling',
        'Group chat',
        '5GB storage',
        'Community support'
      ],
      popular: false,
      cta: 'Get Started'
    },
    {
      id: 2,
      name: 'Pro',
      price: 5,
      priceInPaise: 500,
      priceDisplay: '₹5',
      period: '/mo',
      features: [
        'Up to 10 study groups',
        '100GB storage',
        'Analytics dashboard',
        'Priority support',
        'Advanced scheduling'
      ],
      popular: true,
      cta: 'Get Started'
    },
    {
      id: 3,
      name: 'Ultra',
      price: 10,
      priceInPaise: 1000,
      priceDisplay: '₹10',
      period: '/mo',
      features: [
        'Everything in Pro',
        'Unlimited study groups',
        'Unlimited storage',
        'Personal mentor access',
        'Custom study plans'
      ],
      popular: false,
      cta: 'Get Started'
    },
  ];

  const handleSelectPlan = async (plan) => {
    if (plan.priceInPaise === 0) {
      alert('You are already on the Free plan!');
      return;
    }

    if (!window.Razorpay) {
      alert('Payment system loading... Please try again.');
      return;
    }

    const token = localStorage.getItem('sb_token');
    if (!token) {
      alert('Please login to proceed with payment.');
      return;
    }

    setProcessingPayment(true);

    try {
      // Step 1: Create order on backend
      console.log(`📝 Creating order for plan: ${plan.name}, amount: ${plan.priceInPaise} paise`);
      const apiUrl = import.meta.env.VITE_API_URL;
      const createOrderResponse = await fetch(`${apiUrl}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: plan.id,
          amount: plan.priceInPaise,
          plan_name: plan.name,
        }),
      });

      if (!createOrderResponse.ok) {
        throw new Error(`Failed to create order: ${createOrderResponse.statusText}`);
      }

      const orderData = await createOrderResponse.json();
      if (!orderData.id) {
        throw new Error('No order ID received from backend');
      }

      console.log(`✅ Order created: ${orderData.id}`);

      // Step 2: Initialize Razorpay with order_id (MANDATORY for live payments)
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId || !keyId.startsWith('rzp_')) {
        throw new Error('Razorpay Key ID not properly configured');
      }

      const options = {
        key: keyId,
        amount: plan.priceInPaise, // in paise
        currency: 'INR',
        name: 'StudyBuddy',
        description: `${plan.name} Plan - ₹${plan.price}/month`,
        order_id: orderData.id, // CRITICAL: Must pass order_id for live payments
        handler: async function (response) {
          try {
            // Step 3: Verify payment signature on backend
            console.log('✅ Payment completed! Verifying signature...');
            const verifyResponse = await fetch(`${apiUrl}/api/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            console.log('✅ Payment verified successfully!');
            alert(`✅ Payment of ₹${plan.price} successful!\nOrder ID: ${response.razorpay_order_id}`);
            
            // Reload subscription status
            const status = await getSubscriptionStatus();
            setSubscriptionStatus(status);
            
            // Redirect to premium settings after successful payment
            setTimeout(() => {
              navigate('/settings', { state: { activeSection: 'premium' } });
            }, 1000);
          } catch (err) {
            console.error('❌ Payment verification failed:', err);
            alert(`Payment verification failed: ${err.message}`);
          } finally {
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: 'StudyBuddy User',
          email: 'user@studybuddy.com',
        },
        theme: {
          color: '#3b82f6',
        },
        modal: {
          ondismiss: function () {
            console.log('Payment modal closed');
            setProcessingPayment(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        console.error('❌ Payment failed:', response.error);
        alert(`Payment failed: ${response.error.description}`);
        setProcessingPayment(false);
      });

      rzp.open();
    } catch (err) {
      console.error('❌ Error initiating payment:', err);
      alert(`Error: ${err.message}`);
      setProcessingPayment(false);
    }
  };

  // COMMENTED OUT - Payment handled directly in handleSelectPlan
  // const handlePaymentSuccess = (result) => {
  //   console.log('✅ Payment successful!', result);
  //   alert('✅ Subscription activated! Thank you for subscribing.');
  //   // Reload subscription status
  //   getSubscriptionStatus().then(setSubscriptionStatus);
  // };

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Loading subscription status...</div>;
  }

  const isSubscribed = subscriptionStatus?.subscribed;
  const currentPlan = subscriptionStatus?.plan_name?.toLowerCase();

  return (
    <div className="min-h-screen bg-white text-slate-900 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-4">PRICING</p>
          <h1 className="text-5xl font-bold mb-6 text-slate-900">Choose your plan</h1>
          <p className="text-xl text-slate-600">
            Select the perfect plan to unlock premium features and accelerate your learning
          </p>
        </div>

        {isSubscribed && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <p className="text-lg font-semibold">
              ✅ You are currently subscribed to: <strong>{subscriptionStatus.plan_name}</strong> plan
            </p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            // Allow button click unless already on this exact plan
            const isCurrentPlan = isSubscribed && currentPlan === plan.name.toLowerCase() && plan.priceInPaise !== 0;
            const isFreePlan = plan.priceInPaise === 0;
            
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-8 border-2 transition-all ${
                  plan.popular
                    ? 'border-blue-500 bg-slate-50 shadow-2xl transform md:scale-105'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      ⭐ Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h2>

                {/* Price */}
                <div className="mb-8">
                  <span className="text-5xl font-bold text-slate-900">{plan.priceDisplay}</span>
                  <span className="text-slate-600 ml-2">{plan.period}</span>
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrentPlan || processingPayment}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isCurrentPlan
                      ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                      : processingPayment
                      ? 'bg-blue-400 text-white cursor-wait'
                      : plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300'
                  }`}
                >
                  {processingPayment ? 'Processing...' : isCurrentPlan ? 'Current Plan' : isFreePlan && isSubscribed ? 'Current Plan' : isSubscribed && plan.name.toLowerCase() > currentPlan ? 'Upgrade' : isSubscribed && plan.name.toLowerCase() < currentPlan ? 'Downgrade' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="bg-slate-50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Compare Plans</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-900">Free</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-900">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-900">Ultra</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Study Groups', free: '3', pro: '10', ultra: '∞' },
                  { name: 'Storage', free: '5GB', pro: '100GB', ultra: '∞' },
                  { name: 'Analytics', free: '✗', pro: '✓', ultra: '✓' },
                  { name: 'Priority Support', free: '✗', pro: '✓', ultra: '✓' },
                  { name: 'Mentor Access', free: '✗', pro: '✗', ultra: '✓' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-4 px-4 font-medium text-slate-900">{row.name}</td>
                    <td className="text-center py-4 px-4 text-slate-700">{row.free}</td>
                    <td className="text-center py-4 px-4 text-slate-700">{row.pro}</td>
                    <td className="text-center py-4 px-4 text-slate-700">{row.ultra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Razorpay Checkout Modal - COMMENTED OUT */}
      {/* {selectedPlan && (
        <RazorpayCheckout
          isOpen={showCheckout}
          onClose={() => {
            setShowCheckout(false);
            setSelectedPlan(null);
          }}
          onSuccess={handlePaymentSuccess}
          planId={selectedPlan.id}
          amount={selectedPlan.priceInPaise}
          planName={selectedPlan.name}
        />
      )} */}
    </div>
  );
};

export default SubscriptionPlans;
