import React, { useState, useEffect, useRef } from 'react';
import { Camera, Edit, Mail, Award, BookOpen, Users, Clock, TrendingUp, Settings, Bell, Lock, User, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getUserStats, getRankThresholds, getUserActivityStats } from './utils/api';

// Get API base URL for photo access
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function UserProfile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [rankThresholds, setRankThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('sb_token');
    if (!token) {
      setError('Please log in to view your profile.');
      setLoading(false);
      return;
    }

    const loadUserData = async () => {
      try {
        // Try to fetch real data
        let profileData, statsData, activityData, ranksData;
        
        try {
          const results = await Promise.all([
            getProfile(),
            getUserStats(),
            getUserActivityStats(),
            getRankThresholds()
          ]);
          profileData = results[0];
          statsData = results[1];
          activityData = results[2];
          ranksData = results[3];
          console.log('API data loaded successfully:', { profileData, statsData, activityData, ranksData });
        } catch (apiError) {
          // If API fails, use minimal mock data
          console.warn('API failed, using minimal mock data:', apiError);
          profileData = {
            username: null,
            email: null,
            phone: null,
            created_at: new Date().toISOString()
          };
          statsData = {
            total_points: 0,
            current_rank: 'Beginner',
            login_streak: 0
          };
          activityData = {
            study_hours: 0,
            sessions_attended: 0,
            groups_joined: 0,
            resources_shared: 0
          };
          ranksData = [
            { rank_name: 'Beginner', points_required: 0, badge_emoji: '🌱', display_order: 1 },
            { rank_name: 'Active', points_required: 100, badge_emoji: '⚡', display_order: 2 },
            { rank_name: 'Contributor', points_required: 300, badge_emoji: '🎯', display_order: 3 },
            { rank_name: 'Mentor', points_required: 700, badge_emoji: '🧠', display_order: 4 },
            { rank_name: 'Elite Member', points_required: 1500, badge_emoji: '👑', display_order: 5 },
            { rank_name: 'Legend', points_required: 3000, badge_emoji: '🔥', display_order: 6 }
          ];
        }

        const userName = profileData?.username || profileData?.email || localStorage.getItem('sb_username') || 'User Profile';
        const userEmail = profileData?.email || localStorage.getItem('sb_email') || 'Email not available';
        
        // Convert profile_pic to absolute URL if it's relative
        let photoUrl = profileData?.profile_pic || null;
        if (photoUrl && !photoUrl.startsWith('http')) {
          photoUrl = `${API_BASE}${photoUrl}`;
        }
        
        // Debug logging
        console.log('Profile Data received:', profileData);
        console.log('localStorage username:', localStorage.getItem('sb_username'));
        console.log('Using name:', userName, 'email:', userEmail, 'photo:', photoUrl);
        
        setUser({
          name: userName,
          email: userEmail,
          avatar: (userName || 'U').charAt(0).toUpperCase(),
          photoUrl: photoUrl,
          phone: profileData?.phone || 'Not provided',
          bio: profileData?.bio || 'No bio available',
          stats: {
            totalStudyHours: activityData?.study_hours || 0,
            sessionsAttended: activityData?.sessions_attended || 0,
            groupsJoined: activityData?.groups_joined || 0,
            resourcesShared: activityData?.resources_shared || 0,
            currentStreak: statsData?.login_streak || 0,
            longestStreak: 30,
            totalPoints: statsData?.total_points || 0,
            currentRank: statsData?.current_rank || 'Beginner'
          }
        });

        setRankThresholds(ranksData || []);
      } catch (err) {
        // Use localStorage fallback if everything fails
        console.error('Failed to load user data:', err);
        const fallbackName = localStorage.getItem('sb_username') || 'User Profile';
        const fallbackEmail = localStorage.getItem('sb_email') || 'Email not available';
        
        setError('Could not load full profile. Showing cached data.');
        setUser({
          name: fallbackName,
          email: fallbackEmail,
          avatar: (fallbackName || 'U').charAt(0).toUpperCase(),
          phone: 'Not provided',
          bio: 'Unable to load profile data.',
          stats: {
            totalStudyHours: 0,
            sessionsAttended: 0,
            groupsJoined: 0,
            resourcesShared: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalPoints: 0,
            currentRank: 'Beginner'
          }
        });
        setRankThresholds([
          { rank_name: 'Beginner', points_required: 0, display_order: 1, badge_emoji: '🌱' },
          { rank_name: 'Active', points_required: 100, display_order: 2, badge_emoji: '⚡' },
          { rank_name: 'Contributor', points_required: 300, display_order: 3, badge_emoji: '🎯' },
          { rank_name: 'Mentor', points_required: 700, display_order: 4, badge_emoji: '🧠' },
          { rank_name: 'Elite Member', points_required: 1500, display_order: 5, badge_emoji: '👑' },
          { rank_name: 'Legend', points_required: 3000, display_order: 6, badge_emoji: '🔥' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('sb_token');
      const response = await fetch('http://localhost:8080/api/user/profile-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      // Update user with new photo URL - convert to absolute if needed
      const photoUrl = result.photo_url || result.photoUrl;
      const absoluteUrl = photoUrl && !photoUrl.startsWith('http') ? `${API_BASE}${photoUrl}` : photoUrl;
      
      setUser(prev => ({
        ...prev,
        photoUrl: absoluteUrl
      }));
      setProfilePhoto(absoluteUrl);
      alert('Profile photo updated successfully!');
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert(`Failed to upload photo: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const recentActivity = [
    { id: 1, type: 'session', text: 'Attended Data Structures study session', time: '2 hours ago' },
    { id: 2, type: 'resource', text: 'Uploaded "Binary Tree Notes.pdf"', time: '5 hours ago' },
    { id: 3, type: 'achievement', text: 'Earned "Study Streak" badge', time: '1 day ago' },
    { id: 4, type: 'group', text: 'Joined "Machine Learning Study Group"', time: '2 days ago' },
    { id: 5, type: 'session', text: 'Hosted React Workshop session', time: '3 days ago' }
  ];

  const badges = [
    { id: 1, name: 'Study Streak', icon: '🔥', earned: true, date: 'Nov 8, 2025' },
    { id: 2, name: 'Team Player', icon: '👥', earned: true, date: 'Nov 5, 2025' },
    { id: 3, name: 'Knowledge Sharer', icon: '📚', earned: true, date: 'Nov 3, 2025' },
    { id: 4, name: 'Early Bird', icon: '🌅', earned: false, progress: '3/5' },
    { id: 5, name: 'Session Master', icon: '🎯', earned: false, progress: '6/10' },
    { id: 6, name: 'Quiz Champion', icon: '🏆', earned: false, progress: '4/5' }
  ];

  const groups = [
    { id: 1, name: 'Data Structures & Algorithms', members: 12, role: 'Admin' },
    { id: 2, name: 'React & Frontend Development', members: 8, role: 'Member' },
    { id: 3, name: 'Machine Learning Study Group', members: 15, role: 'Member' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <p className="text-red-600">Error loading profile: {error}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-cyan-600 -mx-4 sm:-mx-6 lg:-mx-8"></div>
          
          {/* Profile Info */}
          <div className="relative pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Avatar */}
              <div className="relative -mt-16">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-4xl font-bold">{user?.avatar}</span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>{isEditing ? 'Save' : 'Edit Profile'}</span>
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-8 mt-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="font-medium">Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'activity'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="font-medium">Activity</span>
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'badges'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="font-medium">Badges</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'settings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <Clock className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-3xl font-bold text-gray-900">{user.stats.totalStudyHours}h</p>
                  <p className="text-sm text-gray-600">Study Hours</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <Users className="w-8 h-8 text-purple-600 mb-2" />
                  <p className="text-3xl font-bold text-gray-900">{user.stats.sessionsAttended}</p>
                  <p className="text-sm text-gray-600">Sessions</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <BookOpen className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-3xl font-bold text-gray-900">{user.stats.resourcesShared}</p>
                  <p className="text-sm text-gray-600">Resources</p>
                </div>
              </div>

              {/* Bio */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
                {isEditing ? (
                  <textarea
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows="4"
                    defaultValue={user.bio}
                  />
                ) : (
                  <p className="text-gray-700">{user.bio}</p>
                )}
              </div>

              {/* Study Groups */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">My Study Groups</h2>
                <div className="space-y-3">
                  {groups.map(group => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{group.name}</p>
                          <p className="text-sm text-gray-600">{group.members} members</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        group.role === 'Admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {group.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Streak Card */}
              <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Study Streak</h3>
                  <Award className="w-8 h-8" />
                </div>
                <p className="text-5xl font-bold mb-2">{user.stats.currentStreak}</p>
                <p className="text-orange-100 text-sm">days in a row</p>
                <div className="mt-4 pt-4 border-t border-orange-400">
                  <p className="text-sm">Longest Streak: <span className="font-semibold">{user.stats.longestStreak} days</span></p>
                </div>
              </div>

              {/* Points Card */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Points</h3>
                <p className="text-4xl font-bold text-blue-600 mb-2">{user.stats.totalPoints.toLocaleString()}</p>
                {(() => {
                  const currentRankInfo = rankThresholds.find(r => r.rank_name === user.stats.currentRank);
                  const nextRankInfo = rankThresholds.find(
                    r => r.points_required > user.stats.totalPoints
                  );
                  const progressToNext = nextRankInfo ?
                    ((user.stats.totalPoints - (currentRankInfo?.points_required || 0)) /
                     (nextRankInfo.points_required - (currentRankInfo?.points_required || 0))) * 100 : 100;

                  return (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: `${Math.min(progressToNext, 100)}%` }}></div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {nextRankInfo ? `${nextRankInfo.points_required - user.stats.totalPoints} points to ${nextRankInfo.rank_name}` : 'Max rank achieved!'}
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* Recent Badges */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Badges</h3>
                <div className="space-y-3">
                  {badges.filter(b => b.earned).slice(0, 3).map(badge => (
                    <div key={badge.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50">
                      <div className="text-3xl">{badge.icon}</div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{badge.name}</p>
                        <p className="text-xs text-gray-600">Earned {badge.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'session' ? 'bg-blue-100' :
                        activity.type === 'resource' ? 'bg-green-100' :
                        activity.type === 'achievement' ? 'bg-orange-100' :
                        'bg-purple-100'
                      }`}>
                        {activity.type === 'session' && <Users className="w-5 h-5 text-blue-600" />}
                        {activity.type === 'resource' && <BookOpen className="w-5 h-5 text-green-600" />}
                        {activity.type === 'achievement' && <Award className="w-5 h-5 text-orange-600" />}
                        {activity.type === 'group' && <Users className="w-5 h-5 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900">{activity.text}</p>
                        <p className="text-sm text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map(badge => (
              <div
                key={badge.id}
                className={`bg-white rounded-xl p-6 border ${
                  badge.earned ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50' : 'border-gray-200'
                }`}
              >
                <div className={`text-5xl mb-4 ${!badge.earned && 'grayscale opacity-50'}`}>
                  {badge.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{badge.name}</h3>
                {badge.earned ? (
                  <p className="text-sm text-blue-600">Earned {badge.date}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-2">Progress: {badge.progress}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-400 h-2 rounded-full"
                        style={{ width: `${(parseInt(badge.progress.split('/')[0]) / parseInt(badge.progress.split('/')[1])) * 100}%` }}
                      ></div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            {/* Account Settings */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    defaultValue={user.name}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={user.email}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  'Session reminders',
                  'New messages',
                  'Group invitations',
                  'Achievement unlocked',
                  'Weekly summary'
                ].map((pref, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-gray-700">{pref}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Privacy</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Profile Visibility</p>
                    <p className="text-sm text-gray-600">Who can see your profile</p>
                  </div>
                  <select className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Everyone</option>
                    <option>Groups Only</option>
                    <option>Private</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Show Statistics</p>
                    <p className="text-sm text-gray-600">Display study hours and rankings</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
