import React, { useState, useMemo } from 'react';
import { THEMES } from './themes';
import { ThemeContext } from './ThemeContext';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const t = useMemo(() => THEMES[theme], [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, t, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};


