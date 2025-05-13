import { ApiClient } from './client';
import { cacheManager } from './cache';

// DefiLlama API için tip tanımlamaları
export interface YieldPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase?: number;
  apyReward?: number;
  apy: number;
  rewardTokens?: string[];
  pool: string;
  underlyingTokens?: string[];
  il7d?: number;
  ilRisk?: string;
  exposure?: string;
  poolMeta?: string;
  stablecoin: boolean;
}

export interface YieldResponse {
  status: string;
  data: YieldPool[];
}

export interface PoolsByAsset {
  [assetSymbol: string]: YieldPool[];
}

class DefiLlamaApi {
  private client: ApiClient;
  private readonly BASE_URL = 'https://yields.llama.fi';
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 dakika

  constructor() {
    this.client = new ApiClient({
      baseURL: this.BASE_URL,
      timeout: 15000
    });
  }

  // Tüm yield poolları getir
  async getYieldPools(): Promise<YieldPool[]> {
    const cacheKey = 'defillama:yield-pools';
    const cachedData = cacheManager.get<YieldPool[]>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const response = await this.client.get<YieldResponse>('/pools');
      
      if (!response || !response.data) {
        throw new Error('Invalid response from DefiLlama API');
      }
      
      // Geçerli ve pozitif APY değeri olan poolları filtrele
      const filteredPools = response.data.filter(pool => 
        typeof pool.apy === 'number' && 
        !isNaN(pool.apy) && 
        pool.apy > 0 &&
        pool.tvlUsd >= 10000 // En az $10K TVL olan poollar
      );
      
      cacheManager.set(cacheKey, filteredPools, this.CACHE_TTL);
      return filteredPools;
    } catch (error) {
      console.error('Error fetching yield pools:', error);
      throw new Error('Failed to fetch yield pools');
    }
  }

  // Belirli bir coinin stake edilebileceği platformları bul
  async getStakingPlatforms(assetSymbol: string): Promise<YieldPool[]> {
    // Tam eşleşme için sembolü standartlaştır
    const normalizedSymbol = assetSymbol.toLowerCase();
    
    try {
      const allPools = await this.getYieldPools();
      
      // İlgili coinin yield poollarını filtrele
      return allPools.filter(pool => {
        const poolSymbol = pool.symbol.toLowerCase();
        
        // Sembol direkt olarak eşleşiyorsa veya sembolün bir parçasıysa
        return poolSymbol === normalizedSymbol || 
               poolSymbol.includes(`-${normalizedSymbol}`) ||
               poolSymbol.includes(`${normalizedSymbol}-`);
      });
    } catch (error) {
      console.error(`Error fetching staking platforms for ${assetSymbol}:`, error);
      throw new Error(`Failed to fetch staking platforms for ${assetSymbol}`);
    }
  }

  // En yüksek APY sunan platformları getir
  async getTopStakingPlatforms(limit: number = 10): Promise<YieldPool[]> {
    try {
      const allPools = await this.getYieldPools();
      
      // APY'ye göre sırala ve ilk 'limit' kadar sonucu döndür
      return allPools
        .sort((a, b) => b.apy - a.apy)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching top staking platforms:', error);
      throw new Error('Failed to fetch top staking platforms');
    }
  }

  // Tüm desteklenen coinlerin bir listesini getir
  async getSupportedAssets(): Promise<string[]> {
    try {
      const allPools = await this.getYieldPools();
      
      // Benzersiz sembolleri çıkar
      const assetSet = new Set<string>();
      allPools.forEach(pool => {
        // Sembolü temel formuna dönüştürerek ekle
        const baseSymbol = pool.symbol.split('-')[0];
        if (baseSymbol) {
          assetSet.add(baseSymbol.toUpperCase());
        }
      });
      
      return Array.from(assetSet).sort();
    } catch (error) {
      console.error('Error fetching supported assets:', error);
      throw new Error('Failed to fetch supported assets');
    }
  }
}

// API'nin tek bir instance'ını oluştur
export const defiLlamaApi = new DefiLlamaApi(); 