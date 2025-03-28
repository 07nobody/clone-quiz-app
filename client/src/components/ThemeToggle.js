import React, { useState, useEffect } from 'react';
import { toggleTheme } from '../stylesheets/theme';

function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme-preference') || 'light');

  const handleToggleTheme = () => {
    const newTheme = toggleTheme();
    setCurrentTheme(newTheme);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const newTheme = localStorage.getItem('theme-preference') || 'light';
      setCurrentTheme(newTheme);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div 
      className="theme-toggle" 
      onClick={handleToggleTheme}
      title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {currentTheme === 'light' ? (
        <i className="ri-moon-fill" />
      ) : (
        <i className="ri-sun-fill" />
      )}
    </div>
  );
}

export default ThemeToggle;
