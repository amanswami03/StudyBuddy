import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Lock, Shield, Eye, EyeOff, Palette, Save, Check, Camera, MapPin, Briefcase, BookOpen, Moon, Sun, Monitor, Type, AlertCircle, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, changePassword } from './utils/api';
import { useTheme } from './contexts/ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const isDark = theme === 'dark';

  const [activeSection, setActiveSection] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '', location: '', university: '', major: '', bio: '', photoUrl: null });
  const [initialProfileData, setInitialProfileData] = useState({ name: '', email: '', phone: '', location: '', university: '', major: '', bio: '', photoUrl: null });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [privacySettings, setPrivacySettings] = useState({ showEmail: false, showPhone: false, showLocation: false, showUniversity: false, showBio: false });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('sb_token');
        if (!token) { setLoading(false); return; }
        const data = await getProfile();
        let photoUrl = data.profile_pic || null;
        if (photoUrl && !photoUrl.startsWith('http')) photoUrl = `${API_BASE}${photoUrl}`;
        const np = { name: data.username || '', email: data.email || '', phone: data.phone || '', location: data.location || '', university: data.university || '', major: data.major || '', bio: data.bio || '', photoUrl };
        setProfileData(np);
        setInitialProfileData(np);
        setPrivacySettings({ showEmail: data.show_email || false, showPhone: data.show_phone || false, showLocation: data.show_location || false, showUniversity: data.show_university || false, showBio: data.show_bio || false });
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('sb_token');
      if (!token) { alert('Please log in first'); return; }
      await updateProfile({ username: profileData.name, phone: profileData.phone, location: profileData.location, university: profileData.university, major: profileData.major, bio: profileData.bio, show_email: privacySettings.showEmail, show_phone: privacySettings.showPhone, show_location: privacySettings.showLocation, show_university: privacySettings.showUniversity, show_bio: privacySettings.showBio });
      setInitialProfileData(profileData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert('Failed to save profile. Please try again.'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    setSavingPassword(true);
    try {
      const token = localStorage.getItem('sb_token');
      if (!token) { alert('Please log in first'); return; }
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) { alert('Please fill in all password fields'); return; }
      if (passwordData.newPassword !== passwordData.confirmPassword) { alert('New passwords do not match'); return; }
      if (passwordData.newPassword.length < 6) { alert('New password must be at least 6 characters long'); return; }
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      alert('Password changed successfully!');
    } catch (error) {
      if (error.message?.includes('Current password is incorrect')) alert('Current password is incorrect.');
      else if (error.message?.includes('must be different')) alert('New password must be different from current password.');
      else alert('Failed to change password. Please try again.');
    } finally { setSavingPassword(false); }
  };

  const sections = [
    { id: 'profile', name: 'Profile', icon: User, strip: '#1d4ed8' },
    { id: 'account', name: 'Account', icon: Mail, strip: '#6b21a8' },
    { id: 'security', name: 'Security', icon: Lock, strip: '#065f46' },
    { id: 'privacy', name: 'Privacy', icon: Shield, strip: '#0e7490' },
    { id: 'appearance', name: 'Appearance', icon: Palette, strip: '#c2410c' },
  ];

  const ToggleSwitch = ({ checked, onChange }) => (
    <button onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : (isDark ? 'bg-slate-600' : 'bg-slate-200')}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  const fieldCls = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-white border-amber-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'} focus:ring-2 focus:ring-blue-100`;
  const labelCls = `block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
  const cardCls = `rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100'} shadow-paper`;

  return (
    <div className="min-h-screen transition-colors" style={!isDark ? { background: 'var(--page-bg, #fef8ec)' } : { background: '#0f172a' }}>

      {/* Header */}
      <div className={`sticky top-0 z-50 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white/90 backdrop-blur border-amber-100'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-amber-50 text-slate-500'}`}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>Settings</h1>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Customize your experience</p>
              </div>
            </div>
            {saved && (
              <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                <Check className="w-4 h-4" /> Saved!
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar nav */}
          <div className="lg:col-span-1">
            <div className={`${cardCls} p-3 sticky top-24`}>
              <nav className="space-y-1">
                {sections.map(s => {
                  const Icon = s.icon;
                  const isActive = activeSection === s.id;
                  return (
                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'text-white shadow-sm'
                          : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-amber-50'
                      }`}
                      style={isActive ? { background: s.strip } : {}}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-white/20' : (isDark ? 'bg-slate-700' : 'bg-amber-50')}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {s.name}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-5">

            {/* ── Profile ── */}
            {activeSection === 'profile' && (
              <>
                {/* Avatar card */}
                <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e1b5e 0%, #1d4ed8 100%)' }}>
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent,transparent 27px,rgba(255,255,255,0.05) 27px,rgba(255,255,255,0.05) 28px)', backgroundSize: '100% 28px' }}/>
                  <div className="relative z-10 flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/20 rounded-2xl border-4 border-white/20 flex items-center justify-center overflow-hidden shadow-md">
                        {profileData.photoUrl ? <img src={profileData.photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-3xl font-extrabold text-white">{profileData.name.charAt(0) || '?'}</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xl font-extrabold">{profileData.name || 'Your Name'}</p>
                      <p className="text-blue-200 text-sm">{profileData.email}</p>
                      {profileData.university && <p className="text-blue-200 text-xs mt-0.5">{profileData.university}</p>}
                    </div>
                  </div>
                </div>

                {/* Profile fields */}
                <div className={cardCls}>
                  <h3 className={`font-extrabold text-base mb-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Display Name', key: 'name', icon: User },
                      { label: 'Email', key: 'email', icon: Mail, readOnly: true },
                      { label: 'Phone', key: 'phone', icon: null },
                      { label: 'Location', key: 'location', icon: MapPin },
                      { label: 'University', key: 'university', icon: BookOpen },
                      { label: 'Major / Subject', key: 'major', icon: Briefcase },
                    ].map(({ label, key, icon: Icon, readOnly }) => (
                      <div key={key}>
                        <label className={labelCls}>{label}</label>
                        <div className="relative">
                          {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                          <input type="text" value={profileData[key] || ''} onChange={e => !readOnly && setProfileData({ ...profileData, [key]: e.target.value })}
                            readOnly={readOnly}
                            className={`${fieldCls} ${Icon ? 'pl-10' : ''} ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className={labelCls}>Bio</label>
                    <textarea value={profileData.bio || ''} onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Tell others about yourself..." rows={3}
                      className={`${fieldCls} resize-none`} />
                  </div>
                  <div className="flex justify-end mt-5">
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50">
                      <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Account ── */}
            {activeSection === 'account' && (
              <div className={cardCls}>
                <h3 className={`font-extrabold text-base mb-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Account Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className={`${fieldCls} pl-10`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" value={profileData.email} readOnly className={`${fieldCls} pl-10 opacity-60 cursor-not-allowed`} />
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Email cannot be changed from here. Contact support.</p>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50">
                      <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Security ── */}
            {activeSection === 'security' && (
              <div className={cardCls}>
                <h3 className={`font-extrabold text-base mb-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Change Password</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Current Password', key: 'currentPassword', show: showCurrentPassword, toggle: () => setShowCurrentPassword(v => !v) },
                    { label: 'New Password', key: 'newPassword', show: showNewPassword, toggle: () => setShowNewPassword(v => !v) },
                    { label: 'Confirm New Password', key: 'confirmPassword', show: showConfirmPassword, toggle: () => setShowConfirmPassword(v => !v) },
                  ].map(({ label, key, show, toggle }) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type={show ? 'text' : 'password'} value={passwordData[key]} onChange={e => setPasswordData({ ...passwordData, [key]: e.target.value })}
                          className={`${fieldCls} pl-10 pr-11`} />
                        <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <button onClick={handlePasswordChange} disabled={savingPassword}
                      className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50">
                      <Lock className="w-4 h-4" /> {savingPassword ? 'Updating…' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Privacy ── */}
            {activeSection === 'privacy' && (
              <div className={cardCls}>
                <h3 className={`font-extrabold text-base mb-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Privacy Controls</h3>
                <p className={`text-sm mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Control what other users can see on your profile</p>
                <div className="space-y-4">
                  {[
                    { key: 'showEmail', label: 'Show Email Address' },
                    { key: 'showPhone', label: 'Show Phone Number' },
                    { key: 'showLocation', label: 'Show Location' },
                    { key: 'showUniversity', label: 'Show University' },
                    { key: 'showBio', label: 'Show Bio' },
                  ].map(({ key, label }) => (
                    <div key={key} className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-amber-50'}`}>
                      <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{label}</span>
                      <ToggleSwitch checked={privacySettings[key]} onChange={() => setPrivacySettings({ ...privacySettings, [key]: !privacySettings[key] })} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-5">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Appearance ── */}
            {activeSection === 'appearance' && (
              <div className="space-y-5">
                <div className={cardCls}>
                  <h3 className={`font-extrabold text-base mb-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: Sun, preview: 'bg-amber-50 border-amber-200' },
                      { value: 'dark', label: 'Dark', icon: Moon, preview: 'bg-slate-800 border-slate-600' },
                      { value: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-amber-50 to-slate-700 border-slate-400' },
                    ].map(({ value, label, icon: Icon, preview }) => {
                      const isActive = theme === value;
                      return (
                        <button key={value} onClick={() => setTheme(value)}
                          className={`relative p-4 rounded-2xl border-2 text-center transition-all ${isActive ? 'border-blue-600 shadow-paper-md' : (isDark ? 'border-slate-700 hover:border-slate-600' : 'border-amber-200 hover:border-slate-300')}`}>
                          {isActive && <span className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></span>}
                          <div className={`w-full h-10 rounded-xl border mb-2 ${preview}`} />
                          <div className="flex items-center justify-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
                            <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={cardCls}>
                  <h3 className={`font-extrabold text-base mb-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Text Size</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'small', label: 'Small', sample: 'Aa', size: 'text-sm' },
                      { value: 'medium', label: 'Medium', sample: 'Aa', size: 'text-base' },
                      { value: 'large', label: 'Large', sample: 'Aa', size: 'text-lg' },
                    ].map(({ value, label, sample, size }) => {
                      const isActive = fontSize === value;
                      return (
                        <button key={value} onClick={() => setFontSize(value)}
                          className={`p-4 rounded-2xl border-2 text-center transition-all ${isActive ? 'border-blue-600 shadow-paper-md' : (isDark ? 'border-slate-700 hover:border-slate-600' : 'border-amber-200 hover:border-slate-300')}`}>
                          {isActive && <Check className={`w-3.5 h-3.5 text-blue-600 mx-auto mb-1`} />}
                          <p className={`font-extrabold ${size} ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{sample}</p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                        </button>
                      );
                    })}
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
