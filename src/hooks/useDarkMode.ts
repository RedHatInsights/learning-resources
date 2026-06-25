import { useEffect, useState } from 'react';

const DARK_CLASS = 'pf-v6-theme-dark';

/**
 * Observe the root element for the PF6 dark mode class.
 *
 * Federated modules cannot rely on CSS selectors for `.pf-v6-theme-dark`
 * because their stylesheets are scoped with app-specific prefixes.
 * Instead, watch `document.documentElement` for class changes.
 */
export const useDarkMode = (): boolean => {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains(DARK_CLASS)
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains(DARK_CLASS));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};
