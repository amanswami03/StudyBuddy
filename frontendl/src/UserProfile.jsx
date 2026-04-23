import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Edit, Mail, Award, BookOpen, Users, Clock, TrendingUp, Settings, Save, Search, X, Phone, MapPin, ArrowLeft, Flame, GraduationCap } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProfile, getUserProfile, updateProfile, getUserStats, getRankThresholds, getUserActivityStats, getMyGroups, listGroups, searchGroups, joinGroup, getUserStatsPublic, getUserActivityStatsPublic } from './utils/api';
import { useTheme } from './contexts/ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const SUBJECT_COLORS = [
  { strip: '#1d4ed8', badge: 'bg-blue-100 text-blue-800' },
  { strip: '#065f46', badge: 'bg-emerald-100 text-emerald-800' },
  { strip: '#6b21a8', badge: 'bg-purple-100 text-purple-800' },
  { strip: '#c2410c', badge: 'bg-orange-100 text-orange-800' },
  { strip: '#0e7490', badge: 'bg-cyan-100 text-cyan-800' },
];

export default function UserProfile() {
  const navigate = useNavigate();
  const params = useParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isViewingOther = useMemo(() => !!params.userId, [params.userId]);
  const viewingUserId = useMemo(() => params.userId ? parseInt(params.userId, 10) : null, [params.userId]);

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editingBio, setEditingBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [user, setUser] = useState(null);
  const [rankThresholds, setRankThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [myGroups, setMyGroups] = useState([]);
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const defaultRanks = [
    { rank_name: 'Beginner', points_required: 0, badge_emoji: '🌱', display_order: 1 },
    { rank_name: 'Active', points_required: 100, badge_emoji: '⚡', display_order: 2 },
    { rank_name: 'Contributor', points_required: 300, badge_emoji: '🎯', display_order: 3 },
    { rank_name: 'Mentor', points_required: 700, badge_emoji: '🧠', display_order: 4 },
    { rank_name: 'Elite Member', points_required: 1500, badge_emoji: '👑', display_order: 5 },
    { rank_name: 'Legend', points_required: 3000, badge_emoji: '🔥', display_order: 6 },
  ];

  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    if (!token) { setError('Please log in to view your profile.'); setLoading(false); return; }
    const loadUserData = async () => {
      try {
        const profilePromise = isViewingOther ? getUserProfile(viewingUserId) : getProfile();
        const [profileData, statsData, activityData, ranksData] = await Promise.all([
          profilePromise,
          isViewingOther ? getUserStatsPublic(viewingUserId) : getUserStats(),
          isViewingOther ? getUserActivityStatsPublic(viewingUserId) : getUserActivityStats(),
          getRankThresholds(),
        ]).catch(() => [
          { username: localStorage.getItem('sb_username'), email: localStorage.getItem('sb_email'), created_at: new Date().toISOString() },
          { total_points: 0, current_rank: 'Beginner', login_streak: 0 },
          { study_hours: 0, sessions_attended: 0, groups_joined: 0, resources_shared: 0 },
          defaultRanks,
        ]);

        if (profileData?.id) localStorage.setItem('sb_user_id', String(profileData.id));
        let photoUrl = profileData?.profile_pic || null;
        if (photoUrl && !photoUrl.startsWith('http')) photoUrl = `${API_BASE}${photoUrl}`;

        setUser({
          name: profileData?.username || profileData?.email || localStorage.getItem('sb_username') || 'User',
          email: profileData?.email || localStorage.getItem('sb_email') || '',
          avatar: ((profileData?.username || 'U').charAt(0)).toUpperCase(),
          photoUrl,
          phone: profileData?.phone || '',
          location: profileData?.location || '',
          university: profileData?.university || '',
          bio: profileData?.bio || '',
          showEmail: profileData?.show_email || false,
          showPhone: profileData?.show_phone || false,
          showLocation: profileData?.show_location || false,
          showUniversity: profileData?.show_university || false,
          showBio: profileData?.show_bio || false,
          stats: {
            totalStudyHours: activityData?.study_hours || 0,
            sessionsAttended: activityData?.sessions_attended || 0,
            groupsJoined: activityData?.groups_joined || 0,
            resourcesShared: activityData?.resources_shared || 0,
            currentStreak: statsData?.login_streak || 0,
            longestStreak: 30,
            totalPoints: statsData?.total_points || 0,
            currentRank: statsData?.current_rank || 'Beginner',
          },
        });
        setRankThresholds(ranksData || defaultRanks);
      } catch (err) {
        const fallbackName = localStorage.getItem('sb_username') || 'User';
        setUser({ name: fallbackName, email: localStorage.getItem('sb_email') || '', avatar: (fallbackName).charAt(0).toUpperCase(), photoUrl: null, phone: '', location: '', university: '', bio: '', showEmail: false, showPhone: false, showLocation: false, showUniversity: false, showBio: false, stats: { totalStudyHours: 0, sessionsAttended: 0, groupsJoined: 0, resourcesShared: 0, currentStreak: 0, longestStreak: 0, totalPoints: 0, currentRank: 'Beginner' } });
        setRankThresholds(defaultRanks);
      } finally { setLoading(false); }
    };
    loadUserData();
  }, [isViewingOther, viewingUserId]);

  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    if (!token) return;
    const loadGroups = async () => {
      try {
        setGroupsLoading(true);
        const userGroups = await getMyGroups();
        const mapped = userGroups.map((g, i) => ({ id: g.id, name: g.name, description: g.description || '', members: g.members_count || 0, role: g.role || 'Member', ...SUBJECT_COLORS[i % SUBJECT_COLORS.length] }));
        setMyGroups(mapped);
        const allGroups = await listGroups();
        const joinedIds = new Set(mapped.map(g => g.id));
        setDiscoverGroups(allGroups.filter(g => !joinedIds.has(g.id)).map((g, i) => ({ id: g.id, name: g.name, description: g.description || '', members: g.members_count || 0, ...SUBJECT_COLORS[(i + 2) % SUBJECT_COLORS.length] })));
      } catch (e) {} finally { setGroupsLoading(false); }
    };
    loadGroups();
  }, []);

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      if (!localStorage.getItem('sb_token')) { alert('Please log in first'); return; }
      await updateProfile({ bio: editingBio });
      setUser(prev => ({ ...prev, bio: editingBio }));
      setIsEditingBio(false);
    } catch { alert('Failed to save bio. Please try again.'); }
    finally { setSavingBio(false); }
  };

  const handleSearch = async e => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) { setShowSearchResults(false); setSearchResults([]); return; }
    setSearchLoading(true);
    try { const results = await searchGroups(query); setSearchResults(results || []); setShowSearchResults(true); }
    catch { setSearchResults([]); } finally { setSearchLoading(false); }
  };

  const handleJoinGroup = async groupId => {
    try {
      const response = await joinGroup(groupId);
      if (response.status === 'pending') { alert('Join request sent — pending admin approval!'); }
      else { alert('Successfully joined the group!'); }
      const userGroups = await getMyGroups();
      const mapped = userGroups.map((g, i) => ({ id: g.id, name: g.name, description: g.description || '', members: g.members_count || 0, role: g.role || 'Member', ...SUBJECT_COLORS[i % SUBJECT_COLORS.length] }));
      setMyGroups(mapped);
      const allGroups = await listGroups();
      const joinedIds = new Set(mapped.map(g => g.id));
      setDiscoverGroups(allGroups.filter(g => !joinedIds.has(g.id)).map((g, i) => ({ id: g.id, name: g.name, description: g.description || '', members: g.members_count || 0, ...SUBJECT_COLORS[(i+2) % SUBJECT_COLORS.length] })));
      setShowSearchResults(false); setSearchQuery('');
    } catch (error) { alert('Failed to join group: ' + error.message); }
  };

  const handlePhotoUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('photo', file);
      const response = await fetch(`${API_BASE}/api/user/profile-photo`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('sb_token')}` }, body: formData });
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      const result = await response.json();
      const photoUrl = result.photo_url || result.photoUrl;
      const absoluteUrl = photoUrl && !photoUrl.startsWith('http') ? `${API_BASE}${photoUrl}` : photoUrl;
      setUser(prev => ({ ...prev, photoUrl: absoluteUrl }));
    } catch (err) { alert(`Failed to upload photo: ${err.message}`); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handlePayment = async (planId, amount, planName) => {
    const token = localStorage.getItem('sb_token');
    const userId = localStorage.getItem('sb_user_id');
    const userName = localStorage.getItem('sb_username');
    const userEmail = localStorage.getItem('sb_email');

    if (!token || !userId) {
      alert('Please log in to upgrade');
      return;
    }

    try {
      // Create order on backend
      const response = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          amount: amount * 100, // Convert to paise
          plan_name: planName,
        }),
      });

      if (!response.ok) throw new Error('Failed to create order');
      const orderData = await response.json();

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY || '', // Add to .env
          amount: amount * 100,
          currency: 'INR',
          name: 'StudyBuddy',
          description: `${planName} Plan Subscription`,
          order_id: orderData.order_id,
          handler: async (response) => {
            try {
              const verifyResponse = await fetch(`${API_BASE}/api/payment/verify`, {
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

              if (!verifyResponse.ok) throw new Error('Payment verification failed');
              alert(`✅ Welcome to ${planName}! Payment successful.`);
              // Refresh user data
              const refreshedUser = await getProfile();
              setUser(prev => ({ ...prev, subscription: { plan_id: planId, plan_name: planName } }));
            } catch (err) {
              alert(`Payment failed: ${err.message}`);
            }
          },
          prefill: {
            name: userName,
            email: userEmail,
          },
          theme: { color: '#2563eb' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };
      document.body.appendChild(script);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const recentActivity = [
    { id: 1, type: 'session', text: 'Attended Data Structures study session', time: '2 hours ago', icon: Users, color: 'bg-blue-100 text-blue-600' },
    { id: 2, type: 'resource', text: 'Uploaded "Binary Tree Notes.pdf"', time: '5 hours ago', icon: BookOpen, color: 'bg-emerald-100 text-emerald-600' },
    { id: 3, type: 'achievement', text: 'Earned "Study Streak" badge', time: '1 day ago', icon: Award, color: 'bg-amber-100 text-amber-600' },
    { id: 4, type: 'group', text: 'Joined "Machine Learning Study Group"', time: '2 days ago', icon: Users, color: 'bg-purple-100 text-purple-600' },
    { id: 5, type: 'session', text: 'Hosted React Workshop session', time: '3 days ago', icon: Users, color: 'bg-cyan-100 text-cyan-600' },
  ];

  const premiumPlans = [
    { 
      id: 1, 
      name: 'Pro', 
      price: 5, 
      period: 'month', 
      icon: '⚡',
      features: ['Up to 10 study groups', '100GB storage', 'Analytics dashboard'],
      highlighted: false 
    },
    { 
      id: 2, 
      name: 'Premium', 
      price: 10, 
      period: 'month', 
      icon: '👑',
      features: ['Everything in Pro', 'Unlimited study groups', 'Unlimited storage'],
      highlighted: true 
    },
  ];

  const cardBase = `rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100'} shadow-paper`;

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : ''}`} style={!isDark ? { background: 'var(--page-bg)' } : {}}>
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading profile…</p>
      </div>
    </div>
  );

  if (!user) return null;

  const tabs = ['overview', 'premium'];

  return (
    <div className="min-h-screen transition-colors" style={!isDark ? { background: 'var(--page-bg, #fef8ec)' } : { background: '#0f172a' }}>

      {/* ── Profile Header ──────────────────────────────────────── */}
      <div className={`border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-100'}`}>
        {/* Cover banner */}
        <div className="h-36 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e1b5e 0%, #1d4ed8 60%, #0284c7 100%)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent,transparent 27px,rgba(255,255,255,0.06) 27px,rgba(255,255,255,0.06) 28px)', backgroundSize: '100% 28px' }}/>
          <GraduationCap className="absolute right-8 bottom-4 w-20 h-20 text-white/10" />
          <button onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative pb-5">
            {/* Avatar */}
            <div className="absolute -top-14 left-0">
              <div className="w-28 h-28 rounded-2xl border-4 border-white bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center overflow-hidden shadow-paper-md">
                {user.photoUrl ? <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-white text-3xl font-extrabold">{user.avatar}</span>}
              </div>
              {!isViewingOther && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border-2 border-amber-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-amber-50 transition-colors disabled:opacity-50">
                    <Camera className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </>
              )}
            </div>

            {/* Name + actions */}
            <div className="pl-36 pt-3 flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>{user.name}</h1>
                {(!isViewingOther || user.showEmail) && user.email && (
                  <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</p>
                )}
                {user.university && <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{user.university}</p>}
              </div>
              {!isViewingOther && (
                <div className="flex gap-2">
                  <button onClick={() => navigate('/settings')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-amber-200 text-slate-600 hover:bg-amber-50'}`}>
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 mt-5 border-b ${isDark ? 'border-slate-700' : 'border-amber-100'}`}>
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-all -mb-px ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
                  }`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { icon: Clock, label: 'Study Hours', value: `${user.stats.totalStudyHours}h`, bg: 'bg-blue-50', color: 'text-blue-700' },
                  { icon: Users, label: 'Sessions', value: user.stats.sessionsAttended, bg: 'bg-purple-50', color: 'text-purple-700' },
                  { icon: BookOpen, label: 'Resources', value: user.stats.resourcesShared, bg: 'bg-emerald-50', color: 'text-emerald-700' },
                ].map(({ icon: Icon, label, value, bg, color }) => (
                  <div key={label} className={`${cardBase} p-5`}>
                    <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{value}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Bio */}
              <div className={`${cardBase} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`font-extrabold text-base ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>About</h2>
                  {!isEditingBio && !isViewingOther && (
                    <button onClick={() => { setIsEditingBio(true); setEditingBio(user.bio || ''); }}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>
                {isEditingBio ? (
                  <div className="space-y-3">
                    <textarea value={editingBio} onChange={e => setEditingBio(e.target.value)}
                      placeholder="Tell us about yourself…" rows={4}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-amber-200 text-slate-800'} focus:border-blue-500 focus:ring-2 focus:ring-blue-100`} />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setIsEditingBio(false)}
                        className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        Cancel
                      </button>
                      <button onClick={handleSaveBio} disabled={savingBio}
                        className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5" /> {savingBio ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {!isViewingOther || user.showBio ? (user.bio || 'No bio yet.') : 'Bio is private.'}
                  </p>
                )}
              </div>

              {/* Contact info */}
              {[
                { show: (!isViewingOther || user.showEmail) && user.email, icon: Mail, label: 'Email', value: user.email, color: 'text-blue-600 bg-blue-50' },
                { show: (!isViewingOther || user.showPhone) && user.phone, icon: Phone, label: 'Phone', value: user.phone, color: 'text-emerald-600 bg-emerald-50' },
                { show: (!isViewingOther || user.showLocation) && user.location, icon: MapPin, label: 'Location', value: user.location, color: 'text-rose-600 bg-rose-50' },
                { show: (!isViewingOther || user.showUniversity) && user.university, icon: GraduationCap, label: 'University', value: user.university, color: 'text-purple-600 bg-purple-50' },
              ].some(r => r.show) && (
                <div className={`${cardBase} p-6`}>
                  <h2 className={`font-extrabold text-base mb-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Contact Information</h2>
                  <div className="space-y-3">
                    {[
                      { show: (!isViewingOther || user.showEmail) && user.email, icon: Mail, label: 'Email', value: user.email, color: 'text-blue-600 bg-blue-50' },
                      { show: (!isViewingOther || user.showPhone) && user.phone, icon: Phone, label: 'Phone', value: user.phone, color: 'text-emerald-600 bg-emerald-50' },
                      { show: (!isViewingOther || user.showLocation) && user.location, icon: MapPin, label: 'Location', value: user.location, color: 'text-rose-600 bg-rose-50' },
                      { show: (!isViewingOther || user.showUniversity) && user.university, icon: GraduationCap, label: 'University', value: user.university, color: 'text-purple-600 bg-purple-50' },
                    ].filter(r => r.show).map(({ icon: Icon, label, value, color }, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color.split(' ')[1]}`}>
                          <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
                          <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{value}</p>
                        </div>
                      </div>
                    ))}
                    {isViewingOther && !user.showEmail && !user.showPhone && !user.showLocation && !user.showUniversity && (
                      <p className={`text-sm italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Contact information is private.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Groups section — only own profile */}
              {!isViewingOther && (
                <div className={`${cardBase} p-6`}>
                  <h2 className={`font-extrabold text-base mb-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>My Study Groups</h2>

                  {/* Search */}
                  <div className="relative mb-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search groups…" value={searchQuery} onChange={handleSearch}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-white border-amber-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'} focus:ring-2 focus:ring-blue-100`} />
                    {showSearchResults && (
                      <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-paper-lg border z-40 max-h-72 overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100'}`}>
                        {searchLoading ? (
                          <div className={`p-4 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Searching…</div>
                        ) : searchResults.length > 0 ? searchResults.map(g => (
                          <div key={g.id} className={`flex items-start justify-between px-4 py-3 border-b last:border-b-0 ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-amber-50 hover:bg-amber-50'}`}>
                            <div className="flex-1 min-w-0 mr-3">
                              <p className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{g.name}</p>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>@{g.username} · {g.members_count} members</p>
                            </div>
                            <button onClick={() => handleJoinGroup(g.id)}
                              className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0">
                              Join
                            </button>
                          </div>
                        )) : (
                          <div className={`p-4 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No groups found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* My groups list */}
                  {groupsLoading ? (
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading groups…</p>
                  ) : myGroups.length > 0 ? (
                    <div className="space-y-2">
                      {myGroups.map(g => (
                        <div key={g.id} onClick={() => navigate(`/group/${g.id}`)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-amber-100 hover:bg-amber-50'}`}
                          style={{ borderLeftWidth: '3px', borderLeftColor: g.strip }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: g.strip + '18', color: g.strip }}>
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{g.name}</p>
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{g.members} members</p>
                          </div>
                          <span className={`subject-tab ${g.badge}`}>{g.role}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-8 rounded-2xl border ${isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-amber-50 border-amber-100'}`}>
                      <Users className={`w-10 h-10 mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-amber-300'}`} />
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No groups yet</p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Search above to find and join groups</p>
                    </div>
                  )}

                  {/* Discover */}
                  {discoverGroups.length > 0 && (
                    <div className={`mt-5 pt-5 border-t ${isDark ? 'border-slate-700' : 'border-amber-100'}`}>
                      <h3 className={`font-bold text-sm mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Discover Groups</h3>
                      <div className="space-y-2">
                        {discoverGroups.slice(0, 4).map(g => (
                          <div key={g.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'border-slate-700' : 'border-amber-100'}`}
                            style={{ borderLeftWidth: '3px', borderLeftColor: g.strip }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: g.strip + '18', color: g.strip }}>
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{g.name}</p>
                              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{g.members} members</p>
                            </div>
                            <button onClick={() => handleJoinGroup(g.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Join →</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Streak */}
              <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)' }}>
                <Flame className="absolute -right-2 -top-2 w-16 h-16 text-white/10" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">Study Streak 🔥</h3>
                    <Award className="w-5 h-5 text-orange-200" />
                  </div>
                  <p className="text-4xl font-extrabold">{user.stats.currentStreak}</p>
                  <p className="text-orange-100 text-xs mt-1">days in a row</p>
                  <div className="mt-3 pt-3 border-t border-orange-400/40">
                    <p className="text-orange-100 text-xs">Best: <span className="font-bold">{user.stats.longestStreak} days</span></p>
                  </div>
                </div>
              </div>

              {/* Points + rank progress */}
              <div className={`${cardBase} p-6`}>
                <h3 className={`font-extrabold text-base mb-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Points & Rank</h3>
                <p className="text-3xl font-extrabold text-blue-600 mb-1">{user.stats.totalPoints.toLocaleString()}</p>
                <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Current rank: <strong>{user.stats.currentRank}</strong></p>
                {(() => {
                  const curr = rankThresholds.find(r => r.rank_name === user.stats.currentRank);
                  const next = rankThresholds.find(r => r.points_required > user.stats.totalPoints);
                  const progress = next ? ((user.stats.totalPoints - (curr?.points_required || 0)) / (next.points_required - (curr?.points_required || 0))) * 100 : 100;
                  return <>
                    <div className={`w-full rounded-full h-2 mb-1.5 ${isDark ? 'bg-slate-700' : 'bg-amber-100'}`}>
                      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {next ? `${next.points_required - user.stats.totalPoints} pts to ${next.rank_name}` : '🏆 Max rank!'}
                    </p>
                  </>;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Activity tab */}
        {activeTab === 'premium' && (
          <div className="max-w-4xl">
            <h2 className={`font-extrabold text-2xl mb-8 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Upgrade Your Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {premiumPlans.map(plan => (
                <div key={plan.id} className={`rounded-2xl border-2 p-8 transition-all ${
                  plan.highlighted 
                    ? isDark 
                      ? 'bg-blue-900/40 border-blue-600 ring-2 ring-blue-500/30' 
                      : 'bg-blue-50 border-blue-400 ring-2 ring-blue-300/30'
                    : isDark 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-white border-amber-100'
                }`}>
                  {plan.highlighted && (
                    <div className="inline-block px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold mb-4">
                      MOST POPULAR
                    </div>
                  )}
                  
                  <div className="text-4xl mb-3">{plan.icon}</div>
                  <h3 className={`font-extrabold text-2xl mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-blue-600">₹{plan.price}</span>
                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                          <span className="w-2 h-2 bg-blue-600 rounded-full" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button onClick={() => handlePayment(plan.id, plan.price, plan.name)}
                    className={`w-full py-3 rounded-xl font-bold text-center transition-all ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : isDark
                          ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}>
                    Get {plan.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
