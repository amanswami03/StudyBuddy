import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, BookOpen, MessageSquare, Award, TrendingUp, CheckCircle, ArrowRight, Play, Zap, Globe, Shield, Star } from 'lucide-react';

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
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Intelligent Scheduling',
      description: 'Collaborative time-finding with voting system. Seamlessly syncs with Google Calendar.',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Computer Science Student, MIT',
      image: 'SC',
      text: 'StudyBuddy transformed my study habits. I went from studying alone to leading a group of 12 students. My grades improved by 25%!',
      rating: 5
    },
    {
      name: 'Marcus Johnson',
      role: 'MBA Candidate, Stanford',
      image: 'MJ',
      text: 'The scheduling feature is a game-changer. Finding time with 8 busy professionals was impossible before StudyBuddy.',
      rating: 5
    },
    {
      name: 'Priya Sharma',
      role: 'Medical Student, Johns Hopkins',
      image: 'PS',
      text: 'The resource sharing and collaborative tools helped our group ace anatomy. We\'re all in the top 10% now.',
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      features: ['Up to 3 study groups', 'Basic scheduling', 'Group chat', '5GB storage', 'Community support'],
      popular: false
    },
    {
      name: 'Pro',
      price: '$9.99',
      features: ['Unlimited study groups', 'Advanced scheduling with AI', 'Video conferencing', '100GB storage', 'Priority support', 'Analytics dashboard'],
      popular: true
    },
    {
      name: 'Team',
      price: '$29.99',
      features: ['Everything in Pro', 'Custom branding', 'Admin controls', 'Unlimited storage', 'Dedicated support', 'API access'],
      popular: false
    }
  ];

  return (
  <div className="min-h-screen w-full overflow-hidden-safe text-white bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/90 backdrop-blur-lg border-b border-slate-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold">StudyBuddy</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">How It Works</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">Pricing</a>
              <a href="#testimonials" className="text-slate-300 hover:text-white transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth?mode=signin" className="text-slate-300 hover:text-white transition-colors">Sign In</Link>
              <Link to="/auth?mode=signup" className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* reduced negative offsets to avoid overflow on very wide screens; parent clips anything remaining */}
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2 mb-8">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">Trusted by 50,000+ students worldwide</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              Study Smarter,
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                Together
              </span>
            </h1>
            
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Join peer-powered study groups that boost your learning by 60%. Schedule sessions, share resources, and achieve your academic goals with StudyBuddy.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to="/auth?mode=signup" className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all flex items-center gap-2 text-lg font-semibold">
                Start Learning Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-slate-800">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text"> Excel</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Powerful features designed to make collaborative learning seamless and effective
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-slate-400">Get started in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create or Join', desc: 'Start a new study group or browse existing ones by subject and topic', icon: <Users /> },
              { step: '02', title: 'Schedule Together', desc: 'Propose times and vote with your group to find the perfect study slot', icon: <Calendar /> },
              { step: '03', title: 'Study & Succeed', desc: 'Attend sessions, share resources, and track your progress together', icon: <TrendingUp /> }
            ].map((item, index) => (
              <div key={index} className="relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 -z-10"></div>
                )}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-slate-700 transition-all">
                  <div className="text-6xl font-bold text-slate-800 mb-4">{item.step}</div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Loved by Students</h2>
            <p className="text-xl text-slate-400">See what our community has to say</p>
          </div>

          <div className="relative">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 md:p-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold mb-6">
                  {testimonials[activeTestimonial].image}
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-xl text-slate-300 mb-6 max-w-2xl italic">
                  "{testimonials[activeTestimonial].text}"
                </p>
                <p className="font-bold text-lg">{testimonials[activeTestimonial].name}</p>
                <p className="text-slate-400">{testimonials[activeTestimonial].role}</p>
              </div>
            </div>

            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === activeTestimonial ? 'bg-blue-500 w-8' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of students who are already studying smarter
            </p>
            <Link to="/auth?mode=signup" className="inline-block bg-white text-blue-600 px-8 py-4 rounded-xl hover:shadow-2xl transition-all text-lg font-semibold">
              Start Free Today
              <ArrowRight className="inline w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold">StudyBuddy</span>
              </div>
              <p className="text-slate-400 text-sm">
                Empowering students through collaborative learning
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>© 2025 StudyBuddy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;