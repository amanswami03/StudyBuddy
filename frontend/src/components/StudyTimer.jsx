import React, { useState, useEffect } from 'react';
import { Play, Pause, StopCircle, Clock } from 'lucide-react';
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

  // Check for active session on mount
  useEffect(() => {
    const restoreActiveSession = async () => {
      try {
        const data = await getUserStudySessions();
        if (data.active_sessions && data.active_sessions.length > 0) {
          const activeSession = data.active_sessions[0];
          setSessionId(activeSession.id);
          
          // Calculate elapsed time since start_time
          const startTime = new Date(activeSession.start_time);
          const now = new Date();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          
          setSessionTime(elapsedSeconds);
          setIsRunning(true);
        }
      } catch (error) {
        console.error('Failed to restore active session:', error);
      }
    };

    restoreActiveSession();
  }, []);

  // Auto-pause when going offline
  useEffect(() => {
    if (!isOnline && isRunning && sessionId) {
      setIsRunning(false);
      setWasAutoStopped(true);
      console.log('Study timer paused due to offline status');
    }
  }, [isOnline, isRunning, sessionId]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Format time display
  useEffect(() => {
    const hours = Math.floor(sessionTime / 3600);
    const minutes = Math.floor((sessionTime % 3600) / 60);
    const seconds = sessionTime % 60;
    
    setDisplayTime(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  }, [sessionTime]);

  const handleStart = async () => {
    try {
      setLoading(true);
      const response = await startStudySession(null, null);
      setSessionId(response.session_id);
      setIsRunning(true);
      setSessionTime(0);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start study session');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleResume = () => {
    if (isOnline) {
      setIsRunning(true);
      setWasAutoStopped(false);
    } else {
      alert('Cannot resume - you are currently offline');
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      setIsRunning(false);
      const response = await endStudySession(sessionId);
      
      const minutes = Math.floor(sessionTime / 60);
      const seconds = sessionTime % 60;
      
      alert(`Study session ended!\n${minutes}m ${seconds}s studied`);
      
      // Reset
      setSessionId(null);
      setSessionTime(0);
      setDisplayTime('00:00:00');
      setWasAutoStopped(false);
      
      // Callback to parent to refresh stats
      if (onSessionEnd) {
        onSessionEnd(response);
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      alert('Failed to end study session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl p-6 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Clock className={`w-6 h-6 ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-600'}`} />
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Study Timer</h3>
        </div>
        {!isOnline && (
          <span className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 ${theme === 'dark' ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}`}>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Offline
          </span>
        )}
      </div>

      {/* Timer Display */}
      <div className={`rounded-xl p-8 mb-6 text-center border-2 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-200'}`}>
        <p className={`text-5xl font-bold font-mono tracking-wider ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-600'}`}>
          {displayTime}
        </p>
        <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          {!sessionId && 'Ready to study'}
          {sessionId && isRunning && 'Session Running'}
          {sessionId && !isRunning && wasAutoStopped && 'Paused (offline)'}
          {sessionId && !isRunning && !wasAutoStopped && 'Session Paused'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-center">
        {!sessionId ? (
          <button
            onClick={handleStart}
            disabled={loading || !isOnline}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
            <span>Start Session</span>
          </button>
        ) : (
          <>
            <button
              onClick={isRunning ? handlePause : handleResume}
              disabled={loading}
              className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Resume</span>
                </>
              )}
            </button>

            <button
              onClick={handleStop}
              disabled={loading}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <StopCircle className="w-5 h-5" />
              <span>End Session</span>
            </button>
          </>
        )}
      </div>

      <p className={`text-xs text-center mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        Your study time is tracked accurately from start to end
      </p>
    </div>
  );
}
