// Tiny in-process TTL cache with single-flight loading.
//
// Exists primarily to cut NeonDB egress: the free tier meters Postgres→server
// data transfer, so every uncached SELECT of the article set costs quota (the
// project was hard-blocked by "data transfer quota exceeded" in June 2026).
// Entries store the loader promise (not the resolved value) so concurrent
// misses for the same key share one upstream call; failed loads are evicted
// immediately so the next request retries instead of caching the error.
export class TtlCache<T> {
  private store = new Map<string, { at: number; value: Promise<T> }>()

  constructor(private ttlMs: number, private maxEntries = 100) {}

  wrap(key: string, loader: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key)
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value

    const value: Promise<T> = loader().catch((err) => {
      // Only evict if this entry is still ours — a newer load may have
      // replaced it while we were in flight.
      if (this.store.get(key)?.value === value) this.store.delete(key)
      throw err
    })
    this.store.set(key, { at: Date.now(), value })

    // FIFO eviction is enough: keys are a small set of filter combinations.
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest === undefined) break
      this.store.delete(oldest)
    }
    return value
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}
