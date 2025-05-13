import { ApiClient } from './client';
import { cacheManager } from './cache';

// CoinGecko API için tip tanımlamaları
export interface CoinGeckoPrice {
  [id: string]: {
    [currency: string]: number;
  };
}

export interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data: {
    current_price: {
      [currency: string]: number;
    };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
  };
  last_updated: string;
}

export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}

class CoinGeckoApi {
  private client: ApiClient;
  private readonly BASE_URL = 'https://api.coingecko.com/api/v3';
  
  // Cache süreleri
  private readonly PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 dakika
  private readonly COIN_LIST_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat
  
  // Rate limiting için değişkenler
  private requestsThisMinute = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 50;

  constructor() {
    this.client = new ApiClient({
      baseURL: this.BASE_URL,
      timeout: 15000
    });
  }

  // Rate limit kontrolü
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.lastResetTime > 60000) {
      // Eğer son sıfırlamadan bu yana 1 dakika geçtiyse, sayacı sıfırla
      this.requestsThisMinute = 0;
      this.lastResetTime = now;
    }

    if (this.requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE) {
      // Rate limite ulaşıldı, bir sonraki dakikayı bekle
      const waitTime = 60000 - (now - this.lastResetTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestsThisMinute = 0;
      this.lastResetTime = Date.now();
    }

    this.requestsThisMinute++;
  }

  // Desteklenen coinlerin listesini getir
  async getCoinList(): Promise<CoinListItem[]> {
    const cacheKey = 'coingecko:coin-list';
    const cachedData = cacheManager.get<CoinListItem[]>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    await this.checkRateLimit();
    
    try {
      const response = await this.client.get<CoinListItem[]>('/coins/list');
      cacheManager.set(cacheKey, response, this.COIN_LIST_CACHE_TTL);
      return response;
    } catch (error) {
      console.error('Error fetching coin list:', error);
      throw new Error('Failed to fetch coin list');
    }
  }

  // Belirli bir coin ID'si için detaylı bilgi getir
  async getCoinDetails(coinId: string, currency: string = 'usd'): Promise<CoinGeckoCoin> {
    const cacheKey = `coingecko:coin:${coinId}:${currency}`;
    const cachedData = cacheManager.get<CoinGeckoCoin>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    await this.checkRateLimit();
    
    try {
      const response = await this.client.get<CoinGeckoCoin>(`/coins/${coinId}`, {
        localization: 'false',
        tickers: 'false',
        market_data: 'true',
        community_data: 'false',
        developer_data: 'false',
        sparkline: 'false'
      });
      
      cacheManager.set(cacheKey, response, this.PRICE_CACHE_TTL);
      return response;
    } catch (error) {
      console.error(`Error fetching details for coin ${coinId}:`, error);
      throw new Error(`Failed to fetch details for coin ${coinId}`);
    }
  }

  // Birden fazla coin için fiyat bilgisi getir
  async getPrices(coinIds: string[], currency: string = 'usd'): Promise<CoinGeckoPrice> {
    const idString = coinIds.join(',');
    const cacheKey = `coingecko:prices:${idString}:${currency}`;
    const cachedData = cacheManager.get<CoinGeckoPrice>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    await this.checkRateLimit();
    
    try {
      const response = await this.client.get<CoinGeckoPrice>('/simple/price', {
        ids: idString,
        vs_currencies: currency,
        include_24hr_change: true
      });
      
      cacheManager.set(cacheKey, response, this.PRICE_CACHE_TTL);
      return response;
    } catch (error) {
      console.error('Error fetching prices:', error);
      throw new Error('Failed to fetch coin prices');
    }
  }

  // Symbol'den ID'ye dönüşüm
  async getIdFromSymbol(symbol: string): Promise<string | null> {
    const coinList = await this.getCoinList();
    const matchingCoins = coinList.filter(
      coin => coin.symbol.toLowerCase() === symbol.toLowerCase()
    );
    
    // Sembol bulunduysa ilk eşleşen ID'yi döndür
    return matchingCoins.length > 0 ? matchingCoins[0].id : null;
  }
}

// API'nin tek bir instance'ını oluştur
export const coinGeckoApi = new CoinGeckoApi(); 