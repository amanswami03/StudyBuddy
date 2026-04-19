import React, { useState, useEffect } from 'react';
import { Play, Pause, StopCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { startStudySession, endStudySession, getUserStudySessions } from '../utils/api';
import { useConnection } from '../App';
import { useTheme } from '../contexts/ThemeContext';

export default function StudyTimer({ onSessionEnd }) {
  const { isOnline } = useConnection();
  const { theme } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [displayTime, setDisplayTime] = useState('00:00:00');
  const [loading, setLoading] = useState(false);
  const [wasAutoStopped, setWasAutoStopped] = useState(false);

  useEffect(() => {
    const restoreActiveSession = async () => {
      try {
        const data = await getUserStudySessions();
        if (data.active_sessions && data.active_sessions.length > 0) {
          const activeSession = data.active_sessions[0];
          setSessionId(activeSession.id);
          const elapsedSeconds = Math.floor((new Date() - new Date(activeSession.start_time)) / 1000);
          setSessionTime(elapsedSeconds);
          setIsRunning(true);
        }
      } catch (error) {}
    };
    restoreActiveSession();
  }, []);

  useEffect(() => {
    if (!isOnline && isRunning && sessionId) {
      setIsRunning(false);
      setWasAutoStopped(true);
    }
  }, [isOnline, isRunning, sessionId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId && isRunning) {
        const token = localStorage.getItem('sb_token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        fetch(`${apiUrl}/api/study/end?session_id=${sessionId}`, {
          method: 'POST', keepalive: true,
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, isRunning]);

  useEffect(() => {
    let interval;
    if (isRunning) interval = setInterval(() => setSessionTime(p => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    const h = Math.floor(sessionTime / 3600);
    const m = Math.floor((sessionTime % 3600) / 60);
    const s = sessionTime % 60;
    setDisplayTime(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
  }, [sessionTime]);

  const handleStart = async () => {
    try {
      setLoading(true);
      const response = await startStudySession(null, null);
      setSessionId(response.session_id);
      setIsRunning(true);
      setSessionTime(0);
    } catch { alert('Failed to start study session'); }
    finally { setLoading(false); }
  };

  const handlePause = () => setIsRunning(false);
  const handleResume = () => {
    if (isOnline) { setIsRunning(true); setWasAutoStopped(false); }
    else alert('Cannot resume — you are currently offline');
  };

  const handleStop = async () => {
    if (!sessionId) return;
    try {
      setLoading(true); setIsRunning(false);
      const response = await endStudySession(sessionId);
      const minutes = Math.floor(sessionTime / 60);
      const seconds = sessionTime % 60;
      alert(`Study session ended!\n${minutes}m ${seconds}s studied`);
      setSessionId(null); setSessionTime(0); setDisplayTime('00:00:00'); setWasAutoStopped(false);
      if (onSessionEnd) onSessionEnd(response);
    } catch { alert('Failed to end study session'); }
    finally { setLoading(false); }
  };

  const isDark = theme === 'dark';

  // Progress arc (visual ring showing seconds within current minute)
  const progress = (sessionTime % 60) / 60;
  const r = 54; const circ = 2 * Math.PI * r;
  const dash = circ * (1 - progress);

  const statusText = !sessionId ? 'Ready to study'
    : isRunning ? 'Session running'
    : wasAutoStopped ? 'Paused · offline'
    : 'Session paused';

  return (
    <div className={`notebook-card no-strip p-6 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-700'}`} />
          <h3 className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Study Timer</h3>
        </div>
        {!isOnline && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
            <WifiOff className="w-3 h-3" /> Offline
          </span>
        )}
      </div>

      {/* Clock face */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative w-32 h-32 mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 124 124">
            {/* Track */}
            <circle cx="62" cy="62" r={r} fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(184,152,100,0.2)'}
              strokeWidth="8" />
            {/* Progress */}
            <circle cx="62" cy="62" r={r} fill="none"
              stroke={isRunning ? '#1d4ed8' : isDark ? '#475569' : '#94a3b8'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dash}
              className="transition-all duration-1000" />
          </svg>
          {/* Time in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono font-bold text-lg leading-none ${
              isRunning ? (isDark ? 'text-blue-400' : 'text-blue-700') : (isDark ? 'text-slate-300' : 'text-slate-700')
            } ${isRunning ? 'ring-pulse' : ''}`}>
              {displayTime.slice(0, 5)}
            </span>
            <span className={`font-mono text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              :{displayTime.slice(6)}
            </span>
          </div>
        </div>

        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
          isRunning
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : isDark ? 'bg-slate-700 text-slate-400 border-slate-600' : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          {statusText}
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-2.5 justify-center">
        {!sessionId ? (
          <button onClick={handleStart} disabled={loading || !isOnline}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50">
            <Play className="w-4 h-4" /> Start Session
          </button>
        ) : (
          <>
            <button onClick={isRunning ? handlePause : handleResume} disabled={loading}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50">
              {isRunning ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4" />Resume</>}
            </button>
            <button onClick={handleStop} disabled={loading}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50">
              <StopCircle className="w-4 h-4" /> End
            </button>
          </>
        )}
      </div>

      <p className={`text-xs text-center mt-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        Your study time is tracked accurately from start to end
      </p>
    </div>
  );
}
