'use client';

import { useEffect, useState } from 'react';

export default function Tools() {
  const [z, setZ] = useState(100);

  useEffect(() => {
    const t = localStorage.theme;
    if (t) document.documentElement.dataset.theme = t;

    const n = Number(localStorage.sz || 100);
    setZ(n);
    document.documentElement.style.setProperty('--z', n + '%');
  }, []);

  const set = (n: number) => {
    n = Math.min(150, Math.max(85, n));
    setZ(n);
    localStorage.sz = n;
    document.documentElement.style.setProperty('--z', n + '%');
  };

  return (
    <span className="tools">
      <button
        aria-label="Smaller text"
        onClick={() => set(z - 10)}
      >
        A-
      </button>

      <button
        aria-label="Larger text"
        onClick={() => set(z + 10)}
      >
        A+
      </button>

      <button
        aria-label="Switch light or dark mode"
        onClick={() => {
          const d =
            document.documentElement.dataset.theme === 'dark'
              ? 'light'
              : 'dark';

          document.documentElement.dataset.theme = d;
          localStorage.theme = d;
        }}
      >
        ◐
      </button>
    </span>
  );
}
