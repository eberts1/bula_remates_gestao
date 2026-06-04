'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button type="button" className="ghost theme-toggle" aria-label="Alternar tema" disabled>
        …
      </button>
    );
  }

  const isDark = (resolvedTheme ?? theme) === 'dark';

  return (
    <button
      type="button"
      className="ghost theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      {isDark ? '☀️ Claro' : '🌙 Escuro'}
    </button>
  );
}
