import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, BookOpen, Award, TrendingUp, ArrowRight, Zap, Star, PenLine, Clock, Bookmark, GraduationCap, Target, BarChart2 } from 'lucide-react';

const HomePage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { value: '50K+', label: 'Active Students' },
    { value: '15K+', label: 'Study Groups' },
    { value: '100K+', label: 'Sessions Completed' },
    { value: '95%', label: 'Success Rate' }
  ];

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Smart Group Matching',
      description: 'AI-powered algorithm connects you with peers who share your learning goals and schedule.',
      subject: 'Social',
      subjectColor: 'bg-blue-100 text-blue-800',
      strip: '#1d4ed8',
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Intelligent Scheduling',
      description: 'Collaborative time-finding with voting system. Seamlessly syncs with Google Calendar.',
      subject: 'Planning',
      subjectColor: 'bg-emerald-100 text-emerald-800',
      strip: '#065f46',
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Resource Library',
      description: 'Share notes, flashcards, past papers and study guides all in one organised space.',
      subject: 'Resources',
      subjectColor: 'bg-amber-100 text-amber-800',
      strip: '#92400e',
    },
    {
      icon: <BarChart2 className="w-6 h-6" />,
      title: 'Progress Tracking',
      description: 'Visual dashboards for your study hours, streaks, and group contributions.',
      subject: 'Analytics',
      subjectColor: 'bg-purple-100 text-purple-800',
      strip: '#6b21a8',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Computer Science · MIT',
      initials: 'SC',
      color: 'from-blue-600 to-indigo-600',
      text: 'StudyBuddy transformed my study habits. I went from studying alone to leading a group of 12 students. My grades improved by 25%!',
      rating: 5,
    },
    {
      name: 'Marcus Johnson',
      role: 'MBA Candidate · Stanford',
      initials: 'MJ',
      color: 'from-emerald-600 to-teal-600',
      text: 'The scheduling feature is a game-changer. Finding time with 8 busy professionals was impossible before StudyBuddy.',
      rating: 5,
    },
    {
      name: 'Priya Sharma',
      role: 'Medical Student · Johns Hopkins',
      initials: 'PS',
      color: 'from-rose-600 to-pink-600',
      text: "The resource sharing and collaborative tools helped our group ace anatomy. We're all in the top 10% now.",
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      features: ['Up to 3 study groups', 'Basic scheduling', 'Group chat', '5GB storage', 'Community support'],
      popular: false,
      color: 'border-slate-200',
    },
    {
      name: 'Pro',
      price: '$9.99',
      features: ['Unlimited study groups', 'Advanced scheduling with AI', 'Video conferencing', '100GB storage', 'Priority support', 'Analytics dashboard'],
      popular: true,
      color: 'border-blue-500',
    },
    {
      name: 'Team',
      price: '$29.99',
      features: ['Everything in Pro', 'Custom branding', 'Admin controls', 'Unlimited storage', 'Dedicated support', 'API access'],
      popular: false,
      color: 'border-slate-200',
    },
  ];

  return (
    <div className="min-h-screen w-full overflow-hidden-safe" style={{ background: 'var(--page-bg)', color: 'var(--text-primary)' }}>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-lg shadow-sm border-b border-amber-100'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--ink-900)' }}>
                StudyBuddy
              </span>
            </div>

            {/* Links */}
            <div className="hidden md:flex items-center gap-8">
              {['Features','How It Works','Testimonials'].map(l => (
                <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`}
                  className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
                  {l}
                </a>
              ))}
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              <Link to="/auth?mode=signin"
                className="hidden sm:inline text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
                Sign In
              </Link>
              <Link to="/auth?mode=signup"
                className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md">
                Get Started →
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Decorative ruled lines in background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 35px, rgba(184,152,100,0.12) 35px, rgba(184,152,100,0.12) 36px)',
          backgroundSize: '100% 36px',
        }}/>
        {/* Soft amber glow blobs */}
        <div className="absolute top-10 -left-20 w-72 h-72 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-20 w-72 h-72 rounded-full bg-blue-200/30 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 mb-8">
            <Zap className="w-3.5 h-3.5" />
            Trusted by 50,000+ students worldwide
          </span>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.08] tracking-tight" style={{ color: 'var(--ink-900)' }}>
            Study Smarter,
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-blue-700">Together</span>
              {/* Hand-drawn underline effect */}
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 300 8" preserveAspectRatio="none">
                <path d="M2,6 Q75,1 150,5 Q225,9 298,3" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join peer-powered study groups that boost your learning by 60%. Schedule sessions, share resources, and achieve your academic goals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link to="/auth?mode=signup"
              className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-base">
              Start Learning Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/auth?mode=signin"
              className="border border-slate-300 hover:border-blue-400 text-slate-700 hover:text-blue-700 px-8 py-4 rounded-xl font-semibold transition-all text-base">
              Sign In
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-amber-200">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold text-blue-700">{s.value}</p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6" style={{ background: 'var(--page-bg-alt, #f9f3e3)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="subject-tab bg-blue-100 text-blue-800 mb-4 inline-flex">Core Features</span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
              Everything you need to <span className="text-blue-700">excel</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">Powerful tools designed to make collaborative learning seamless and effective</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className="notebook-card p-7 group hover:shadow-paper-md transition-all"
                style={{ '--strip-color': f.strip }}>
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: f.strip + '18', color: f.strip }}>
                    {f.icon}
                  </div>
                  <div>
                    <span className={`subject-tab ${f.subjectColor} mb-2`}>{f.subject}</span>
                    <h3 className="text-xl font-bold mb-2 mt-1" style={{ color: 'var(--ink-900)' }}>{f.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">{f.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: 'var(--page-bg)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="subject-tab bg-emerald-100 text-emerald-800 mb-4 inline-flex">Process</span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
              How it works
            </h2>
            <p className="text-slate-500 mt-4">Get started in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting dashed line */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 border-t-2 border-dashed border-amber-300 z-0" />

            {[
              { step: '01', title: 'Create or Join', desc: 'Start a new study group or browse existing ones by subject and topic', icon: <Users className="w-6 h-6" />, color: '#1d4ed8' },
              { step: '02', title: 'Schedule Together', desc: 'Propose times and vote with your group to find the perfect study slot', icon: <Calendar className="w-6 h-6" />, color: '#065f46' },
              { step: '03', title: 'Study & Succeed', desc: 'Attend sessions, share resources, and track your progress together', icon: <TrendingUp className="w-6 h-6" />, color: '#6b21a8' },
            ].map((item, idx) => (
              <div key={idx} className="notebook-card p-8 text-center relative z-10 no-strip">
                {/* Big step number */}
                <p className="text-7xl font-extrabold mb-4 leading-none"
                  style={{ color: item.color + '20', fontVariantNumeric: 'oldstyle-nums' }}>
                  {item.step}
                </p>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: item.color + '15', color: item.color }}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ink-900)' }}>{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6" style={{ background: 'var(--page-bg-alt, #f9f3e3)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="subject-tab bg-rose-100 text-rose-800 mb-4 inline-flex">Reviews</span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
              Loved by students
            </h2>
          </div>

          <div className="notebook-card no-strip p-10 md:p-14">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${testimonials[activeTestimonial].color} flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-md`}>
                {testimonials[activeTestimonial].initials}
              </div>
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              {/* Quote */}
              <blockquote className="text-xl text-slate-700 italic leading-relaxed mb-6 max-w-2xl">
                "{testimonials[activeTestimonial].text}"
              </blockquote>
              <p className="font-bold text-base" style={{ color: 'var(--ink-900)' }}>{testimonials[activeTestimonial].name}</p>
              <p className="text-sm text-slate-500 mt-0.5">{testimonials[activeTestimonial].role}</p>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === activeTestimonial ? 'w-8 bg-blue-700' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                }`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6" style={{ background: 'var(--page-bg)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="subject-tab bg-indigo-100 text-indigo-800 mb-4 inline-flex">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
              Choose your plan
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, i) => (
              <div key={i} className={`notebook-card no-strip p-8 relative ${plan.popular ? 'ring-2 ring-blue-600 shadow-paper-md' : ''}`}>
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-700 text-white text-xs font-bold rounded-full shadow">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--ink-900)' }}>{plan.name}</h3>
                <p className="text-4xl font-extrabold text-blue-700 mb-1">{plan.price}<span className="text-base font-medium text-slate-400">/mo</span></p>
                <hr className="border-amber-200 my-5" />
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-2.5 h-2.5 text-emerald-600" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth?mode=signup"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'bg-blue-700 hover:bg-blue-800 text-white shadow-sm hover:shadow-md'
                      : 'border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-700'
                  }`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'var(--page-bg-alt, #f9f3e3)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="notebook-card no-strip p-14 relative overflow-hidden">
            {/* Subtle ruled lines on CTA card */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(184,152,100,0.15) 27px, rgba(184,152,100,0.15) 28px)',
              backgroundSize: '100% 28px',
            }}/>
            <GraduationCap className="w-12 h-12 text-blue-600 mx-auto mb-6 relative z-10" />
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 relative z-10" style={{ color: 'var(--ink-900)' }}>
              Ready to transform<br />your learning?
            </h2>
            <p className="text-slate-500 mb-8 relative z-10">
              Join thousands of students who are already studying smarter
            </p>
            <Link to="/auth?mode=signup"
              className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-10 py-4 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all relative z-10">
              Start Free Today <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-amber-200 py-14 px-6" style={{ background: 'var(--page-bg)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-700 to-indigo-700 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-base" style={{ color: 'var(--ink-900)' }}>StudyBuddy</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Empowering students through collaborative learning
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Security'] },
              { title: 'Company',  links: ['About', 'Blog', 'Careers'] },
              { title: 'Legal',    links: ['Privacy', 'Terms', 'Contact'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4" style={{ color: 'var(--ink-900)' }}>{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-sm text-slate-500 hover:text-blue-700 transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-amber-200 pt-6 text-center">
            <p className="text-sm text-slate-400">© 2025 StudyBuddy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
