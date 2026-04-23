import React, { useState, useEffect } from 'react';
import { Crown, Check, X, Users, HardDrive, Zap, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const PremiumSettings = ({ isDark }) => {
  const navigate = useNavigate();
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupCount, setGroupCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;

        // Fetch subscription status
        const subRes = await fetch(`${API_BASE}/api/payment/subscription-status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const subData = await subRes.json();
        setSubscriptionStatus(subData);

        // Fetch user groups count
        const groupRes = await fetch(`${API_BASE}/api/user/groups`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const groupData = await groupRes.json();
        setGroupCount(Array.isArray(groupData) ? groupData.length : groupData?.groups?.length || 0);
      } catch (err) {
        console.error('Failed to load subscription data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Feature limits based on subscription tier
  const featureLimits = {
    free: {
      maxGroups: 3,
      maxStorage: 5, // GB
      features: ['Up to 3 study groups', '5GB storage', 'Basic scheduling', 'Group chat', 'Community support'],
    },
    pro: {
      maxGroups: 10,
      maxStorage: 100, // GB
      features: ['Up to 10 study groups', '100GB storage', 'Analytics dashboard', 'Priority support', 'Advanced scheduling'],
    },
    ultra: {
      maxGroups: Infinity,
      maxStorage: Infinity,
      features: ['Unlimited study groups', 'Unlimited storage', 'All Pro features', 'Personal mentor access', 'Custom study plans', '24/7 priority support'],
    },
  };

  const currentPlan = subscriptionStatus?.subscribed ? subscriptionStatus.plan_name.toLowerCase() : 'free';
  const currentLimits = featureLimits[currentPlan] || featureLimits.free;

  const cardCls = `rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100'} shadow-paper`;
  const labelCls = `block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

  if (loading) {
    return (
      <div className={cardCls}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Current Plan Card */}
      <div className={`rounded-2xl p-8 text-white relative overflow-hidden`} style={{ background: subscriptionStatus?.subscribed ? 'linear-gradient(135deg, #db2777 0%, #be185d 100%)' : 'linear-gradient(135deg, #475569 0%, #334155 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent,transparent 27px,rgba(255,255,255,0.05) 27px,rgba(255,255,255,0.05) 28px)', backgroundSize: '100% 28px' }} />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8" />
              <div>
                <p className="text-sm font-medium opacity-90">Current Plan</p>
                <h2 className="text-3xl font-extrabold">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</h2>
              </div>
            </div>
          </div>

          {subscriptionStatus?.subscribed && subscriptionStatus?.expires_at && (
            <p className="text-sm opacity-80">
              Renews on {new Date(subscriptionStatus.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Usage Statistics */}
      <div className={cardCls}>
        <h3 className={`font-extrabold text-base mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Your Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Study Groups */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <label className={labelCls}>Study Groups</label>
            </div>
            <div className={`text-3xl font-extrabold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              {groupCount} <span className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/ {currentLimits.maxGroups === Infinity ? '∞' : currentLimits.maxGroups}</span>
            </div>
            <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-blue-200'} overflow-hidden`}>
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                style={{ width: currentLimits.maxGroups === Infinity ? '100%' : `${(groupCount / currentLimits.maxGroups) * 100}%` }}
              />
            </div>
            {groupCount >= currentLimits.maxGroups && currentLimits.maxGroups !== Infinity && (
              <p className="text-xs text-red-500 font-semibold mt-2">⚠️ Group limit reached</p>
            )}
          </div>

          {/* Storage */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-5 h-5 text-purple-600" />
              <label className={labelCls}>Storage Used</label>
            </div>
            <div className={`text-3xl font-extrabold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
              {currentLimits.maxStorage === Infinity ? '∞' : currentLimits.maxStorage} <span className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>GB</span>
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {currentLimits.maxStorage === Infinity ? 'Unlimited storage' : `${currentLimits.maxStorage}GB available`}
            </p>
          </div>
        </div>
      </div>

      {/* Plan Features */}
      <div className={cardCls}>
        <h3 className={`font-extrabold text-base mb-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Plan Features</h3>
        <div className="space-y-3">
          {currentLimits.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* All Plans Comparison */}
      <div className={cardCls}>
        <h3 className={`font-extrabold text-base mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Compare Plans</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-amber-200'}`}>
                <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Feature</th>
                <th className={`text-center py-3 px-4 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Free</th>
                <th className={`text-center py-3 px-4 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Pro</th>
                <th className={`text-center py-3 px-4 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Ultra</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Study Groups', free: '3', pro: '10', ultra: '∞' },
                { name: 'Storage', free: '5GB', pro: '100GB', ultra: '∞' },
                { name: 'Analytics', free: <X className="w-4 h-4 mx-auto text-red-500" />, pro: <Check className="w-4 h-4 mx-auto text-emerald-500" />, ultra: <Check className="w-4 h-4 mx-auto text-emerald-500" /> },
                { name: 'Priority Support', free: <X className="w-4 h-4 mx-auto text-red-500" />, pro: <Check className="w-4 h-4 mx-auto text-emerald-500" />, ultra: <Check className="w-4 h-4 mx-auto text-emerald-500" /> },
                { name: 'Custom Plans', free: <X className="w-4 h-4 mx-auto text-red-500" />, pro: <X className="w-4 h-4 mx-auto text-red-500" />, ultra: <Check className="w-4 h-4 mx-auto text-emerald-500" /> },
              ].map((row, idx) => (
                <tr key={idx} className={`border-b ${isDark ? 'border-slate-700' : 'border-amber-100'}`}>
                  <td className={`py-3 px-4 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{row.name}</td>
                  <td className={`text-center py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{row.free}</td>
                  <td className={`text-center py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{row.pro}</td>
                  <td className={`text-center py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{row.ultra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade CTA */}
      {!subscriptionStatus?.subscribed && (
        <div className={`rounded-2xl p-8 text-white relative overflow-hidden`} style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent,transparent 27px,rgba(255,255,255,0.05) 27px,rgba(255,255,255,0.05) 28px)', backgroundSize: '100% 28px' }} />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-6 h-6" />
              <h3 className="text-xl font-extrabold">Ready to Upgrade?</h3>
            </div>
            <p className="text-green-100 mb-5">Unlock unlimited study groups, storage, and premium features</p>
            <button
              onClick={() => navigate('/subscriptions')}
              className="flex items-center gap-2 bg-white text-emerald-700 hover:bg-green-50 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
            >
              <ShoppingCart className="w-5 h-5" />
              View Subscription Plans
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PremiumSettings;
