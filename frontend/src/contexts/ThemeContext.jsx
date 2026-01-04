import React, { createContext, useContext, useEffect, useState } from 'react';

export const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to 'light'
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('theme') || 'light';
  });

  const [fontSize, setFontSize] = useState(() => {
    // Load fontSize from localStorage or default to 'medium'
    if (typeof window === 'undefined') return 'medium';
    return localStorage.getItem('fontSize') || 'medium';
  });

  // Apply theme to the entire document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      body.style.backgroundColor = '#1a1a1a';
      body.style.color = '#ffffff';
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#000000';
    }

    // Save theme preference
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply font size to the entire document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all font size classes
    root.classList.remove('font-small', 'font-medium', 'font-large');
    
    // Add the current font size class
    root.classList.add(`font-${fontSize}`);
    
    // Save fontSize preference
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  // Inject dark mode CSS styles once
  useEffect(() => {
    const styleId = 'dark-mode-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .dark {
          background-color: #1a1a1a;
          color: #ffffff;
        }

        .dark input, .dark textarea, .dark select {
          background-color: #2d2d2d;
          color: #ffffff;
          border-color: #404040 !important;
        }

        .dark input:focus, .dark textarea:focus, .dark select:focus {
          border-color: #60a5fa !important;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
        }

        .dark label {
          color: #e5e7eb;
        }

        .dark [class*="bg-white"] {
          background-color: #2d2d2d;
        }

        .dark [class*="text-gray-"] {
          color: #e5e7eb;
        }

        .dark button {
          color: inherit;
        }

        .dark .border-gray-200 {
          border-color: #404040 !important;
        }

        .dark [class*="hover:bg-gray"] {
          background-color: inherit;
        }

        .dark [class*="hover:bg-gray"]:hover {
          background-color: #3a3a3a;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const value = {
    theme,
    setTheme,
    isDark: theme === 'dark',
    fontSize,
    setFontSize
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
