import React, { useEffect, useMemo, useState } from 'react';
import { getProfile } from './utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Users, Mail, Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Sparkles, TrendingUp, Award, GraduationCap, PenLine } from 'lucide-react';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const stateMode = location.state && location.state.mode;
    if (stateMode) { setIsLogin(stateMode === 'signin'); return; }
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode) setIsLogin(mode === 'signin');
  }, [location]);

  const resetForm = () => {
    setFormData({ name: '', username: '', email: '', password: '', confirmPassword: '' });
    setShowPassword(false);
    setError('');
  };

  const toggleForm = () => { setIsLogin(v => !v); setSuccess(''); resetForm(); };
  const handleChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const emailValid = useMemo(() => {
    if (!formData.email) return false;
    return /\S+@\S+\.\S+/.test(formData.email.trim());
  }, [formData.email]);

  const passwordStrength = useMemo(() => {
    const p = formData.password || '';
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 4);
  }, [formData.password]);

  const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength] || 'Too weak';
  const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-500', 'bg-emerald-500'];
  const strengthColor = strengthColors[passwordStrength] || 'bg-red-400';

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3500);
    return () => clearTimeout(t);
  }, [success]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!emailValid) { setError('Please enter a valid email address.'); return; }
    if (!isLogin) {
      if (!formData.name.trim()) { setError('Please enter your full name.'); return; }
      if (!formData.username.trim()) { setError('Please enter a username (letters, numbers, underscores only).'); return; }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username.trim())) { setError('Username must be 3-20 characters, letters, numbers, and underscores only.'); return; }
      if (!acceptTerms) { setError('Please accept the Terms to continue.'); return; }
      if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }
      if (passwordStrength < 2) { setError('Please choose a stronger password.'); return; }
    }
    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    try {
      if (isLogin) {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        if (!res.ok) { setError((await res.text()) || 'Login failed'); setLoading(false); return; }
        const data = await res.json();
        if (data && data.token) {
          localStorage.setItem('sb_token', data.token);
          localStorage.setItem('sb_email', formData.email);
          try {
            const profile = await getProfile();
            if (profile && profile.username) localStorage.setItem('sb_username', profile.username);
            if (profile && profile.id) localStorage.setItem('sb_user_id', String(profile.id));
          } catch (e) {}
          setSuccess('Login successful! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 700);
        } else {
          setError('Invalid server response');
        }
      } else {
        const res = await fetch(`${API_BASE}/api/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: formData.username, email: formData.email, password: formData.password })
        });
        if (res.status === 201) {
          localStorage.setItem('sb_username', formData.username);
          localStorage.setItem('sb_email', formData.email);
          setIsLogin(true);
          setSuccess('Account created! Please sign in.');
          setFormData(p => ({ ...p, password: '', confirmPassword: '' }));
        } else if (res.status === 409) {
          setError((await res.text()) || 'Account already exists');
        } else {
          setError((await res.text()) || 'Signup failed');
        }
      }
    } catch (err) {
      setError('Network or server error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all
    bg-white border-amber-200 text-slate-800 placeholder-slate-400
    focus:border-blue-500 focus:ring-2 focus:ring-blue-100`;

  const perks = [
    { icon: <Users className="w-5 h-5" />, text: 'Study with peers who match your pace', color: 'text-blue-600 bg-blue-50' },
    { icon: <Award className="w-5 h-5" />, text: 'Earn streaks and track your progress', color: 'text-amber-600 bg-amber-50' },
    { icon: <TrendingUp className="w-5 h-5" />, text: 'Improve grades with group accountability', color: 'text-emerald-600 bg-emerald-50' },
    { icon: <Sparkles className="w-5 h-5" />, text: 'AI-powered scheduling and group matching', color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page-bg, #fef8ec)' }}>

      {/* ── Left panel (desktop) ──────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[46%] relative overflow-hidden p-12"
        style={{ background: 'linear-gradient(145deg, #1e1b5e 0%, #1d4ed8 60%, #0284c7 100%)' }}>
        {/* Notebook lines overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 35px, rgba(255,255,255,0.06) 35px, rgba(255,255,255,0.06) 36px)',
          backgroundSize: '100% 36px',
        }}/>
        {/* Margin line */}
        <div className="absolute top-0 bottom-0 left-16 w-px bg-white/10" />
        {/* Decorative circle blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-blue-400/10 blur-2xl" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">StudyBuddy</h1>
              <p className="text-blue-200 text-xs flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3" /> Your learning companion
              </p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Learn better,<br/>
            <span className="text-blue-200">together</span>
          </h2>
          <p className="text-blue-100 text-base leading-relaxed mb-10 max-w-xs">
            Join a community of students who collaborate, motivate each other, and achieve more.
          </p>

          {/* Perks list */}
          <div className="space-y-4">
            {perks.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${p.color}`}>
                  {p.icon}
                </div>
                <p className="text-blue-100 text-sm">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 mt-auto pt-10 border-t border-white/10">
          <p className="text-blue-100 text-sm italic leading-relaxed">
            "StudyBuddy helped our group go from struggling to top of the class in one semester."
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">PS</div>
            <div>
              <p className="text-white text-xs font-semibold">Priya Sharma</p>
              <p className="text-blue-300 text-xs">Medical Student, Johns Hopkins</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-blue-900">StudyBuddy</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold" style={{ color: 'var(--ink-900, #1a1f4e)' }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              {isLogin ? 'Sign in to your StudyBuddy account' : 'Join thousands of students studying smarter'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input name="name" value={formData.name} onChange={handleChange}
                  placeholder="Full name" className={inputCls} autoComplete="name" />
              </div>
            )}

            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input name="username" value={formData.username} onChange={handleChange}
                  placeholder="Username (no spaces)" className={inputCls} autoComplete="username" />
                {formData.username && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${/^[a-zA-Z0-9_]{3,20}$/.test(formData.username) ? 'text-emerald-500' : 'text-red-400'}`}>
                    {/^[a-zA-Z0-9_]{3,20}$/.test(formData.username) ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </span>
                )}
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input name="email" type="email" value={formData.email} onChange={handleChange}
                placeholder="Email address" className={inputCls} autoComplete="email" />
              {formData.email && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${emailValid ? 'text-emerald-500' : 'text-red-400'}`}>
                  {emailValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                </span>
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input name="password" type={showPassword ? 'text' : 'password'}
                value={formData.password} onChange={handleChange}
                placeholder="Password" className={`${inputCls} pr-11`} autoComplete={isLogin ? 'current-password' : 'new-password'} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Forgot Password Link - Only show during login */}
            {isLogin && (
              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-semibold">
                  Forgot password?
                </a>
              </div>
            )}

            {/* Password strength */}
            {!isLogin && formData.password && (
              <div>
                <div className="flex gap-1 mb-1">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < passwordStrength ? strengthColor : 'bg-slate-200'}`} />
                  ))}
                </div>
                <p className={`text-xs ${passwordStrength >= 3 ? 'text-emerald-600' : 'text-slate-500'}`}>{strengthLabel}</p>
              </div>
            )}

            {!isLogin && (
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input name="confirmPassword" type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Confirm password" className={inputCls} autoComplete="new-password" />
              </div>
            )}

            {!isLogin && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-amber-200 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-slate-500">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                </span>
              </label>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-slate-500 mt-6">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button onClick={toggleForm} className="text-blue-700 hover:text-blue-800 font-semibold">
              {isLogin ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
