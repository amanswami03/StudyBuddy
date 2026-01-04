import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getGroup, getMyGroups, listGroups, getUserActivityStats, createGroup, searchGroups, joinGroup, getUserNotifications, getUnreadNotificationCount, markNotificationAsRead } from './utils/api';
import { Calendar, Users, BookOpen, Bell, Search, Plus, Clock, FileText, Award, ChevronDown, LogOut, Settings, User, MessageSquare, TrendingUp, X } from 'lucide-react';
import StudyTimer from './components/StudyTimer';
import { useTheme } from './contexts/ThemeContext';

// Get API base URL for photo access
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function MainDashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Helper function for theme-aware classes
  const getThemeClass = (lightClass, darkClass) => {
    return theme === 'dark' ? darkClass : lightClass;
  };
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [user, setUser] = useState({
    name: 'Guest',
    email: '',
    avatar: 'G',
    photoUrl: null,
    role: '',
    joinDate: '',
    notificationCount: 0
  });

  const [createGroupForm, setCreateGroupForm] = useState({
    name: '',
    username: '',
    description: '',
    isPublic: true,
    allowContentViewWithoutJoin: false,
    requireAdminApproval: false
  });

  const [createGroupError, setCreateGroupError] = useState('');
  const [createGroupLoading, setCreateGroupLoading] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [myGroups, setMyGroups] = useState([]);

  const [discoverGroups, setDiscoverGroups] = useState([]);

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

  // Fetch notifications from backend
  useEffect(() => {
    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        
        // Fetch notifications and unread count in parallel
        const [notificationsData, unreadCount] = await Promise.all([
          getUserNotifications(10),
          getUnreadNotificationCount()
        ]);
        
        if (!mounted) return;
        
        // Format notifications with time display
        const formatted = notificationsData.map(notif => ({
          id: notif.id,
          message: notif.message,
          title: notif.title,
          time: getTimeAgo(notif.created_at),
          unread: !notif.is_read,
          type: notif.type
        }));
        
        setNotifications(formatted);
        setUnreadNotificationCount(unreadCount.count || 0);
      } catch (e) {
        console.error('Failed to fetch notifications:', e);
      }
    };
    
    fetchNotifications();
    // Refresh notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Helper function to format time ago
  const getTimeAgo = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Refresh member counts for groups on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) return;
        // fetch user's groups
        const userGroups = await getMyGroups();
        // userGroups returns array of {id, name, description, members_count, role}
        const mapped = userGroups.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description || '',
          members: g.members_count || 0,
          sessions: 0,
          resources: 0,
          nextSession: 'TBD',
          unreadMessages: 0,
          role: g.role || 'Member',
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

  const handleLogout = () => {
    localStorage.removeItem('sb_token');
    navigate('/');
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchGroups(query);
      setSearchResults(results || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreateGroupError('');

    if (!createGroupForm.name.trim()) {
      setCreateGroupError('Group name is required');
      return;
    }

    if (!createGroupForm.username.trim()) {
      setCreateGroupError('Group username is required');
      return;
    }

    setCreateGroupLoading(true);
    try {
      const result = await createGroup({
        name: createGroupForm.name,
        username: createGroupForm.username,
        description: createGroupForm.description,
        is_public: createGroupForm.isPublic,
        allow_content_view_without_join: createGroupForm.allowContentViewWithoutJoin,
        require_admin_approval: createGroupForm.requireAdminApproval
      });

      // Reset form and close modal
      setCreateGroupForm({
        name: '',
        username: '',
        description: '',
        isPublic: true,
        allowContentViewWithoutJoin: false,
        requireAdminApproval: false
      });
      setShowCreateGroupModal(false);

      // Refresh groups
      const userGroups = await getMyGroups();
      const mapped = userGroups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description || '',
        members: g.members_count || 0,
        sessions: 0,
        resources: 0,
        nextSession: 'TBD',
        unreadMessages: 0,
        role: g.role || 'Member',
        color: 'from-blue-500 to-cyan-500'
      }));
      setMyGroups(mapped);

      // Navigate to new group
      navigate(`/group/${result.id}`);
    } catch (error) {
      setCreateGroupError(error.message || 'Failed to create group');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const handleViewGroup = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const response = await joinGroup(groupId);
      
      // Check if join request is pending (needs admin approval)
      if (response.status === 'pending') {
        alert('Your join request has been sent to the group admin and is pending approval!');
        return;
      }
      
      // Otherwise, user has directly joined
      // Refresh the discover groups and my groups after joining
      const userGroups = await getMyGroups();
      const mapped = userGroups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description || '',
        members: g.members_count || 0,
        sessions: 0,
        resources: 0,
        nextSession: 'TBD',
        unreadMessages: 0,
        role: g.role || 'Member',
        color: 'from-blue-500 to-cyan-500'
      }));
      setMyGroups(mapped);

      // Refresh discover groups
      const allGroups = await listGroups();
      const filtered = allGroups.filter(g => !mapped.some(mg => mg.id === g.id));
      const discoveredMapped = filtered.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description || '',
        members: g.members_count || 0,
        sessions: 0,
        color: 'from-orange-500 to-red-500'
      }));
      setDiscoverGroups(discoveredMapped);
      
      alert('Successfully joined the group!');
    } catch (error) {
      console.error('Failed to join group:', error);
      alert('Failed to join group: ' + error.message);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-950' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
      {/* Top Navigation */}
      <nav className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-b sticky top-0 z-50 shadow-sm`}>
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
              <button className={`${theme === 'dark' ? 'text-gray-300 hover:text-cyan-400' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors`}>
                Groups
              </button>
              <button 
                onClick={() => navigate('/calendar')}
                className={`${theme === 'dark' ? 'text-gray-300 hover:text-cyan-400' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors`}
              >
                Calendar
              </button>
              <button 
                onClick={() => navigate('/profile')}
                className={`${theme === 'dark' ? 'text-gray-300 hover:text-cyan-400' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors`}
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
                  className={`p-2 rounded-lg transition-colors relative ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-lg border py-2 z-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-4 py-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className={`px-4 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (notif.unread) {
                                markNotificationAsRead(notif.id).catch(e => console.error('Failed to mark as read:', e));
                                // Update local state
                                setUnreadNotificationCount(prev => Math.max(0, prev - 1));
                                setNotifications(prev => 
                                  prev.map(n => n.id === notif.id ? { ...n, unread: false } : n)
                                );
                              }
                            }}
                            className={`px-4 py-3 cursor-pointer border-l-2 ${notif.unread ? `${theme === 'dark' ? 'bg-blue-900/30 border-blue-500' : 'bg-blue-50 border-blue-500'}` : `${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} border-transparent`}`}
                          >
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{notif.title}</p>
                            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{notif.message}</p>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{notif.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className={`px-4 py-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                      <button className={`text-sm font-medium ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'}`}>
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
                  className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center overflow-hidden">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-semibold">{user.avatar}</span>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showUserMenu && (
                  <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-lg border py-2 z-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{user.name}</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{user.role} • Joined {user.joinDate}</p>
                    </div>
                    <button 
                      onClick={() => navigate('/profile')}
                      className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50'}`}
                    >
                      <User className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>My Profile</span>
                    </button>
                    <button 
                      onClick={() => navigate('/settings')}
                      className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50'}`}
                    >
                      <Settings className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Settings</span>
                    </button>
                    <div className={`border-t mt-1 pt-1 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                      <button 
                        onClick={handleLogout}
                        className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-50'}`}
                      >
                        <LogOut className={`w-4 h-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Logout</span>
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
                  onChange={handleSearch}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
                
                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-lg border z-40 max-h-96 overflow-y-auto ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    {searchLoading ? (
                      <div className={`p-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(group => (
                        <div
                          key={group.id}
                          onClick={() => {
                            navigate(`/group/${group.id}`);
                            setShowSearchResults(false);
                          }}
                          className={`px-4 py-3 cursor-pointer border-b last:border-b-0 ${theme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-50 border-gray-100'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{group.name}</p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>@{group.username}</p>
                              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{group.description}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ml-2 ${theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                              {group.members_count} members
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`p-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No groups found</div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-shadow flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create Group</span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{stat.value}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* My Study Groups */}
            {myGroups.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>My Study Groups</h2>
                <button className={`text-sm font-medium ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'}`}>
                  View all
                </button>
              </div>

              <div className="space-y-4">
                {myGroups.map(group => (
                  <div
                    key={group.id}
                    className={`rounded-xl p-6 border hover:shadow-lg transition-shadow cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${group.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{group.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              group.role === 'Admin' 
                                ? `${theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}` 
                                : `${theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`
                            }`}>
                              {group.role}
                            </span>
                          </div>
                          <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{group.description}</p>
                          <div className={`flex items-center space-x-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{group.members} members</span>
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
                    <div className={`flex items-center justify-between pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div></div>
                      <button 
                        onClick={() => handleViewGroup(group.id)}
                        className={`font-medium text-sm ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        View Group →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Discover Groups */}
            <div>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Discover Groups</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {discoverGroups.slice(0, 4).map(group => (
                  <div
                    key={group.id}
                    className={`rounded-xl p-6 border hover:shadow-lg transition-shadow cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${group.color} rounded-xl flex items-center justify-center mb-4`}>
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{group.name}</h3>
                    <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{group.description}</p>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center space-x-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{group.members}</span>
                        </span>
                      </div>
                      <button 
                        onClick={() => handleJoinGroup(group.id)}
                        className={`font-medium text-sm ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
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

            {/* Study Streak */}
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Study Streak</h3>
                <Award className="w-8 h-8" />
              </div>
              <p className="text-4xl font-bold mb-2">{stats.find(s => s.label === 'Study Streak')?.value || '0 days'}</p>
              <p className="text-orange-100 text-sm">Login daily to maintain your streak!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto pt-8">
          <div className={`rounded-2xl shadow-xl max-w-md w-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Create New Group</h2>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              {createGroupError && (
                <div className={`border px-4 py-3 rounded-lg text-sm ${theme === 'dark' ? 'bg-red-900/30 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {createGroupError}
                </div>
              )}

              {/* Group Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={createGroupForm.name}
                  onChange={(e) => setCreateGroupForm({ ...createGroupForm, name: e.target.value })}
                  placeholder="e.g., Data Structures & Algorithms"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>

              {/* Username */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Group Username (unique identifier)
                </label>
                <input
                  type="text"
                  value={createGroupForm.username}
                  onChange={(e) => setCreateGroupForm({ ...createGroupForm, username: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                  placeholder="e.g., dsa-101"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Unique username for this group. Can't be changed later.</p>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={createGroupForm.description}
                  onChange={(e) => setCreateGroupForm({ ...createGroupForm, description: e.target.value })}
                  placeholder="What is this group about?"
                  rows="3"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>

              {/* Public */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={createGroupForm.isPublic}
                  onChange={(e) => setCreateGroupForm({ ...createGroupForm, isPublic: e.target.checked })}
                  className={`w-4 h-4 rounded border-gray-300 text-blue-600 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                />
                <label htmlFor="isPublic" className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Make this group public (admin permission needed to join)
                </label>
              </div>

              {/* Allow content view without join */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allowContentView"
                  checked={createGroupForm.allowContentViewWithoutJoin}
                  onChange={(e) => setCreateGroupForm({ ...createGroupForm, allowContentViewWithoutJoin: e.target.checked })}
                  className={`w-4 h-4 rounded border-gray-300 text-blue-600 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                />
                <label htmlFor="allowContentView" className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Allow non-members to view content
                </label>
              </div>

              {/* Require admin approval */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="requireAdminApproval"
                  checked={createGroupForm.requireAdminApproval}
                  onChange={(e) => setCreateGroupForm({ ...createGroupForm, requireAdminApproval: e.target.checked })}
                  className={`w-4 h-4 rounded border-gray-300 text-blue-600 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                />
                <label htmlFor="requireAdminApproval" className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Admin approval required for new members to join
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg border font-medium transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
                >
                  {createGroupLoading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
