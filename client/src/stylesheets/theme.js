// Theme management for light/dark mode

// Common theme colors
const commonColors = {
  success: '#6fbf71',
  error: '#e47943',
  warning: '#f0ad4e',
  info: '#00bcd4',
};

// Theme definitions
const themes = {
  light: {
    ...commonColors,
    primary: '#0F3460',
    secondary: '#ff5722',
    background: '#ffffff',
    card: '#ffffff',
    text: '#212121',
    border: '#e1e1e1',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    ...commonColors,
    primary: '#1E4976',
    secondary: '#ff5722',
    background: '#121212',
    card: '#1e1e1e',
    text: '#f1f1f1',
    border: '#333333',
    shadow: 'rgba(0, 0, 0, 0.3)',
  }
};

// Apply theme to CSS variables
const applyTheme = (theme) => {
  const root = document.documentElement;
  
  Object.keys(theme).forEach(key => {
    root.style.setProperty(`--${key}`, theme[key]);
  });
  
  // Store the current theme preference
  localStorage.setItem('theme-preference', theme === themes.dark ? 'dark' : 'light');
  
  // Add a class to the body for additional styling hooks
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme === themes.dark ? 'dark' : 'light'}`);
};

// Get the preferred theme from localStorage or system preference
const getPreferredTheme = () => {
  const savedTheme = localStorage.getItem('theme-preference');
  
  if (savedTheme) {
    return savedTheme === 'dark' ? themes.dark : themes.light;
  }
  
  // Check for system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? themes.dark : themes.light;
};

// Initialize theme on load
const initializeTheme = () => {
  const preferredTheme = getPreferredTheme();
  applyTheme(preferredTheme);
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only update if user hasn't set a preference
    if (!localStorage.getItem('theme-preference')) {
      applyTheme(e.matches ? themes.dark : themes.light);
    }
  });
};

// Toggle between light and dark theme
const toggleTheme = () => {
  const currentTheme = localStorage.getItem('theme-preference') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  if (currentTheme === 'light') {
    applyTheme(themes.dark);
    return 'dark';
  } else {
    applyTheme(themes.light);
    return 'light';
  }
};

export { initializeTheme, toggleTheme, themes };