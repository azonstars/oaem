import React, { createContext, useContext, useState, useEffect } from "react";

export type AppTheme = "light" | "dark" | "custom";

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isDark: boolean;
  isCustom: boolean;
  isOcean: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem("app_theme") as AppTheme;
      if (saved && ["light", "dark", "custom"].includes(saved)) {
        return saved;
      }
      if ((saved as string) === "ocean") return "custom";
    } catch (e) {
      console.warn("Could not read theme from localStorage", e);
    }
    return "light";
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("app_theme", newTheme);
    } catch (e) {
      console.warn("Could not save theme to localStorage", e);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(
      "theme-light",
      "theme-dark",
      "theme-ocean",
      "theme-custom",
      "dark",
    );
    if (theme === "dark") {
      root.classList.add("dark", "theme-dark");
    } else if (theme === "custom") {
      root.classList.add("theme-custom");
    } else {
      root.classList.add("theme-light");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark: theme === "dark",
        isCustom: theme === "custom",
        isOcean: theme === "custom",
        isLight: theme === "light",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
