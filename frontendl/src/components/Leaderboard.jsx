import React, { useEffect, useState } from 'react';
import { Trophy, Zap, TrendingUp } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const RANK_COLORS = {
  Legend:        '#9f1239',
  'Elite Member':'#6b21a8',
  Mentor:        '#1d4ed8',
  Contributor:   '#065f46',
  Active:        '#92400e',
};

export default function Leaderboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/leaderboard?limit=50`);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        setLeaderboard(await response.json() || []);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
      <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading leaderboard…</span>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
  );

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className={`text-xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Leaderboard</h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Top contributors this month</p>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className={`text-center py-10 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-100'}`}>
          <Trophy className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-amber-300'}`} />
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No users on leaderboard yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Top 3 podium */}
          {leaderboard.slice(0, 3).map((user, i) => {
            const color = RANK_COLORS[user.current_rank] || '#475569';
            return (
              <div key={user.user_id}
                className="flex items-center gap-3 p-4 rounded-2xl text-white relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}>
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent,transparent 15px,rgba(255,255,255,0.05) 15px,rgba(255,255,255,0.05) 16px)', backgroundSize: '100% 16px' }}/>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-lg font-bold relative z-10 flex-shrink-0">
                  {medals[i]}
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <p className="font-extrabold text-sm truncate">{user.username}</p>
                  <p className="text-white/70 text-xs">{user.current_rank}</p>
                </div>
                <div className="flex items-center gap-1.5 relative z-10 flex-shrink-0">
                  <Zap className="w-4 h-4 text-yellow-200" />
                  <span className="font-extrabold text-sm">{user.total_points.toLocaleString()}</span>
                </div>
              </div>
            );
          })}

          {/* Rest of list */}
          {leaderboard.slice(3).map((user, i) => (
            <div key={user.user_id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-amber-100 hover:bg-amber-50'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-amber-50 text-slate-500'}`}>
                #{i + 4}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{user.username}</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.current_rank}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{user.total_points.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
        <div className="flex items-start gap-2.5">
          <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className={`font-bold text-xs mb-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>How to climb the leaderboard</p>
            <ul className={`text-xs space-y-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              {['📝 Share helpful resources (+5 pts)', '💬 Send messages and get reactions (+1-2 pts)', '🎯 Mark messages as helpful (+10 pts)', '⚡ Maintain daily login streaks (+5-20 pts)'].map(tip => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
