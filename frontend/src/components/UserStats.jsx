import React, { useEffect, useState } from 'react';
import { Award, TrendingUp, Zap, Trophy, Clock } from 'lucide-react';

export default function UserStats() {
  const [stats, setStats] = useState(null);
  const [rankThresholds, setRankThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, ranksRes] = await Promise.all([
          fetch('http://localhost:8080/api/user/stats'),
          fetch('http://localhost:8080/api/ranks')
        ]);

        if (!statsRes.ok || !ranksRes.ok) {
          throw new Error('Failed to fetch stats');
        }

        const statsData = await statsRes.json();
        const ranksData = await ranksRes.json();

        setStats(statsData);
        setRankThresholds(ranksData);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin">⚙️</div>
        <span className="ml-2 text-gray-600">Loading stats...</span>
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

  if (!stats) return null;

  // Find current rank info
  const currentRankInfo = rankThresholds.find(r => r.rank_name === stats.current_rank);
  const nextRankInfo = rankThresholds.find(
    r => r.points_required > stats.total_points
  );

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
      {/* Main Rank Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm font-medium">Current Rank</p>
            <h2 className="text-4xl font-bold">{currentRankInfo?.badge_emoji} {stats.current_rank}</h2>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm font-medium">Total Points</p>
            <p className="text-5xl font-bold">{stats.total_points.toLocaleString()}</p>
          </div>
        </div>
        <div className="text-blue-100 text-sm">
          Level {currentRankInfo?.display_order} of {rankThresholds.length}
        </div>
      </div>

      {/* Progress to Next Rank */}
      {nextRankInfo && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-800">Progress to {nextRankInfo.rank_name}</span>
            </div>
            <span className="text-sm font-medium text-gray-600">
              {stats.points_to_next} pts needed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.progress_to_next}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{stats.progress_to_next}% complete</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Login Streak */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-medium text-gray-600 uppercase">Login Streak</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{stats.login_streak}</p>
          <p className="text-xs text-gray-500">consecutive days</p>
        </div>

        {/* Messages Sent (from activity) */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-medium text-gray-600 uppercase">Activity</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">+3</p>
          <p className="text-xs text-gray-500">today's actions</p>
        </div>

        {/* Rank Position */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Trophy className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-gray-600 uppercase">Rank</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{currentRankInfo?.display_order}</p>
          <p className="text-xs text-gray-500">of {rankThresholds.length}</p>
        </div>
      </div>

      {/* Rank Thresholds */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center space-x-2">
          <Award className="w-5 h-5 text-blue-600" />
          <span>Rank Progression</span>
        </h3>
        <div className="space-y-3">
          {rankThresholds.map((rank, idx) => {
            const isReached = stats.total_points >= rank.points_required;
            const isCurrent = rank.rank_name === stats.current_rank;
            
            return (
              <div
                key={rank.rank_name}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : isReached
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{rank.badge_emoji}</span>
                  <div>
                    <p className={`font-semibold ${isCurrent ? 'text-blue-700' : isReached ? 'text-green-700' : 'text-gray-600'}`}>
                      {rank.rank_name}
                    </p>
                    <p className="text-xs text-gray-500">{rank.points_required}+ points</p>
                  </div>
                </div>
                <div>
                  {isCurrent && (
                    <span className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                      Current
                    </span>
                  )}
                  {isReached && !isCurrent && (
                    <span className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                      Unlocked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>Pro tip:</strong> Share resources, help others, and maintain your login streak to earn more points!
        </p>
      </div>
    </div>
  );
}
