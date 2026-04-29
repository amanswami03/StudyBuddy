import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, createContext, useContext } from 'react';
import HomePage from './HomePage';
import Auth from './Auth';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import MainDashboard from './MainDashboard';
import GroupDetail from './GroupDetail';
import Calendar from './Calendar';
import UserProfile from './UserProfile';
import SettingsPage from './SettingsPage';
import SubscriptionPlans from './components/SubscriptionPlans';
import { ThemeProvider } from './contexts/ThemeContext';

// Create context for online/offline status
export const ConnectionContext = createContext({ isOnline: true });

export const useConnection = () => useContext(ConnectionContext);

function AppRoutes() {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(true);
  const location = useLocation();
  const [routeVisible, setRouteVisible] = useState(true);

  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <div>Loading...</div>;
  }

  // Simple route transition: toggle a CSS class when location changes to animate opacity/translate
  useEffect(() => {
    // hide then show to trigger CSS transition on mount
    setRouteVisible(false);
    const t = setTimeout(() => setRouteVisible(true), 20);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div className={`route-wrapper ${routeVisible ? 'visible' : ''}`}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/profile/:userId" element={<UserProfile />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/subscriptions" element={<SubscriptionPlans />} />
        <Route path="/group/:id" element={<GroupDetail />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Check backend connectivity periodically
    const checkBackendHealth = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        const response = await fetch(`${API_BASE}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        if (response.ok) {
          setIsOnline(true);
        }
      } catch (error) {
        // If backend is unreachable, mark as offline
        if (navigator.onLine) {
          setIsOnline(false);
        }
      }
    };

    // Check backend health every 5 seconds
    const healthCheckInterval = setInterval(checkBackendHealth, 5000);
    // Initial check
    checkBackendHealth();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(healthCheckInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <BrowserRouter>
      <ConnectionContext.Provider value={{ isOnline }}>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </ConnectionContext.Provider>
    </BrowserRouter>
  );
}
