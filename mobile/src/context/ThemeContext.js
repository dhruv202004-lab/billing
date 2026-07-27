import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState('Default'); // 'Default' | 'Indigo' | 'Teal'

  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const savedDarkMode = await AsyncStorage.getItem('settings_dark_mode');
        if (savedDarkMode !== null) {
          setIsDarkMode(savedDarkMode === 'true');
        } else {
          setIsDarkMode(systemScheme === 'dark');
        }

        const savedTheme = await AsyncStorage.getItem('settings_theme_color');
        if (savedTheme) {
          setThemeColor(savedTheme);
        }
      } catch (err) {
        console.error('Failed to load theme settings:', err);
      }
    };
    loadThemeSettings();
  }, [systemScheme]);

  const toggleDarkMode = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('settings_dark_mode', String(newMode));
    } catch (err) {
      console.error(err);
    }
  };

  const changeThemeColor = async (color) => {
    try {
      setThemeColor(color);
      await AsyncStorage.setItem('settings_theme_color', color);
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve highlight primary color
  const getPrimaryColor = () => {
    if (themeColor === 'Indigo') return '#3f51b5';
    if (themeColor === 'Teal') return '#009688';
    return '#5a4bda'; // Default Purple
  };

  const primary = getPrimaryColor();

  // Create paper theme
  const paperTheme = isDarkMode
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: primary,
          background: '#090d16',
          surface: '#121b2d',
          surfaceVariant: '#1a263e',
          text: '#f8fafc',
          onBackground: '#f8fafc',
          onSurface: '#f8fafc',
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: primary,
          background: '#f1f5f9',
          surface: '#ffffff',
          surfaceVariant: '#f8fafc',
          text: '#0f172a',
          onBackground: '#0f172a',
          onSurface: '#0f172a',
        },
      };

  // Create navigation theme
  const navigationTheme = isDarkMode
    ? {
        ...NavigationDarkTheme,
        colors: {
          ...NavigationDarkTheme.colors,
          primary: primary,
          background: '#090d16',
          card: '#121b2d',
          text: '#f8fafc',
          border: '#1a263e',
        },
      }
    : {
        ...NavigationDefaultTheme,
        colors: {
          ...NavigationDefaultTheme.colors,
          primary: primary,
          background: '#f1f5f9',
          card: '#ffffff',
          text: '#0f172a',
          border: '#cbd5e1',
        },
      };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        themeColor,
        toggleDarkMode,
        changeThemeColor,
        paperTheme,
        navigationTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
