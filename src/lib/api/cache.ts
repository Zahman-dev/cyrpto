interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class CacheManager {
  private storage: Map<string, CacheEntry<any>> = new Map();
  
  // Varsayılan TTL: 5 dakika
  private defaultTTL = 5 * 60 * 1000;

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.storage.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.storage.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Eğer veri süresi dolmuşsa null döndür
    if (Date.now() > entry.expiry) {
      this.storage.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  isValid(key: string): boolean {
    const entry = this.storage.get(key);
    if (!entry) return false;
    return Date.now() <= entry.expiry;
  }

  clear(): void {
    this.storage.clear();
  }

  // Stale verileri temizle
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.expiry) {
        this.storage.delete(key);
      }
    }
  }
}

// Singleton instance oluştur
export const cacheManager = new CacheManager(); 