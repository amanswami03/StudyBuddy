import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, Plus, BookOpen, ArrowLeft } from 'lucide-react';
import { getUserUpcomingSessions } from './utils/api';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';

export default function Calendar() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const EVENT_COLORS = ['#1d4ed8','#065f46','#6b21a8','#c2410c','#0e7490','#9f1239','#92400e','#1e3a8a'];

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true); setError('');
        const sessions = await getUserUpcomingSessions();
        setUpcomingSessions(sessions || []);
      } catch (err) {
        setError(err.message || 'Failed to load sessions');
        setUpcomingSessions([]);
      } finally { setLoading(false); }
    };
    loadSessions();
  }, []);

  const events = upcomingSessions.map((session, idx) => {
    const sessionDate = new Date(session.scheduled_time);
    const color = EVENT_COLORS[idx % EVENT_COLORS.length];
    return {
      id: session.id, title: session.title, group: `Group ${session.group_id}`,
      date: sessionDate,
      startTime: sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      endTime: new Date(sessionDate.getTime() + session.duration_minutes * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      attendees: session.attendee_count || 0, duration: session.duration_minutes || 0,
      color, type: 'study', description: session.description, createdByName: session.created_by_name,
    };
  });

  const getDaysInMonth = date => {
    const year = date.getFullYear(), month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= new Date(year, month+1, 0).getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const getEventsForDate = date => {
    if (!date) return [];
    return events.filter(e => e.date.getDate()===date.getDate() && e.date.getMonth()===date.getMonth() && e.date.getFullYear()===date.getFullYear());
  };

  const isToday = date => {
    if (!date) return false;
    const t = new Date();
    return date.getDate()===t.getDate() && date.getMonth()===t.getMonth() && date.getFullYear()===t.getFullYear();
  };

  const days = getDaysInMonth(currentDate);

  const cardBase = `rounded-2xl border ${isDark?'bg-slate-800 border-slate-700':'bg-white border-amber-100'} shadow-paper`;

  return (
    <div className="min-h-screen transition-colors" style={!isDark ? { background: 'var(--page-bg, #fef8ec)' } : { background: '#0f172a' }}>

      {/* Header */}
      <div className={`border-b ${isDark?'bg-slate-900 border-slate-800':'bg-white/90 backdrop-blur border-amber-100'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')}
                className={`p-2 rounded-xl transition-colors ${isDark?'hover:bg-slate-800 text-slate-400':'hover:bg-amber-50 text-slate-500'}`}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className={`text-2xl font-extrabold ${isDark?'text-white':'text-slate-800'}`}>Study Calendar</h1>
                <p className={`text-xs mt-0.5 ${isDark?'text-slate-400':'text-slate-500'}`}>Manage your study sessions</p>
              </div>
            </div>
            <button className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> Schedule Session
            </button>
          </div>

          {/* Calendar controls */}
          <div className="flex items-center justify-between mt-5 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1))}
                className={`p-2 rounded-xl transition-colors ${isDark?'hover:bg-slate-800 text-slate-400':'hover:bg-amber-50 text-slate-600'}`}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className={`text-base font-extrabold min-w-[180px] text-center ${isDark?'text-white':'text-slate-800'}`}>
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1))}
                className={`p-2 rounded-xl transition-colors ${isDark?'hover:bg-slate-800 text-slate-400':'hover:bg-amber-50 text-slate-600'}`}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className={`flex items-center gap-1 rounded-xl p-1 ${isDark?'bg-slate-800':'bg-amber-50'}`}>
              {['month','week','day'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                    view===v ? (isDark?'bg-slate-700 text-white shadow-sm':'bg-white text-slate-800 shadow-sm') : (isDark?'text-slate-400 hover:text-white':'text-slate-500 hover:text-slate-700')
                  }`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Calendar grid */}
          <div className="lg:col-span-3">
            <div className={`rounded-2xl border overflow-hidden ${isDark?'bg-slate-800 border-slate-700':'bg-white border-amber-100'} shadow-paper`}>
              {/* Day headers */}
              <div className={`grid grid-cols-7 border-b ${isDark?'bg-slate-900 border-slate-700':'bg-amber-50 border-amber-100'}`}>
                {daysOfWeek.map(d => (
                  <div key={d} className="p-3 text-center">
                    <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark?'text-slate-400':'text-slate-500'}`}>{d}</span>
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7">
                {days.map((date, idx) => {
                  const dayEvents = getEventsForDate(date);
                  const today = isToday(date);
                  return (
                    <div key={idx} className={`min-h-[100px] p-2 border-r border-b transition-colors ${
                      isDark ? 'border-slate-700' + (date?'':' bg-slate-900') : 'border-amber-50' + (date?'':' bg-amber-50/50')
                    }`}>
                      {date && (
                        <>
                          <div className="flex items-center justify-center mb-1.5">
                            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                              today ? 'bg-blue-700 text-white' : (isDark?'text-slate-300':'text-slate-700')
                            }`}>
                              {date.getDate()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map(ev => (
                              <div key={ev.id} className="text-xs px-1.5 py-0.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity truncate"
                                style={{ background: ev.color + '20', color: ev.color, borderLeft: `2.5px solid ${ev.color}` }}>
                                <p className="font-semibold truncate">{ev.title}</p>
                                <p className="opacity-75">{ev.startTime}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Upcoming sessions */}
            <div className={cardBase + ' p-5'}>
              <h3 className={`font-extrabold text-sm mb-4 flex items-center gap-2 ${isDark?'text-slate-100':'text-slate-800'}`}>
                <CalendarIcon className="w-4 h-4 text-blue-600" /> Upcoming Sessions
              </h3>
              {loading ? (
                <p className={`text-xs ${isDark?'text-slate-400':'text-slate-500'}`}>Loading…</p>
              ) : error ? (
                <p className="text-xs text-red-500">{error}</p>
              ) : events.length === 0 ? (
                <p className={`text-xs ${isDark?'text-slate-500':'text-slate-400'}`}>No upcoming sessions scheduled</p>
              ) : (
                <div className="space-y-4">
                  {events.slice(0, 4).map(ev => (
                    <div key={ev.id} className={`pb-4 border-b last:border-0 last:pb-0 ${isDark?'border-slate-700':'border-amber-50'}`}>
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: ev.color }} />
                        <h4 className={`font-bold text-xs ${isDark?'text-slate-100':'text-slate-800'}`}>{ev.title}</h4>
                      </div>
                      <div className={`space-y-0.5 text-xs ml-4.5 ${isDark?'text-slate-400':'text-slate-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3 h-3" />
                          <span>{ev.date.toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>{ev.startTime} – {ev.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          <span>{ev.attendees} attending</span>
                        </div>
                        {ev.createdByName && <p className="text-slate-400">by {ev.createdByName}</p>}
                      </div>
                      <button className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">View Details →</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* This month stats */}
            <div className="rounded-2xl p-5 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1e1b5e 0%, #1d4ed8 100%)' }}>
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'repeating-linear-gradient(transparent,transparent 27px,rgba(255,255,255,0.06) 27px,rgba(255,255,255,0.06) 28px)',
                backgroundSize: '100% 28px',
              }}/>
              <BookOpen className="absolute right-4 bottom-4 w-14 h-14 text-white/10" />
              <div className="relative z-10">
                <h3 className="font-bold text-sm mb-4">This Month</h3>
                <p className="text-4xl font-extrabold">{events.length}</p>
                <p className="text-blue-200 text-xs mt-1">Sessions Scheduled</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
