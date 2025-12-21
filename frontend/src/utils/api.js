// utils/api.js - Create this file for API calls

// Vite exposes env vars via import.meta.env. Use VITE_API_URL for configuration.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Helper function to get auth token
const getToken = () => localStorage.getItem('sb_token');

// Generic API call function
export const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  // Global handling for unauthorized: clear token and redirect to login
  if (response.status === 401) {
    try {
      localStorage.removeItem('sb_token');
    } catch (e) {}
    // If we're currently on a non-login page, redirect so user can re-auth
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
    const errText = await response.text().catch(() => 'Unauthorized');
    throw new Error(errText || 'Unauthorized');
  }

  if (!response.ok) {
    // try to parse JSON error shape, fallback to text
    let errMsg = `API Error: ${response.status}`;
    try {
      const body = await response.json();
      errMsg = body.message || JSON.stringify(body) || errMsg;
    } catch (e) {
      try {
        errMsg = await response.text();
      } catch (e2) {}
    }
    throw new Error(errMsg);
  }

  // safe-guard: some endpoints return empty body
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return text;
  }
};

// ============ PROFILE ENDPOINTS ============

// Get current user profile
export const getProfile = () => apiCall('/api/profile');

// Update user profile
export const updateProfile = (profileData) => 
  apiCall('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });

// Change email
export const changeEmail = (newEmail, password) =>
  apiCall('/api/profile/email', {
    method: 'PUT',
    body: JSON.stringify({ new_email: newEmail, password }),
  });

// Change phone
export const changePhone = (newPhone, password) =>
  apiCall('/api/profile/phone', {
    method: 'PUT',
    body: JSON.stringify({ new_phone: newPhone, password }),
  });

// Delete account
export const deleteAccount = (password) =>
  apiCall('/api/profile/delete', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });

// ============ GROUPS ENDPOINTS ============

// List all groups
export const listGroups = () => apiCall('/api/groups');

// Create a new group
export const createGroup = (groupData) =>
  apiCall('/api/groups', {
    method: 'POST',
    body: JSON.stringify(groupData),
  });

// Get group details
export const getGroup = (groupId) => apiCall(`/api/groups/${groupId}`);

// Get groups the authenticated user has joined
export const getMyGroups = () => apiCall('/api/user/groups');

// Join a group
export const joinGroup = (groupId) =>
  apiCall(`/api/groups/${groupId}/join`, {
    method: 'POST',
  });

// Leave a group
export const leaveGroup = (groupId) =>
  apiCall(`/api/groups/${groupId}/leave`, {
    method: 'POST',
  });

// Get group messages
export const getGroupMessages = (groupId) =>
  apiCall(`/api/groups/${groupId}/messages`);

// Post a message to a group (HTTP fallback for WebSocket)
export const postGroupMessage = (groupId, content, clientTempId) =>
  apiCall(`/api/groups/${groupId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, clientTempId }),
  });

// Upload a file for a group. `file` is a File object from an <input type="file" />
export const uploadGroupFile = async (groupId, file) => {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const token = getToken();

  const fd = new FormData();
  fd.append('file', file);

  const resp = await fetch(`${API_BASE}/api/groups/${groupId}/messages/upload`, {
    method: 'POST',
    body: fd,
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err || `Upload failed: ${resp.status}`);
  }

  return resp.json();
};

// ============ AUTH ENDPOINTS ============

// Signup
export const signup = (email, password, username) =>
  apiCall('/api/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  });

// Login
export const login = (email, password) =>
  apiCall('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// ============ POINTS & RANKING ENDPOINTS ============

// Get user stats (points, rank, progress)
export const getUserStats = () => apiCall('/api/user/stats');

// Get user activity stats (study hours, sessions, resources)
export const getUserActivityStats = () => apiCall('/api/user/activity');

// Get leaderboard
export const getLeaderboard = () => apiCall('/api/leaderboard');

// Get rank thresholds
export const getRankThresholds = () => apiCall('/api/ranks');

// Get user points history
export const getUserPointsHistory = () => apiCall('/api/user/points-history');

// Add reaction to message (awards points)
export const addMessageReaction = (messageId, reactionType) =>
  apiCall('/api/messages/reaction', {
    method: 'POST',
    body: JSON.stringify({ message_id: messageId, reaction_type: reactionType }),
  });

// ============ STUDY SESSION ENDPOINTS ============

// Start a study session
export const startStudySession = (groupId, notes) =>
  apiCall('/api/study/start', {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId, notes: notes }),
  });

// End a study session
export const endStudySession = (sessionId) =>
  apiCall(`/api/study/end?session_id=${sessionId}`, {
    method: 'POST',
  });

// Get user's study sessions and stats
export const getUserStudySessions = () => apiCall('/api/study/sessions');

// Get study statistics
export const getStudyStats = () => apiCall('/api/study/stats');

// ============ EXAMPLE USAGE IN COMPONENTS ============

/*
// In SettingsPage.jsx - Profile Section

useEffect(() => {
  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfileData({
        name: data.username,
        email: data.email,
        phone: data.phone,
        // ... map other fields
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  loadProfile();
}, []);

const handleSave = async () => {
  try {
    await updateProfile({
      username: profileData.name,
      phone: profileData.phone,
      notifications_enabled: notificationSettings.emailNotifications,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  } catch (error) {
    console.error('Failed to save profile:', error);
  }
};

// For email change
const handleEmailChange = async () => {
  try {
    await changeEmail(profileData.email, passwordData.currentPassword);
    setSaved(true);
  } catch (error) {
    console.error('Failed to change email:', error);
  }
};

// In UserProfile.jsx - Points Integration

useEffect(() => {
  const loadUserData = async () => {
    try {
      const [profileData, statsData, ranksData] = await Promise.all([
        getProfile(),
        getUserStats(),
        getRankThresholds()
      ]);

      setUser({
        name: profileData.username,
        email: profileData.email,
        avatar: profileData.username.charAt(0).toUpperCase(),
        role: 'Student', // You can map this from profile data
        location: profileData.location || 'Not specified',
        joinDate: new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        bio: profileData.bio || 'No bio available',
        stats: {
          totalStudyHours: 0, // This might come from a different endpoint
          sessionsAttended: 0, // This might come from a different endpoint
          groupsJoined: 0, // This might come from a different endpoint
          resourcesShared: 0, // This might come from a different endpoint
          currentStreak: statsData.login_streak,
          longestStreak: 0, // This might come from a different endpoint
          rank: ranksData.find(r => r.rank_name === statsData.current_rank)?.display_order || 1,
          totalPoints: statsData.total_points
        }
      });

      setRankThresholds(ranksData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  loadUserData();
}, []);
*/
