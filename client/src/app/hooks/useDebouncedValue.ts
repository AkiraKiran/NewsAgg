import { useEffect, useState } from 'react';

/** Debounce a fast-changing value (e.g. search input) so queries keyed on it
 * only fire after the user pauses typing. */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
