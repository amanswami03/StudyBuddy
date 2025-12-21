import React, { useEffect, useMemo, useState } from 'react';
import { getProfile } from './utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Users, Mail, Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Sparkles, TrendingUp, Award } from 'lucide-react';

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
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Initialize mode from location state or query param
  useEffect(() => {
    const stateMode = location.state && location.state.mode;
    if (stateMode) {
      setIsLogin(stateMode === 'signin');
      return;
    }
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode) setIsLogin(mode === 'signin');
  }, [location]);

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setShowPassword(false);
    setError('');
  };

  const toggleForm = () => {
    setIsLogin((v) => !v);
    setSuccess('');
    resetForm();
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

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
  const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-600'][passwordStrength] || 'bg-red-500';

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3500);
    return () => clearTimeout(t);
  }, [success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isLogin) {
      if (!formData.name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!acceptTerms) {
        setError('Please accept the Terms to continue.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (passwordStrength < 2) {
        setError('Please choose a stronger password.');
        return;
      }
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

        if (!res.ok) {
          const text = await res.text();
          setError(text || 'Login failed');
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data && data.token) {
          // store token and navigate to dashboard
          localStorage.setItem('sb_token', data.token);
          localStorage.setItem('sb_email', formData.email);  // Store email
          // fetch profile and store username and user_id for UI
          try {
            const profile = await getProfile();
            if (profile && profile.username) localStorage.setItem('sb_username', profile.username);
            if (profile && profile.id) localStorage.setItem('sb_user_id', String(profile.id));
          } catch (e) {
            // ignore - will use cached email from login
          }
          setSuccess('Login successful! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 700);
        } else {
          setError('Invalid server response');
        }
      } else {
        const res = await fetch(`${API_BASE}/api/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: formData.name, email: formData.email, password: formData.password })
        });

        if (res.status === 201) {
          // Store signup info for later use
          localStorage.setItem('sb_username', formData.name);
          localStorage.setItem('sb_email', formData.email);
          setIsLogin(true);
          setSuccess('Account created! Please sign in.');
          setFormData((p) => ({ ...p, password: '', confirmPassword: '' }));
        } else if (res.status === 409) {
          const text = await res.text();
          setError(text || 'Account already exists');
        } else {
          const text = await res.text();
          setError(text || 'Signup failed');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Network or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-black/10 blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-300/10 blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Left panel - Enhanced */}
        <div className="hidden lg:flex flex-col justify-between bg-white/10 backdrop-blur-xl rounded-3xl p-10 text-white shadow-2xl border border-white/20">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-gradient-to-br from-white to-indigo-100 rounded-2xl p-3 shadow-lg">
                <BookOpen className="w-9 h-9 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">StudyBuddy</h1>
                <p className="text-xs text-indigo-100 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Your learning companion
                </p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Learn together,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
                achieve more
              </span>
            </h2>
            
            <p className="text-lg text-indigo-100 mb-8">
              Join thousands of students collaborating, sharing knowledge, and reaching their academic goals together.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-center">
                <div className="text-2xl font-bold">10K+</div>
                <div className="text-xs text-indigo-200">Students</div>
              </div>
              <div className="text-center border-l border-r border-white/20">
                <div className="text-2xl font-bold">500+</div>
                <div className="text-xs text-indigo-200">Study Groups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">95%</div>
                <div className="text-xs text-indigo-200">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
              <div className="bg-emerald-400/20 rounded-lg p-2">
                <Users className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Study Groups</h3>
                <p className="text-sm text-indigo-100 leading-relaxed">Connect with peers who share your courses and learning goals</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
              <div className="bg-blue-400/20 rounded-lg p-2">
                <TrendingUp className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Track Your Progress</h3>
                <p className="text-sm text-indigo-100 leading-relaxed">Visualize your learning journey with detailed analytics</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
              <div className="bg-purple-400/20 rounded-lg p-2">
                <Award className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Gamified Learning</h3>
                <p className="text-sm text-indigo-100 leading-relaxed">Earn badges and rewards as you achieve milestones</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Card - Enhanced */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 relative overflow-hidden">
          {/* Decorative corner gradient */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            {/* Success banner */}
            {success && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-emerald-700 border border-emerald-200 shadow-sm" role="status" aria-live="polite">
                <div className="bg-emerald-500 rounded-full p-1">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium flex-1">{success}</span>
              </div>
            )}
            
            {/* Error banner */}
            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 p-4 text-red-700 border border-red-200 shadow-sm" role="alert" aria-live="assertive">
                <div className="bg-red-500 rounded-full p-1">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium flex-1">{error}</span>
              </div>
            )}

            {/* Header */}
            <div className="mb-8">
              {/* Mobile logo */}
              <div className="flex lg:hidden items-center gap-2 mb-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-2">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-800">StudyBuddy</h1>
              </div>

              <div className="flex rounded-xl overflow-hidden mb-6 border-2 border-gray-200 bg-gray-50 p-1">
                <button
                  onClick={() => { if (!isLogin) { setIsLogin(true); setError(''); setSuccess(''); } }}
                  className={`flex-1 py-3 text-center font-semibold text-sm transition-all rounded-lg ${
                    isLogin ? 'bg-white text-indigo-700 shadow-md' : 'text-gray-600 hover:text-gray-800'
                  }`}
                  aria-pressed={isLogin}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { if (isLogin) { setIsLogin(false); setError(''); setSuccess(''); } }}
                  className={`flex-1 py-3 text-center font-semibold text-sm transition-all rounded-lg ${
                    !isLogin ? 'bg-white text-indigo-700 shadow-md' : 'text-gray-600 hover:text-gray-800'
                  }`}
                  aria-pressed={!isLogin}
                >
                  Sign Up
                </button>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isLogin ? 'Welcome back!' : 'Get started'}
              </h2>
              <p className="text-gray-600">
                {isLogin ? 'Continue your learning journey' : 'Join StudyBuddy and start collaborating'}
              </p>
            </div>

            <div className="space-y-5">
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400"
                      placeholder="Enter your full name"
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 ${
                      formData.email && !emailValid ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                    }`}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    aria-invalid={!!(formData.email && !emailValid)}
                  />
                </div>
                {formData.email && !emailValid && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Enter a valid email address
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isLogin && formData.password && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span className="font-medium">Strength: <span className={strengthColor.replace('bg-', 'text-')}>{strengthLabel}</span></span>
                      <span className="text-gray-400">{(formData.password || '').length}/64</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${(passwordStrength/4)*100}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 ${
                        formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                      }`}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Passwords do not match
                    </p>
                  )}
                </div>
              )}

              {isLogin ? (
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer group">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="group-hover:text-gray-900 transition">Remember me</span>
                  </label>
                  <button type="button" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition">
                    Forgot password?
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-start gap-3 text-sm text-gray-700 select-none cursor-pointer group">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                  />
                  <span className="group-hover:text-gray-900 transition leading-relaxed">
                    I agree to the <button type="button" className="text-indigo-600 hover:text-indigo-700 font-semibold">Terms of Service</button> and <button type="button" className="text-indigo-600 hover:text-indigo-700 font-semibold">Privacy Policy</button>
                  </span>
                </label>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                aria-busy={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-base hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLogin ? (loading ? 'Signing in...' : 'Sign In') : (loading ? 'Creating account...' : 'Create Account')}
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
              </div>
            </div>

            {/* Social login */}
            <button
              type="button"
              className="w-full relative flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3.5 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow"
              aria-label="Sign in with Google"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={toggleForm}
                  className="text-indigo-600 hover:text-indigo-700 font-bold transition"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
