import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import HomePage from './HomePage';
import Auth from './Auth';
import MainDashboard from './MainDashboard';
import GroupDetail from './GroupDetail';
import Calendar from './Calendar';
import UserProfile from './UserProfile';
import SettingsPage from './SettingsPage';

function AppRoutes() {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(true);
  const location = useLocation();
  const [routeVisible, setRouteVisible] = useState(true);
  // Internal history stack to accurately determine forward/back availability
  const historyRef = useRef({ stack: [location.pathname + location.search + location.hash], pos: 0 });

  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

  // Refs for debouncing and history tracking
    const wheelAccum = { value: 0 };
    const wheelTimer = { id: null };
    const lastNavTime = { ts: 0 };
    const cooldownMs = 500; // min time between navigations

    // Helper: detect if an element (or its ancestors) is horizontally scrollable
    const isHorizontallyScrollable = (el) => {
      while (el && el !== document.body) {
        try {
          const style = window.getComputedStyle(el);
          const overflowX = style.overflowX;
          if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) {
            return true;
          }
        } catch (e) {
          // ignore
        }
        el = el.parentElement;
      }
      return false;
    };

    // Update internal history stack when popstate occurs.
    const handlePopstate = () => {
      // We rely on the location effect below to keep the stack in-sync, so nothing heavy here.
      // This handler exists to ensure we capture native popstate events if needed.
      // No-op: the location effect will update historyRef accordingly.
    };

    // Debounced wheel handler that accumulates horizontal delta across events
    const handleWheel = (event) => {
      // Ignore if scrolling vertically more than horizontally
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

      // Don't trigger while the user is interacting with a horizontally scrollable element
      if (isHorizontallyScrollable(event.target)) return;

      // Accumulate deltaX (note: touchpad deltas are typically small, use sum)
      wheelAccum.value += event.deltaX;

      // Clear any existing timer and set a new one to evaluate the gesture
      if (wheelTimer.id) clearTimeout(wheelTimer.id);
      wheelTimer.id = setTimeout(() => {
        const now = Date.now();
        if (now - lastNavTime.ts < cooldownMs) {
          wheelAccum.value = 0;
          return;
        }

        const threshold = 80; // tuned for two-finger swipe on Mac
        if (wheelAccum.value <= -threshold) {
          // Swipe right (negative deltaX) — navigate back if possible
          const hr = historyRef.current;
          const canGoBack = hr.pos > 0 || window.history.length > 1;
          if (canGoBack) {
            navigate(-1);
            lastNavTime.ts = now;
          }
        } else if (wheelAccum.value >= threshold) {
          // Swipe left (positive deltaX) — navigate forward only if internal stack says so
          const hr = historyRef.current;
          const canGoForward = hr.pos < hr.stack.length - 1;
          if (canGoForward) {
            navigate(1);
            lastNavTime.ts = now;
          }
        }

        wheelAccum.value = 0;
        wheelTimer.id = null;
      }, 120);
    };

    // Touch handlers: similar logic but simpler (single gesture)
    const handleTouchStart = (event) => {
      touchStartX = event.changedTouches[0].screenX;
    };

    const handleTouchEnd = (event) => {
      touchEndX = event.changedTouches[0].screenX;
      const swipeDistance = touchStartX - touchEndX;
      const threshold = 50;

      // Don't trigger if event started inside a horizontally scrollable element
      if (isHorizontallyScrollable(event.target)) return;

      if (Math.abs(swipeDistance) > threshold) {
        const now = Date.now();
        if (now - lastNavTime.ts < cooldownMs) return;

        if (swipeDistance > 0) {
          // Swiped left - go forward if possible
          const hr = historyRef.current;
          const canGoForward = hr.pos < hr.stack.length - 1;
          if (canGoForward) {
            navigate(1);
            lastNavTime.ts = now;
          }
        } else {
          // Swiped right - go back if possible
          const hr = historyRef.current;
          const canGoBack = hr.pos > 0 || window.history.length > 1;
          if (canGoBack) {
            navigate(-1);
            lastNavTime.ts = now;
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('popstate', handlePopstate);

    // Initialize from current history state
    handlePopstate();

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('popstate', handlePopstate);
      if (wheelTimer.id) clearTimeout(wheelTimer.id);
    };
  }, [navigate]);

  // Keep an internal stack of visited routes so we can determine forward/back reliably.
  useEffect(() => {
    // Simple path key including query/hash
    const path = location.pathname + location.search + location.hash;
    const hr = historyRef.current;
    if (!hr) return;

    // If the next entry in the stack matches, we moved forward
    if (hr.stack[hr.pos + 1] === path) {
      hr.pos += 1;
      return;
    }

    // If the current entry matches, nothing to do
    if (hr.stack[hr.pos] === path) return;

    // Otherwise this is a new navigation: truncate any forward history and push
    hr.stack = hr.stack.slice(0, hr.pos + 1);
    hr.stack.push(path);
    hr.pos = hr.stack.length - 1;
  }, [location.pathname, location.search, location.hash]);

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
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/group/:id" element={<GroupDetail />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
