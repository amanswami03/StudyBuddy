import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getGroup, getMyGroups, listGroups, getUserActivityStats } from './utils/api';
import { Calendar, Users, BookOpen, Bell, Search, Plus, Clock, FileText, Award, ChevronDown, LogOut, Settings, User, MessageSquare, TrendingUp } from 'lucide-react';
import StudyTimer from './components/StudyTimer';

// Get API base URL for photo access
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function MainDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [user, setUser] = useState({
    name: 'Guest',
    email: '',
    avatar: 'G',
    photoUrl: null,
    role: '',
    joinDate: '',
    notificationCount: 0
  });

  const notifications = [
    { id: 1, message: 'New session scheduled for Data Structures', time: '5m ago', unread: true },
    { id: 2, message: 'Sarah uploaded notes in Algorithm Design', time: '1h ago', unread: true },
    { id: 3, message: 'You earned "Study Streak" badge!', time: '2h ago', unread: true },
    { id: 4, message: 'New message in React Workshop', time: '3h ago', unread: false }
  ];

  const [myGroups, setMyGroups] = useState([
    {
      id: 1,
      name: 'Data Structures & Algorithms',
      description: 'Weekly coding practice and problem-solving sessions',
      members: 12,
      sessions: 8,
      resources: 24,
      nextSession: 'Today, 3:00 PM',
      unreadMessages: 5,
      role: 'Admin',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 2,
      name: 'React & Frontend Development',
      description: 'Building modern web applications together',
      members: 8,
      sessions: 5,
      resources: 15,
      nextSession: 'Tomorrow, 5:00 PM',
      unreadMessages: 2,
      role: 'Member',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 3,
      name: 'Machine Learning Study Group',
      description: 'Exploring ML algorithms and practical applications',
      members: 15,
      sessions: 12,
      resources: 32,
      nextSession: 'Wed, 4:00 PM',
      unreadMessages: 0,
      role: 'Member',
      color: 'from-green-500 to-emerald-500'
    }
  ]);

  const [discoverGroups, setDiscoverGroups] = useState([
    {
      id: 4,
      name: 'Database Design Fundamentals',
      description: 'SQL, NoSQL, and database optimization',
      members: 20,
      sessions: 15,
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 5,
      name: 'System Design Interview Prep',
      description: 'Preparing for technical interviews together',
      members: 18,
      sessions: 10,
      color: 'from-indigo-500 to-blue-500'
    }
  ]);

  // load profile on mount
  useEffect(() => {
    let mounted = true;
    // if username is already present in localStorage (from previous login), use it immediately
    const stored = localStorage.getItem('sb_username');
    if (stored) {
      setUser((u) => ({ ...u, name: stored, avatar: stored.charAt(0).toUpperCase() }));
    }
    // only call protected profile endpoint if an auth token exists
    (async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        const p = await getProfile();
        if (!mounted) return;
        
        // Convert profile_pic to absolute URL if it's relative
        let photoUrl = p.profile_pic || null;
        if (photoUrl && !photoUrl.startsWith('http')) {
          photoUrl = `${API_BASE}${photoUrl}`;
        }
        
        setUser({
          name: p.username || p.name || user.name,
          email: p.email || user.email,
          avatar: (p.username && p.username.charAt(0).toUpperCase()) || user.avatar,
          photoUrl: photoUrl,
          role: p.role || user.role,
          joinDate: p.created_at ? new Date(p.created_at).toLocaleDateString() : user.joinDate,
          notificationCount: p.notification_count || user.notificationCount || 0,
        });
        // save username locally for chat 'You' detection
        if (p.username) localStorage.setItem('sb_username', p.username);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Refresh member counts for groups on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        // fetch user's groups
        const userGroups = await getMyGroups();
        // userGroups returns array of {id, name, description, members_count}
        const mapped = userGroups.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description || '',
          members: g.members_count || 0,
          sessions: 0,
          resources: 0,
          nextSession: 'TBD',
          unreadMessages: 0,
          role: 'Member',
          color: 'from-blue-500 to-cyan-500'
        }));
        if (mounted) setMyGroups(mapped);

        // fetch discover groups (public list) and filter out joined ones
        const all = await listGroups();
        const joinedIds = new Set(mapped.map(g => g.id));
        const discover = all.filter(g => !joinedIds.has(g.id)).map(g => ({
          id: g.id,
          name: g.name,
          description: g.description || '',
          members: g.members_count || 0,
          sessions: 0,
          color: 'from-indigo-500 to-blue-500'
        }));
        if (mounted) setDiscoverGroups(discover.slice(0, 6));
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch user activity stats (study hours, groups joined, resources shared)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        const activityData = await getUserActivityStats();
        if (!mounted) return;
        
        // Update stats with real data from backend
        setStats([
          { 
            label: 'Total Study Hours', 
            value: `${activityData.study_hours || 0}h`, 
            icon: Clock, 
            color: 'text-blue-600' 
          },
          { 
            label: 'Groups Joined', 
            value: `${activityData.groups_joined || 0}`, 
            icon: Users, 
            color: 'text-purple-600' 
          },
          { 
            label: 'Resources Shared', 
            value: `${activityData.resources_shared || 0}`, 
            icon: FileText, 
            color: 'text-green-600' 
          },
          { 
            label: 'Study Streak', 
            value: `${activityData.login_streak || 0} days`, 
            icon: Award, 
            color: 'text-orange-600' 
          }
        ]);
      } catch (e) {
        // Keep default values if fetch fails
        console.error('Failed to fetch activity stats:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const [stats, setStats] = useState([
    { label: 'Total Study Hours', value: '0h', icon: Clock, color: 'text-blue-600' },
    { label: 'Groups Joined', value: '0', icon: Users, color: 'text-purple-600' },
    { label: 'Resources Shared', value: '0', icon: FileText, color: 'text-green-600' },
    { label: 'Study Streak', value: '0 days', icon: Award, color: 'text-orange-600' }
  ]);

  const upcomingSessions = [
    { id: 1, group: 'Data Structures', time: 'Today, 3:00 PM', duration: '2 hours', attendees: 8 },
    { id: 2, group: 'React Workshop', time: 'Tomorrow, 5:00 PM', duration: '1.5 hours', attendees: 5 },
    { id: 3, group: 'ML Study Group', time: 'Wed, 4:00 PM', duration: '2 hours', attendees: 12 }
  ];

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('sb_token');
    navigate('/');
  };

  const handleViewGroup = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                StudyBuddy
              </span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Groups
              </button>
              <button 
                onClick={() => navigate('/calendar')}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Calendar
              </button>
              <button 
                onClick={() => navigate('/profile')}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Profile
              </button>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowUserMenu(false);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {user.notificationCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${notif.unread ? 'bg-blue-50' : ''}`}
                        >
                          <p className="text-sm text-gray-800">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100">
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                  }}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center overflow-hidden">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-semibold">{user.avatar}</span>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">{user.role} • Joined {user.joinDate}</p>
                    </div>
                    <button 
                      onClick={() => navigate('/profile')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">My Profile</span>
                    </button>
                    <button 
                      onClick={() => navigate('/settings')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">Settings</span>
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 mb-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
          <p className="text-blue-100">You have 3 upcoming study sessions this week</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search & Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-shadow flex items-center justify-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Create Group</span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 border border-gray-200">
                  <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* My Study Groups */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">My Study Groups</h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all
                </button>
              </div>

              <div className="space-y-4">
                {myGroups.map(group => (
                  <div
                    key={group.id}
                    className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${group.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              group.role === 'Admin' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {group.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{group.members} members</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{group.sessions} sessions</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <FileText className="w-4 h-4" />
                              <span>{group.resources} resources</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      {group.unreadMessages > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {group.unreadMessages}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-700">Next session: <span className="font-medium text-blue-600">{group.nextSession}</span></span>
                      </div>
                      <button 
                        onClick={() => handleViewGroup(group.id)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        View Group →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discover Groups */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Discover Groups</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {discoverGroups.map(group => (
                  <div
                    key={group.id}
                    className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${group.color} rounded-xl flex items-center justify-center mb-4`}>
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{group.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{group.members}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{group.sessions}</span>
                        </span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        Join →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Study Timer */}
            <StudyTimer onSessionEnd={() => {
              // Refresh activity stats after session ends
              const loadStats = async () => {
                try {
                  const activityData = await getUserActivityStats();
                  setStats([
                    { 
                      label: 'Total Study Hours', 
                      value: `${activityData.study_hours || 0}h`, 
                      icon: Clock, 
                      color: 'text-blue-600' 
                    },
                    { 
                      label: 'Groups Joined', 
                      value: `${activityData.groups_joined || 0}`, 
                      icon: Users, 
                      color: 'text-purple-600' 
                    },
                    { 
                      label: 'Resources Shared', 
                      value: `${activityData.resources_shared || 0}`, 
                      icon: FileText, 
                      color: 'text-green-600' 
                    },
                    { 
                      label: 'Study Streak', 
                      value: `${activityData.login_streak || 0} days`, 
                      icon: Award, 
                      color: 'text-orange-600' 
                    }
                  ]);
                } catch (e) {
                  console.error('Failed to refresh stats:', e);
                }
              };
              loadStats();
            }} />

            {/* Upcoming Sessions */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sessions</h3>
              <div className="space-y-4">
                {upcomingSessions.map(session => (
                  <div key={session.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{session.group}</h4>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {session.attendees} attending
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{session.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{session.duration}</p>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => navigate('/calendar')}
                className="w-full mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                View Calendar →
              </button>
            </div>

            {/* Study Streak */}
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Study Streak</h3>
                <Award className="w-8 h-8" />
              </div>
              <p className="text-4xl font-bold mb-2">7 Days</p>
              <p className="text-orange-100 text-sm">Keep up the great work! 3 more days to reach your goal.</p>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Study Streak</p>
                    <p className="text-xs text-gray-500">7 days in a row</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Team Player</p>
                    <p className="text-xs text-gray-500">Joined 3 groups</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
