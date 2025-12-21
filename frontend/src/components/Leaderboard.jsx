import React, { useEffect, useState } from 'react';
import { Trophy, Zap, TrendingUp } from 'lucide-react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/leaderboard?limit=50');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();
        setLeaderboard(data || []);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin">⚙️</div>
        <span className="ml-2 text-gray-600">Loading leaderboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  const getMedalEmoji = (position) => {
    if (position === 0) return '🥇';
    if (position === 1) return '🥈';
    if (position === 2) return '🥉';
    return `#${position + 1}`;
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 'Legend':
        return 'from-red-400 to-red-600';
      case 'Elite Member':
        return 'from-purple-400 to-purple-600';
      case 'Mentor':
        return 'from-blue-400 to-blue-600';
      case 'Contributor':
        return 'from-green-400 to-green-600';
      case 'Active':
        return 'from-yellow-400 to-yellow-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <Trophy className="w-8 h-8 text-yellow-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Leaderboard</h2>
          <p className="text-gray-600">Top contributors this month</p>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No users on leaderboard yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((user, index) => (
            <div
              key={user.user_id}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                index < 3
                  ? 'bg-gradient-to-r ' + getRankColor(user.current_rank) + ' text-white border-transparent shadow-lg scale-105'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Position & User */}
              <div className="flex items-center space-x-4 flex-1">
                <div className={`w-12 h-12 flex items-center justify-center rounded-full font-bold text-lg ${
                  index < 3 ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {getMedalEmoji(index)}
                </div>
                
                <div className="min-w-0">
                  <p className={`font-bold text-lg ${index < 3 ? 'text-white' : 'text-gray-900'}`}>
                    {user.username}
                  </p>
                  <p className={`text-sm ${index < 3 ? 'text-white/80' : 'text-gray-600'}`}>
                    {user.current_rank}
                  </p>
                </div>
              </div>

              {/* Points */}
              <div className="flex items-center space-x-2">
                <Zap className={`w-5 h-5 ${index < 3 ? 'text-yellow-200' : 'text-yellow-600'}`} />
                <span className={`text-xl font-bold ${index < 3 ? 'text-white' : 'text-gray-900'}`}>
                  {user.total_points.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-900">How to climb the leaderboard:</p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>📝 Share helpful resources (+5 pts)</li>
              <li>💬 Send messages and get reactions (+1-2 pts)</li>
              <li>🎯 Mark messages as helpful (+10 pts to sender)</li>
              <li>⚡ Maintain daily login streaks (+5-20 pts)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
