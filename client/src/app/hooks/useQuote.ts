import { useEffect, useState } from 'react';
import { fetchQuoteList, fetchDailyQuote, type DailyQuote } from '../services/quoteService';

export interface UseQuoteResult {
  quote: DailyQuote | null;
  index: number;
  isLoading: boolean;
}

const ROTATE_MS = 7000;

// Module-level cache: fetch the batch at most once per session and reuse it
// across every mount thereafter.
let cachedList: DailyQuote[] | null = null;

/**
 * Returns the currently displayed quote and rotates to the next one every 7s.
 * Falls back to the single daily quote when the batch endpoint returns nothing,
 * so the widget always has something to show (or null to hide itself).
 */
export function useQuote(): UseQuoteResult {
  const [list, setList] = useState<DailyQuote[]>(cachedList ?? []);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(cachedList === null);

  // Fetch the batch once per session.
  useEffect(() => {
    if (cachedList) return;

    let active = true;
    setIsLoading(true);
    fetchQuoteList()
      .then(async (result) => {
        let quotes = result;
        if (quotes.length === 0) {
          const daily = await fetchDailyQuote();
          quotes = daily ? [daily] : [];
        }
        if (!active) return;
        cachedList = quotes;
        setList(quotes);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Rotate every 7s once there is more than one quote to cycle through.
  useEffect(() => {
    if (list.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % list.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [list.length]);

  const quote = list.length > 0 ? list[index % list.length] : null;
  return { quote, index: index % Math.max(1, list.length), isLoading };
}
