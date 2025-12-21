import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, Bell, Shield, Eye, EyeOff, Palette, Smartphone, Save, Check, Camera, MapPin, Briefcase, BookOpen, Globe, Moon, Sun, Monitor, Type, AlertCircle, Trash2, Power, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profileData, setProfileData] = useState({
    name: 'John Doe',
    email: 'john.doe@university.edu',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    university: 'Stanford University',
    major: 'Computer Science',
    bio: 'Passionate about algorithms and data structures. Always eager to learn and help others grow.'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    sessionReminders: true,
    newMessages: true,
    groupInvitations: true,
    achievements: true,
    weeklySummary: false,
    resourceUploads: true,
    votingUpdates: true
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'everyone',
    showEmail: false,
    showPhone: false,
    showStatistics: true,
    showActivity: true,
    allowMessages: true
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light',
    language: 'english',
    fontSize: 'medium',
    compactMode: false
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const toggleNotification = (key) => {
    setNotificationSettings({
      ...notificationSettings,
      [key]: !notificationSettings[key]
    });
  };

  const togglePrivacy = (key) => {
    setPrivacySettings({
      ...privacySettings,
      [key]: !privacySettings[key]
    });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const sections = [
    { id: 'profile', name: 'Profile', icon: User, color: 'from-blue-500 to-cyan-500' },
    { id: 'account', name: 'Account', icon: Mail, color: 'from-purple-500 to-pink-500' },
    { id: 'security', name: 'Security', icon: Lock, color: 'from-green-500 to-emerald-500' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'from-orange-500 to-red-500' },
    { id: 'privacy', name: 'Privacy', icon: Shield, color: 'from-indigo-500 to-blue-500' },
    { id: 'appearance', name: 'Appearance', icon: Palette, color: 'from-pink-500 to-rose-500' }
  ];

  const ToggleSwitch = ({ checked, onChange }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
        checked ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleBack}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-all hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">Customize your experience</p>
              </div>
            </div>
            {saved && (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg">
                <Check className="w-5 h-5" />
                <span className="text-sm font-semibold">Saved successfully!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-200/50 p-3 sticky top-28 shadow-xl">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-4 rounded-2xl transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-r ${section.color} text-white shadow-lg scale-105`
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : 'bg-gray-100'} transition-colors`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-sm">{section.name}</span>
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-4">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="w-28 h-28 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center border-4 border-white/30 shadow-xl">
                        <span className="text-white text-4xl font-bold">JD</span>
                      </div>
                      <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <Camera className="w-5 h-5 text-blue-600" />
                      </button>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold mb-1">{profileData.name}</h2>
                      <p className="text-blue-100 mb-3">{profileData.email}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
                          <MapPin className="w-4 h-4" />
                          <span>{profileData.location}</span>
                        </span>
                        <span className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
                          <Briefcase className="w-4 h-4" />
                          <span>{profileData.university}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-200/50 p-8 shadow-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                    <User className="w-6 h-6 text-blue-600" />
                    <span>Personal Information</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Full Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Location</label>
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">University</label>
                      <input
                        type="text"
                        value={profileData.university}
                        onChange={(e) => setProfileData({...profileData, university: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Major</label>
                      <input
                        type="text"
                        value={profileData.major}
                        onChange={(e) => setProfileData({...profileData, major: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Bio</label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        rows="4"
                        maxLength="500"
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                        placeholder="Tell us about yourself..."
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Write a brief description about yourself</span>
                        <span>{profileData.bio.length}/500</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={handleSave}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3.5 rounded-2xl font-semibold hover:shadow-2xl transition-all hover:scale-105 flex items-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Account Section */}
            {activeSection === 'account' && (
              <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-200/50 p-8 shadow-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                    <Mail className="w-6 h-6 text-purple-600" />
                    <span>Account Settings</span>
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                      />
                      <p className="text-xs text-gray-500 flex items-center space-x-1 mt-2">
                        <AlertCircle className="w-3 h-3" />
                        <span>We'll send a verification email to confirm changes</span>
                      </p>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Connected Accounts</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md">
                              <svg className="w-7 h-7" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Google</p>
                              <p className="text-sm text-green-600 flex items-center space-x-1">
                                <Check className="w-3 h-3" />
                                <span>Connected</span>
                              </p>
                            </div>
                          </div>
                          <button className="text-red-600 hover:text-red-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-red-100 transition-colors">
                            Disconnect
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-5 border-2 border-dashed border-gray-300 rounded-2xl hover:border-gray-400 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">GitHub</p>
                              <p className="text-sm text-gray-500">Not connected</p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                            Connect
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={handleSave}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3.5 rounded-2xl font-semibold hover:shadow-2xl transition-all hover:scale-105 flex items-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl border-2 border-red-200 p-8">
                  <div className="flex items-center space-x-2 mb-6">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <h3 className="text-xl font-bold text-red-600">Danger Zone</h3>
                  </div>
                  <div className="space-y-3">
                    <button className="w-full text-left px-6 py-4 bg-white border-2 border-red-200 rounded-2xl hover:bg-red-50 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-red-600 flex items-center space-x-2">
                            <Power className="w-5 h-5" />
                            <span>Deactivate Account</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">Temporarily disable your account</p>
                        </div>
                      </div>
                    </button>
                    <button className="w-full text-left px-6 py-4 bg-white border-2 border-red-300 rounded-2xl hover:bg-red-50 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-red-600 flex items-center space-x-2">
                            <Trash2 className="w-5 h-5" />
                            <span>Delete Account</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">Permanently delete your account and all data</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-200/50 p-8 shadow-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                    <Lock className="w-6 h-6 text-green-600" />
                    <span>Security Settings</span>
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          className="w-full px-4 py-3.5 pr-12 rounded-2xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                          placeholder="Enter current password"
                        />
                        <button
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className="w-full px-4 py-3.5 pr-12 rounded-2xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                          placeholder="Enter new password"
                        />
                        <button
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          className="w-full px-4 py-3.5 pr-12 rounded-2xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                          placeholder="Confirm new password"
                        />
                        <button
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h4>
                      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Enable 2FA</p>
                            <p className="text-sm text-gray-600 mt-1">Add an extra layer of security</p>
                          </div>
                        </div>
                        <ToggleSwitch checked={twoFactorEnabled} onChange={() => setTwoFactorEnabled(!twoFactorEnabled)} />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h4>
                      <div className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-2xl bg-white">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Chrome on MacBook Pro</p>
                            <p className="text-sm text-gray-600 mt-1">Current device • San Francisco</p>
                          </div>
                        </div>
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={handleSave}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3.5 rounded-2xl font-semibold hover:shadow-2xl transition-all hover:scale-105 flex items-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-200/50 p-8 shadow-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                    <Bell className="w-6 h-6 text-orange-600" />
                    <span>Notification Settings</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {Object.entries(notificationSettings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-2xl hover:border-gray-300 transition-colors">
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-sm text-gray-600 mt-1">Manage {key.replace(/([A-Z])/g, ' $1').toLowerCase()} notifications</p>
                        </div>
                        <ToggleSwitch checked={value} onChange={() => toggleNotification(key)} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={handleSave}
                      className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-3.5 rounded-2xl font-semibold hover:shadow-2xl transition-all hover:scale-105 flex items-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>Save Preferences</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-200/50 p-8 shadow-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                    <Shield className="w-6 h-6 text-indigo-600" />
                    <span>Privacy Settings</span>
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Profile Visibility</label>
                      <select 
                        value={privacySettings.profileVisibility}
                        onChange={(e) => setPrivacySettings({...privacySettings, profileVisibility: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      >
                        <option value="everyone">Everyone</option>
                        <option value="groups">Groups Only</option>
                        <option value="private">Private</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-gray-200 space-y-4">
                      {Object.entries(privacySettings).filter(([key]) => key !== 'profileVisibility').map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <p className="text-gray-900 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <ToggleSwitch checked={value} onChange={() => togglePrivacy(key)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={handleSave}
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-3.5 rounded-2xl font-semibold hover:shadow-2xl transition-all hover:scale-105 flex items-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>Save Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-200/50 p-8 shadow-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                    <Palette className="w-6 h-6 text-pink-600" />
                    <span>Appearance Settings</span>
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Theme</label>
                      <select 
                        value={appearanceSettings.theme}
                        onChange={(e) => setAppearanceSettings({...appearanceSettings, theme: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Language</label>
                      <select 
                        value={appearanceSettings.language}
                        onChange={(e) => setAppearanceSettings({...appearanceSettings, language: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all"
                      >
                        <option value="english">English</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Font Size</label>
                      <select 
                        value={appearanceSettings.fontSize}
                        onChange={(e) => setAppearanceSettings({...appearanceSettings, fontSize: e.target.value})}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-2xl">
                      <p className="text-gray-900 font-medium">Compact Mode</p>
                      <ToggleSwitch checked={appearanceSettings.compactMode} onChange={() => setAppearanceSettings({...appearanceSettings, compactMode: !appearanceSettings.compactMode})} />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={handleSave}
                      className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-8 py-3.5 rounded-2xl font-semibold hover:shadow-2xl transition-all hover:scale-105 flex items-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>Save Preferences</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
