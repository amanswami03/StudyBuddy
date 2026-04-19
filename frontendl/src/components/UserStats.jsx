import React, { useEffect, useState } from 'react';
import { Award, TrendingUp, Zap, Trophy, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const RANK_COLORS = {
  Legend:        { strip: '#9f1239', badge: 'bg-rose-100 text-rose-800' },
  'Elite Member':{ strip: '#6b21a8', badge: 'bg-purple-100 text-purple-800' },
  Mentor:        { strip: '#1d4ed8', badge: 'bg-blue-100 text-blue-800' },
  Contributor:   { strip: '#065f46', badge: 'bg-emerald-100 text-emerald-800' },
  Active:        { strip: '#92400e', badge: 'bg-amber-100 text-amber-800' },
};

export default function UserStats() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState(null);
  const [rankThresholds, setRankThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, ranksRes] = await Promise.all([
          fetch(`${API_BASE}/api/user/stats`),
          fetch(`${API_BASE}/api/ranks`)
        ]);
        if (!statsRes.ok || !ranksRes.ok) throw new Error('Failed to fetch stats');
        setStats(await statsRes.json());
        setRankThresholds(await ranksRes.json());
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
      <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading stats…</span>
    </div>
  );

  if (error) return <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>;
  if (!stats) return null;

  const currentRankInfo = rankThresholds.find(r => r.rank_name === stats.current_rank);
  const nextRankInfo = rankThresholds.find(r => r.points_required > stats.total_points);
  const rankColor = RANK_COLORS[stats.current_rank] || { strip: '#475569', badge: 'bg-slate-100 text-slate-600' };
  const cardBase = `rounded-2xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100'}`;

  return (
    <div className="space-y-4 p-5">
      {/* Rank card */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${rankColor.strip} 0%, ${rankColor.strip}aa 100%)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent,transparent 15px,rgba(255,255,255,0.05) 15px,rgba(255,255,255,0.05) 16px)', backgroundSize: '100% 16px' }}/>
        <div className="relative z-10">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Current Rank</p>
          <h2 className="text-2xl font-extrabold">{currentRankInfo?.badge_emoji} {stats.current_rank}</h2>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-4xl font-extrabold">{stats.total_points.toLocaleString()}</span>
            <span className="text-white/70 text-sm mb-1">pts</span>
          </div>
          <p className="text-white/60 text-xs mt-1">Level {currentRankInfo?.display_order} of {rankThresholds.length}</p>
        </div>
      </div>

      {/* Progress bar */}
      {nextRankInfo && (
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Next: {nextRankInfo.rank_name}</span>
            </div>
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{stats.points_to_next} pts to go</span>
          </div>
          <div className={`w-full rounded-full h-2.5 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-amber-100'}`}>
            <div className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${stats.progress_to_next}%` }} />
          </div>
          <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stats.progress_to_next}% complete</p>
        </div>
      )}

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Clock, label: 'Login Streak', value: stats.login_streak, unit: 'days', color: 'text-orange-600', bg: 'bg-orange-50' },
          { icon: Zap, label: 'Today', value: '+3', unit: 'actions', color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: Trophy, label: 'Level', value: currentRankInfo?.display_order, unit: `of ${rankThresholds.length}`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ icon: Icon, label, value, unit, color, bg }) => (
          <div key={label} className={cardBase + ' text-center'}>
            <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{value}</p>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{unit}</p>
          </div>
        ))}
      </div>

      {/* Rank progression */}
      <div className={cardBase}>
        <h3 className={`flex items-center gap-2 font-extrabold text-sm mb-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          <Award className="w-4 h-4 text-blue-600" /> Rank Progression
        </h3>
        <div className="space-y-2">
          {rankThresholds.map(rank => {
            const isReached = stats.total_points >= rank.points_required;
            const isCurrent = rank.rank_name === stats.current_rank;
            const rc = RANK_COLORS[rank.rank_name] || { strip: '#475569', badge: 'bg-slate-100 text-slate-600' };
            return (
              <div key={rank.rank_name}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  isCurrent ? 'border-blue-500 bg-blue-50' : isReached ? (isDark ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50') : (isDark ? 'border-slate-700 bg-slate-800/50' : 'border-amber-100 bg-amber-50/50')
                }`}>
                <span className="text-xl flex-shrink-0">{rank.badge_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${isCurrent ? 'text-blue-700' : isReached ? 'text-emerald-700' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{rank.rank_name}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{rank.points_required.toLocaleString()}+ pts</p>
                </div>
                {isCurrent && <span className="subject-tab bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">Current</span>}
                {isReached && !isCurrent && <span className="subject-tab bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tip */}
      <div className={`p-3.5 rounded-xl border text-xs ${isDark ? 'bg-blue-900/20 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
        💡 <strong>Pro tip:</strong> Share resources, help others, and maintain your login streak to earn more points!
      </div>
    </div>
  );
}
