import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getGroup, getMyGroups, listGroups, getUserActivityStats, createGroup, searchGroups, joinGroup, getUserNotifications, getUnreadNotificationCount, markNotificationAsRead, getSubscriptionStatus } from './utils/api';
import { Calendar, Users, BookOpen, Bell, Search, Plus, Clock, FileText, Award, ChevronDown, LogOut, Settings, User, TrendingUp, X, Flame, GraduationCap } from 'lucide-react';
import StudyTimer from './components/StudyTimer';
import { useTheme } from './contexts/ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const SUBJECT_COLORS = [
  { strip: '#1d4ed8', badge: 'bg-blue-100 text-blue-800' },
  { strip: '#065f46', badge: 'bg-emerald-100 text-emerald-800' },
  { strip: '#6b21a8', badge: 'bg-purple-100 text-purple-800' },
  { strip: '#c2410c', badge: 'bg-orange-100 text-orange-800' },
  { strip: '#0e7490', badge: 'bg-cyan-100 text-cyan-800' },
  { strip: '#9f1239', badge: 'bg-rose-100 text-rose-800' },
];

export default function MainDashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [user, setUser] = useState({ name: 'Guest', email: '', avatar: 'G', photoUrl: null, role: '', joinDate: '', notificationCount: 0 });
  const [createGroupForm, setCreateGroupForm] = useState({ name: '', username: '', description: '', isPublic: true, allowContentViewWithoutJoin: false, requireAdminApproval: false });
  const [createGroupError, setCreateGroupError] = useState('');
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [myGroups, setMyGroups] = useState([]);
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [maxGroups, setMaxGroups] = useState(3);

  const [stats, setStats] = useState([
    { label: 'Study Hours', value: '0h', icon: Clock, color: '#1d4ed8', bg: 'bg-blue-50', text: 'text-blue-700' },
    { label: 'Groups Joined', value: '0', icon: Users, color: '#6b21a8', bg: 'bg-purple-50', text: 'text-purple-700' },
    { label: 'Resources', value: '0', icon: FileText, color: '#065f46', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { label: 'Study Streak', value: '0 days', icon: Flame, color: '#c2410c', bg: 'bg-orange-50', text: 'text-orange-700' },
  ]);

  // Load profile
  useEffect(() => {
    let mounted = true;
    const stored = localStorage.getItem('sb_username');
    if (stored) setUser(u => ({ ...u, name: stored, avatar: stored.charAt(0).toUpperCase() }));
    (async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        const p = await getProfile();
        if (!mounted) return;
        let photoUrl = p.profile_pic || null;
        if (photoUrl && !photoUrl.startsWith('http')) photoUrl = `${API_BASE}${photoUrl}`;
        setUser({ name: p.username || p.name || user.name, email: p.email || '', avatar: (p.username && p.username.charAt(0).toUpperCase()) || 'G', photoUrl, role: p.role || '', joinDate: p.created_at ? new Date(p.created_at).toLocaleDateString() : '', notificationCount: p.notification_count || 0 });
        if (p.username) localStorage.setItem('sb_username', p.username);
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, []);

  // Load notifications
  useEffect(() => {
    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        const [notificationsData, unreadCount] = await Promise.all([getUserNotifications(10), getUnreadNotificationCount()]);
        if (!mounted) return;
        const formatted = notificationsData.map(n => ({ id: n.id, message: n.message, title: n.title, time: getTimeAgo(n.created_at), unread: !n.is_read, type: n.type }));
        setNotifications(formatted);
        setUnreadNotificationCount(unreadCount.count || 0);
      } catch (e) {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Load subscription status
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        const status = await getSubscriptionStatus();
        if (mounted) {
          setSubscriptionStatus(status);
          // Set max groups based on subscription tier
          const tier = status.subscribed ? status.plan_name.toLowerCase() : 'free';
          const limits = { free: 3, pro: 10, basic: 10, premium: 999999, ultra: 999999 };
          setMaxGroups(limits[tier] || 3);
        }
      } catch (e) {
        if (mounted) {
          setSubscriptionStatus(null);
          setMaxGroups(3); // default to free tier limit
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getTimeAgo = iso => {
    const d = new Date(iso), now = new Date(), ms = now - d;
    const m = Math.floor(ms/60000), h = Math.floor(ms/3600000), dy = Math.floor(ms/86400000);
    if (m < 1) return 'now'; if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`; if (dy < 7) return `${dy}d ago`;
    return d.toLocaleDateString();
  };

  // Load groups
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        const userGroups = await getMyGroups();
        const mapped = userGroups.map((g, i) => ({ id: g.id, name: g.name, description: g.description || '', members: g.members_count || 0, sessions: 0, resources: 0, nextSession: 'TBD', unreadMessages: 0, role: g.role || 'Member', ...SUBJECT_COLORS[i % SUBJECT_COLORS.length] }));
        if (mounted) setMyGroups(mapped);
        const all = await listGroups();
        const joinedIds = new Set(mapped.map(g => g.id));
        const discover = all.filter(g => !joinedIds.has(g.id)).map((g, i) => ({ id: g.id, name: g.name, description: g.description || '', members: g.members_count || 0, ...SUBJECT_COLORS[(i + 2) % SUBJECT_COLORS.length] }));
        if (mounted) setDiscoverGroups(discover.slice(0, 6));
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, []);

  // Load activity stats
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        const activityData = await getUserActivityStats();
        if (!mounted) return;
        setStats([
          { label: 'Study Hours', value: `${activityData.study_hours || 0}h`, icon: Clock, color: '#1d4ed8', bg: 'bg-blue-50', text: 'text-blue-700' },
          { label: 'Groups Joined', value: `${activityData.groups_joined || 0}`, icon: Users, color: '#6b21a8', bg: 'bg-purple-50', text: 'text-purple-700' },
          { label: 'Resources', value: `${activityData.resources_shared || 0}`, icon: FileText, color: '#065f46', bg: 'bg-emerald-50', text: 'text-emerald-700' },
          { label: 'Study Streak', value: `${activityData.login_streak || 0} days`, icon: Flame, color: '#c2410c', bg: 'bg-orange-50', text: 'text-orange-700' },
        ]);
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, []);

  const handleLogout = () => { localStorage.removeItem('sb_token'); navigate('/'); };

  const handleSearch = async e => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) { setShowSearchResults(false); setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const results = await searchGroups(query);
      setSearchResults(results || []);
      setShowSearchResults(true);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  };

  const handleCreateGroup = async e => {
    e.preventDefault();
    setCreateGroupError('');
    
    // Check if user has reached group limit
    if (myGroups.length >= maxGroups) {
      const tier = subscriptionStatus?.subscribed ? subscriptionStatus.plan_name : 'Free';
      setCreateGroupError(`Group limit reached for ${tier} tier (${myGroups.length}/${maxGroups}). Upgrade your subscription to create more groups.`);
      return;
    }
    
    if (!createGroupForm.name.trim()) { setCreateGroupError('Group name is required'); return; }
    if (!createGroupForm.username.trim()) { setCreateGroupError('Group username is required'); return; }
    setCreateGroupLoading(true);
    try {
      const result = await createGroup({ name: createGroupForm.name, username: createGroupForm.username, description: createGroupForm.description, is_public: createGroupForm.isPublic, allow_content_view_without_join: createGroupForm.allowContentViewWithoutJoin, require_admin_approval: createGroupForm.requireAdminApproval });
      setCreateGroupForm({ name: '', username: '', description: '', isPublic: true, allowContentViewWithoutJoin: false, requireAdminApproval: false });
      setShowCreateGroupModal(false);
      const userGroups = await getMyGroups();
      setMyGroups(userGroups.map((g, i) => ({ id: g.id, name: g.name, description: g.description || '', members: g.members_count || 0, sessions: 0, resources: 0, nextSession: 'TBD', unreadMessages: 0, role: g.role || 'Member', ...SUBJECT_COLORS[i % SUBJECT_COLORS.length] })));
      navigate(`/group/${result.id}`);
    } catch (error) {
      // Check if error is due to group limit
      if (error.message && error.message.includes('group limit reached')) {
        const tier = subscriptionStatus?.subscribed ? subscriptionStatus.plan_name : 'Free';
        setCreateGroupError(`Group limit reached for ${tier} tier (${myGroups.length}/${maxGroups}). Upgrade your subscription to create more groups.`);
      } else if (error.message && error.message.includes('username already taken')) {
        setCreateGroupError('This group username is already taken. Please choose another one.');
      } else {
        setCreateGroupError(error.message || 'Failed to create group');
      }
    } finally { setCreateGroupLoading(false); }
  };

  const handleViewGroup = id => navigate(`/group/${id}`);

  const handleJoinGroup = async id => {
    try {
      // Check if user has reached group join limit
      if (myGroups.length >= maxGroups) {
        const tier = subscriptionStatus?.subscribed ? subscriptionStatus.plan_name : 'Free';
        alert(`Group limit reached for ${tier} tier (${myGroups.length}/${maxGroups}). Upgrade your subscription to join more groups.`);
        return;
      }
      
      const response = await joinGroup(id);
      if (response.status === 'pending') { alert('Your join request has been sent and is pending approval!'); return; }
      const userGroups = await getMyGroups();
      const mapped = userGroups.map((g, i) => ({ id: g.id, name: g.name, description: g.description || '', members: g.members_count || 0, sessions: 0, resources: 0, nextSession: 'TBD', unreadMessages: 0, role: g.role || 'Member', ...SUBJECT_COLORS[i % SUBJECT_COLORS.length] }));
      setMyGroups(mapped);
      const allGroups = await listGroups();
      const joinedIds = new Set(mapped.map(g => g.id));
      setDiscoverGroups(allGroups.filter(g => !joinedIds.has(g.id)).map((g, i) => ({ id: g.id, name: g.name, description: g.description || '', members: g.members_count || 0, ...SUBJECT_COLORS[(i+2) % SUBJECT_COLORS.length] })).slice(0, 6));
      alert('Successfully joined the group!');
    } catch (error) {
      // Check if error is due to group limit
      if (error.message && error.message.includes('group limit reached')) {
        const tier = subscriptionStatus?.subscribed ? subscriptionStatus.plan_name : 'Free';
        alert(`Group limit reached for ${tier} tier (${myGroups.length}/${maxGroups}). Upgrade your subscription to join more groups.`);
      } else {
        alert('Failed to join group: ' + error.message);
      }
    }
  };

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100';
  const inputCls = `w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-white border-amber-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'} focus:ring-2 focus:ring-blue-100`;

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-900' : ''}`}
      style={!isDark ? { background: 'var(--page-bg, #fef8ec)' } : {}}>

      {/* ── Top Nav ─────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-50 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white/90 backdrop-blur border-amber-100'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-700 to-indigo-700 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className={`text-lg font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-blue-900'}`}>StudyBuddy</span>
            </div>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-6">
              {[
                { label: 'Groups', action: null },
                { label: 'Calendar', action: () => navigate('/calendar') },
                { label: 'Profile', action: () => navigate('/profile') },
              ].map(({ label, action }) => (
                <button key={label} onClick={action}
                  className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:text-blue-400' : 'text-slate-600 hover:text-blue-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                  className={`p-2 rounded-xl transition-colors relative ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-amber-50 text-slate-500'}`}>
                  <Bell className="w-5 h-5" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </button>
                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-paper-lg border py-2 z-50 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100'}`}>
                    <div className={`px-4 py-2.5 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-amber-50'}`}>
                      <h3 className={`font-bold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Notifications</h3>
                      {unreadNotificationCount > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{unreadNotificationCount} new</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className={`px-4 py-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No notifications yet</div>
                      ) : notifications.map(n => (
                        <div key={n.id} onClick={() => { if (n.unread) { markNotificationAsRead(n.id).catch(() => {}); setUnreadNotificationCount(p => Math.max(0, p-1)); setNotifications(prev => prev.map(x => x.id===n.id ? {...x, unread:false} : x)); } }}
                          className={`px-4 py-3 cursor-pointer border-l-4 transition-colors ${n.unread ? `${isDark?'bg-blue-900/20 border-blue-500':'bg-blue-50 border-blue-500'}` : `border-transparent ${isDark?'hover:bg-slate-700':'hover:bg-slate-50'}`}`}>
                          <p className={`text-sm font-semibold ${isDark?'text-slate-100':'text-slate-800'}`}>{n.title}</p>
                          <p className={`text-xs mt-0.5 ${isDark?'text-slate-400':'text-slate-500'}`}>{n.message}</p>
                          <p className={`text-xs mt-1 ${isDark?'text-slate-600':'text-slate-400'}`}>{n.time}</p>
                        </div>
                      ))}
                    </div>
                    <div className={`px-4 py-2 border-t ${isDark?'border-slate-700':'border-amber-50'}`}>
                      <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">View all notifications</button>
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ${isDark?'hover:bg-slate-800':'hover:bg-amber-50'}`}>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center overflow-hidden">
                    {user.photoUrl ? <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-white text-sm font-bold">{user.avatar}</span>}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 ${isDark?'text-slate-400':'text-slate-500'}`} />
                </button>
                {showUserMenu && (
                  <div className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-paper-lg border py-2 z-50 ${isDark?'bg-slate-800 border-slate-700':'bg-white border-amber-100'}`}>
                    <div className={`px-4 py-3 border-b ${isDark?'border-slate-700':'border-amber-50'}`}>
                      <p className={`font-bold text-sm ${isDark?'text-slate-100':'text-slate-800'}`}>{user.name}</p>
                      <p className={`text-xs mt-0.5 ${isDark?'text-slate-400':'text-slate-500'}`}>{user.email}</p>
                    </div>
                    {[
                      { label: 'My Profile', icon: User, action: () => navigate('/profile') },
                      { label: 'Settings', icon: Settings, action: () => navigate('/settings') },
                    ].map(({ label, icon: Icon, action }) => (
                      <button key={label} onClick={action}
                        className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-sm transition-colors ${isDark?'hover:bg-slate-700 text-slate-200':'hover:bg-slate-50 text-slate-700'}`}>
                        <Icon className="w-4 h-4 text-slate-400" /> {label}
                      </button>
                    ))}
                    <div className={`border-t mt-1 pt-1 ${isDark?'border-slate-700':'border-amber-50'}`}>
                      <button onClick={handleLogout}
                        className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-sm text-red-600 transition-colors ${isDark?'hover:bg-slate-700':'hover:bg-red-50'}`}>
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome banner */}
        <div className="rounded-2xl p-7 mb-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1e1b5e 0%, #1d4ed8 60%, #0284c7 100%)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.05) 27px, rgba(255,255,255,0.05) 28px)',
            backgroundSize: '100% 28px',
          }}/>
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
          <GraduationCap className="absolute right-8 top-1/2 -translate-y-1/2 w-20 h-20 text-white/10" />
          <div className="relative z-10">
            <p className="text-blue-200 text-sm font-medium mb-1">Good to see you again</p>
            <h1 className="text-3xl font-extrabold text-white">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: main area ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Search + Create */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search groups..." value={searchQuery} onChange={handleSearch} className={inputCls} />
                {showSearchResults && (
                  <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-paper-lg border z-40 max-h-80 overflow-y-auto ${isDark?'bg-slate-800 border-slate-700':'bg-white border-amber-100'}`}>
                    {searchLoading ? (
                      <div className={`p-4 text-center text-sm ${isDark?'text-slate-400':'text-slate-500'}`}>Searching…</div>
                    ) : searchResults.length > 0 ? searchResults.map(g => (
                      <div key={g.id} onClick={() => { navigate(`/group/${g.id}`); setShowSearchResults(false); }}
                        className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${isDark?'hover:bg-slate-700 border-slate-700':'hover:bg-slate-50 border-amber-50'}`}>
                        <p className={`font-semibold text-sm ${isDark?'text-slate-100':'text-slate-800'}`}>{g.name}</p>
                        <p className={`text-xs mt-0.5 ${isDark?'text-slate-400':'text-slate-500'}`}>@{g.username} · {g.members_count} members</p>
                      </div>
                    )) : (
                      <div className={`p-4 text-center text-sm ${isDark?'text-slate-400':'text-slate-500'}`}>No groups found</div>
                    )}
                  </div>
                )}
              </div>
              <button 
                onClick={() => {
                  if (myGroups.length >= maxGroups) {
                    const tier = subscriptionStatus?.subscribed ? subscriptionStatus.plan_name : 'Free';
                    alert(`Group limit reached for ${tier} tier (${myGroups.length}/${maxGroups}). Upgrade your subscription to create more groups.`);
                  } else {
                    setShowCreateGroupModal(true);
                  }
                }}
                disabled={myGroups.length >= maxGroups}
                className={`${myGroups.length >= maxGroups ? 'bg-gray-500 hover:bg-gray-600 cursor-not-allowed opacity-60' : 'bg-blue-700 hover:bg-blue-800'} text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2`}>
                <Plus className="w-4 h-4" /> {myGroups.length >= maxGroups ? `Group Limit Reached (${myGroups.length}/${maxGroups})` : 'Create Group'}
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map((s, i) => (
                <div key={i} className={`rounded-2xl p-4 border ${isDark?'bg-slate-800 border-slate-700':'bg-white border-amber-100'} shadow-paper`}>
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                    <s.icon className={`w-5 h-5 ${s.text}`} />
                  </div>
                  <p className={`text-xl font-extrabold ${isDark?'text-slate-100':'text-slate-800'}`}>{s.value}</p>
                  <p className={`text-xs mt-0.5 ${isDark?'text-slate-400':'text-slate-500'}`}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* My Groups */}
            {myGroups.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-extrabold ${isDark?'text-slate-100':'text-slate-800'}`}>My Study Groups</h2>
                  <span className={`text-xs font-semibold ${isDark?'text-slate-400':'text-slate-400'}`}>{myGroups.length} group{myGroups.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-3">
                  {myGroups.map(g => (
                    <div key={g.id}
                      className={`notebook-card no-strip rounded-2xl p-5 cursor-pointer transition-all hover:shadow-paper-md ${isDark?'bg-slate-800 border-slate-700':''}`}
                      style={{ '--strip-color': g.strip, borderLeftWidth: '4px', borderLeftColor: g.strip, borderLeftStyle: 'solid' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: g.strip + '18', color: g.strip }}>
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className={`font-bold text-sm ${isDark?'text-slate-100':'text-slate-800'}`}>{g.name}</h3>
                              <span className={`subject-tab ${g.badge}`}>{g.role}</span>
                            </div>
                            <p className={`text-xs mb-2 ${isDark?'text-slate-400':'text-slate-500'} line-clamp-1`}>{g.description}</p>
                            <div className={`flex items-center gap-1 text-xs ${isDark?'text-slate-500':'text-slate-400'}`}>
                              <Users className="w-3.5 h-3.5" />
                              <span>{g.members} members</span>
                            </div>
                          </div>
                        </div>
                        {g.unreadMessages > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-3">{g.unreadMessages}</span>
                        )}
                      </div>
                      <div className={`flex justify-end mt-3 pt-3 border-t ${isDark?'border-slate-700':'border-amber-50'}`}>
                        <button onClick={() => handleViewGroup(g.id)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                          Open Group →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discover Groups */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-extrabold ${isDark?'text-slate-100':'text-slate-800'}`}>Discover Groups</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {discoverGroups.slice(0,4).map(g => (
                  <div key={g.id}
                    className={`notebook-card no-strip rounded-2xl p-5 cursor-pointer transition-all hover:shadow-paper-md ${isDark?'bg-slate-800 border-slate-700':''}`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: g.strip, borderLeftStyle: 'solid' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: g.strip + '18', color: g.strip }}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h3 className={`font-bold text-sm mb-1 ${isDark?'text-slate-100':'text-slate-800'}`}>{g.name}</h3>
                    <p className={`text-xs mb-3 line-clamp-2 ${isDark?'text-slate-400':'text-slate-500'}`}>{g.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-1 text-xs ${isDark?'text-slate-500':'text-slate-400'}`}>
                        <Users className="w-3.5 h-3.5" /> {g.members}
                      </span>
                      <button 
                        onClick={() => {
                          if (myGroups.length >= maxGroups) {
                            const tier = subscriptionStatus?.subscribed ? subscriptionStatus.plan_name : 'Free';
                            alert(`Group limit reached for ${tier} tier (${myGroups.length}/${maxGroups}). Upgrade your subscription to join more groups.`);
                          } else {
                            handleJoinGroup(g.id);
                          }
                        }}
                        disabled={myGroups.length >= maxGroups}
                        className={`text-xs font-semibold ${myGroups.length >= maxGroups ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'}`}>
                        {myGroups.length >= maxGroups ? '✗ Limit' : 'Join →'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Study Timer */}
            <StudyTimer onSessionEnd={async () => {
              try {
                const activityData = await getUserActivityStats();
                setStats([
                  { label: 'Study Hours', value: `${activityData.study_hours||0}h`, icon: Clock, color: '#1d4ed8', bg: 'bg-blue-50', text: 'text-blue-700' },
                  { label: 'Groups Joined', value: `${activityData.groups_joined||0}`, icon: Users, color: '#6b21a8', bg: 'bg-purple-50', text: 'text-purple-700' },
                  { label: 'Resources', value: `${activityData.resources_shared||0}`, icon: FileText, color: '#065f46', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                  { label: 'Study Streak', value: `${activityData.login_streak||0} days`, icon: Flame, color: '#c2410c', bg: 'bg-orange-50', text: 'text-orange-700' },
                ]);
              } catch (e) {}
            }} />

            {/* Streak card */}
            <div className="rounded-2xl p-6 relative overflow-hidden text-white"
              style={{ background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 60%, #f97316 100%)' }}>
              <Flame className="absolute -right-3 -top-3 w-20 h-20 text-white/10" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base">Study Streak 🔥</h3>
                  <Award className="w-6 h-6 text-orange-200" />
                </div>
                <p className="text-4xl font-extrabold mb-1">{stats.find(s=>s.label==='Study Streak')?.value || '0 days'}</p>
                <p className="text-orange-100 text-xs">Login daily to keep your streak alive!</p>
              </div>
            </div>

            {/* Quick nav */}
            <div className={`rounded-2xl p-5 border ${isDark?'bg-slate-800 border-slate-700':'bg-white border-amber-100'}`}>
              <h3 className={`font-bold text-sm mb-4 ${isDark?'text-slate-100':'text-slate-700'}`}>Quick Navigation</h3>
              <div className="space-y-1">
                {[
                  { label: 'Calendar', icon: Calendar, action: () => navigate('/calendar') },
                  { label: 'My Profile', icon: User, action: () => navigate('/profile') },
                  { label: 'Settings', icon: Settings, action: () => navigate('/settings') },
                ].map(({ label, icon: Icon, action }) => (
                  <button key={label} onClick={action}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark?'hover:bg-slate-700 text-slate-300':'hover:bg-amber-50 text-slate-600'}`}>
                    <Icon className="w-4 h-4 text-blue-600" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Create Group Modal ───────────────────────────────────── */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto pt-10">
          <div className={`rounded-2xl shadow-paper-lg max-w-md w-full ${isDark?'bg-slate-800':'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark?'border-slate-700':'border-amber-100'}`}>
              <div>
                <h2 className={`text-xl font-extrabold ${isDark?'text-slate-100':'text-slate-800'}`}>Create New Group</h2>
                <p className={`text-xs mt-0.5 ${isDark?'text-slate-400':'text-slate-500'}`}>Start a new study community</p>
              </div>
              <button onClick={() => setShowCreateGroupModal(false)} className={`p-1.5 rounded-lg transition-colors ${isDark?'hover:bg-slate-700 text-slate-400':'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              {createGroupError && (
                <div className="px-4 py-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700">{createGroupError}</div>
              )}
              {[
                { label: 'Group Name', key: 'name', placeholder: 'e.g., Data Structures & Algorithms', type: 'text' },
                { label: 'Group Username', key: 'username', placeholder: 'e.g., dsa-101', type: 'text', hint: "Unique identifier. Can't be changed later." },
              ].map(({ label, key, placeholder, type, hint }) => (
                <div key={key}>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark?'text-slate-300':'text-slate-700'}`}>{label}</label>
                  <input type={type} value={createGroupForm[key]}
                    onChange={e => setCreateGroupForm({ ...createGroupForm, [key]: key==='username' ? e.target.value.replace(/\s+/g,'-').toLowerCase() : e.target.value })}
                    placeholder={placeholder}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${isDark?'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500':'bg-white border-amber-200 text-slate-800'} focus:border-blue-500 focus:ring-2 focus:ring-blue-100`} />
                  {hint && <p className={`text-xs mt-1 ${isDark?'text-slate-500':'text-slate-400'}`}>{hint}</p>}
                </div>
              ))}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark?'text-slate-300':'text-slate-700'}`}>Description</label>
                <textarea value={createGroupForm.description} onChange={e => setCreateGroupForm({ ...createGroupForm, description: e.target.value })}
                  placeholder="What is this group about?" rows="3"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all resize-none ${isDark?'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500':'bg-white border-amber-200 text-slate-800'} focus:border-blue-500 focus:ring-2 focus:ring-blue-100`} />
              </div>
              {[
                { id: 'isPublic', key: 'isPublic', label: 'Make this group public' },
                { id: 'allowContentView', key: 'allowContentViewWithoutJoin', label: 'Allow non-members to view content' },
                { id: 'requireAdminApproval', key: 'requireAdminApproval', label: 'Admin approval required for new members' },
              ].map(({ id, key, label }) => (
                <label key={id} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" id={id} checked={createGroupForm[key]}
                    onChange={e => setCreateGroupForm({ ...createGroupForm, [key]: e.target.checked })}
                    className="w-4 h-4 rounded border-amber-200 text-blue-600" />
                  <span className={`text-sm ${isDark?'text-slate-300':'text-slate-600'}`}>{label}</span>
                </label>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateGroupModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark?'border-slate-600 text-slate-300 hover:bg-slate-700':'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  Cancel
                </button>
                <button type="submit" disabled={createGroupLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50">
                  {createGroupLoading ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
