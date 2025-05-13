"use client";

import { useState, useEffect } from 'react';
import { coinGeckoApi } from '../lib/api/coingecko';
import { defiLlamaApi, YieldPool } from '../lib/api/defillama';
import { calculateStakingRewards, getCompoundingFrequency } from '../lib/calculators';
import { getStakingConstraints, isValidStakeAmount, isValidStakeDuration } from '../lib/staking_constraints';
import stakingData from '../lib/staking_data.json'; // Fallback veri olarak kullanılacak

// Tip tanımlamaları
interface Platform {
  name: string;
  apr: number;
  chain?: string;
  tvlUsd?: number;
}

interface CoinData {
  name: string;
  symbol: string;
  id?: string;
  currentPrice?: number;
  priceChange24h?: number;
  platforms: Platform[];
}

export default function StakingCalculatorPage() {
  // State değişkenleri
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [selectedCoinSymbol, setSelectedCoinSymbol] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [duration, setDuration] = useState<string>('365'); // Varsayılan 1 yıl
  const [calculatedReward, setCalculatedReward] = useState<number | null>(null);
  const [selectedCoinPlatforms, setSelectedCoinPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useCompound, setUseCompound] = useState<boolean>(false);
  const [compoundFrequency, setCompoundFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'>('daily');
  const [selectedPlatformIndex, setSelectedPlatformIndex] = useState<number>(0);
  const [coinPrices, setCoinPrices] = useState<{[symbol: string]: number}>({});
  const [currency, setCurrency] = useState<string>('usd');

  // Verileri yükle
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);
      
      try {
        // DefiLlama'dan desteklenen varlıkları al
        const assets = await defiLlamaApi.getSupportedAssets();
        
        // Coinlerin bilgilerini ve platformlarını al
        const coinDataPromises = assets.slice(0, 30).map(async (symbol) => {
          try {
            // DefiLlama'dan platformları al
            const platforms = await defiLlamaApi.getStakingPlatforms(symbol);
            
            // Platform verilerini dönüştür
            const formattedPlatforms: Platform[] = platforms.map(platform => ({
              name: platform.project,
              apr: platform.apy,
              chain: platform.chain,
              tvlUsd: platform.tvlUsd
            }));
            
            return {
              name: symbol,
              symbol: symbol,
              platforms: formattedPlatforms.length > 0 ? formattedPlatforms : []
            };
          } catch (error) {
            console.error(`Error loading platforms for ${symbol}:`, error);
            return null;
          }
        });
        
        // Tüm veri promise'larını bekle
        const coinDataResults = await Promise.all(coinDataPromises);
        
        // Null değerleri filtrele ve platformu olan coinleri al
        const validCoinData = coinDataResults
          .filter((coin): coin is CoinData => !!coin && coin.platforms.length > 0)
          .sort((a, b) => a.symbol.localeCompare(b.symbol));
        
        // API'den veri alınamadıysa statik verileri kullan
        const finalCoinData = validCoinData.length > 0 
          ? validCoinData 
          : stakingData as CoinData[];
        
        setCoins(finalCoinData);
        
        // İlk coini seç
        if (finalCoinData.length > 0 && !selectedCoinSymbol) {
          setSelectedCoinSymbol(finalCoinData[0].symbol);
        }
        
        // Coin fiyatlarını al
        await loadCoinPrices(finalCoinData.map(coin => coin.symbol));
        
      } catch (error) {
        console.error('Error loading data:', error);
        setErrorMessage('Veri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        
        // Fallback olarak statik verileri kullan
        setCoins(stakingData as CoinData[]);
        if (stakingData.length > 0 && !selectedCoinSymbol) {
          setSelectedCoinSymbol((stakingData as CoinData[])[0].symbol);
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Coin fiyatlarını yükle
  async function loadCoinPrices(symbols: string[]) {
    try {
      // CoinGecko ID'lerini bul
      const coinIds = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            return await coinGeckoApi.getIdFromSymbol(symbol);
          } catch (error) {
            console.error(`Error finding ID for ${symbol}:`, error);
            return null;
          }
        })
      );
      
      // Geçerli ID'leri filtrele
      const validCoinIds = coinIds.filter((id): id is string => !!id);
      
      if (validCoinIds.length > 0) {
        // Fiyatları al
        const prices = await coinGeckoApi.getPrices(validCoinIds, currency);
        
        // Fiyatları sembollerle eşleştir
        const coinPriceMap: {[symbol: string]: number} = {};
        
        symbols.forEach((symbol, index) => {
          const id = coinIds[index];
          if (id && prices[id] && prices[id][currency]) {
            coinPriceMap[symbol] = prices[id][currency];
          }
        });
        
        setCoinPrices(coinPriceMap);
      }
    } catch (error) {
      console.error('Error loading coin prices:', error);
    }
  }

  // Seçilen coin değiştiğinde platformları güncelle
  useEffect(() => {
    if (selectedCoinSymbol) {
      const coin = coins.find(c => c.symbol === selectedCoinSymbol);
      if (coin) {
        setSelectedCoinPlatforms(coin.platforms);
        setSelectedPlatformIndex(0); // Reset platform selection
      } else {
        setSelectedCoinPlatforms([]);
      }
      // Reset reward when coin changes
      setCalculatedReward(null);
    }
  }, [selectedCoinSymbol, coins]);

  // Handlers
  const handleCoinChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCoinSymbol(event.target.value);
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value);
  };

  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDuration(event.target.value);
  };

  const handleCompoundToggle = () => {
    setUseCompound(!useCompound);
  };

  const handleCompoundFrequencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCompoundFrequency(event.target.value as any);
  };

  const handlePlatformChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPlatformIndex(parseInt(event.target.value));
  };

  // Ödül hesaplama
  const calculateReward = () => {
    if (!selectedCoinSymbol || !amount || !duration) {
      setErrorMessage("Lütfen geçerli bir coin, miktar ve süre girin.");
      return;
    }
    
    const amountValue = parseFloat(amount);
    const durationValue = parseInt(duration);
    
    if (isNaN(amountValue) || amountValue <= 0) {
      setErrorMessage("Lütfen geçerli bir miktar girin.");
      return;
    }
    
    if (isNaN(durationValue) || durationValue <= 0) {
      setErrorMessage("Lütfen geçerli bir süre girin.");
      return;
    }
    
    // Coin kısıtlamalarını kontrol et
    if (!isValidStakeAmount(selectedCoinSymbol, amountValue)) {
      const constraints = getStakingConstraints(selectedCoinSymbol);
      setErrorMessage(`Minimum stake miktarı: ${constraints?.minStakeAmount} ${selectedCoinSymbol}`);
      return;
    }
    
    if (!isValidStakeDuration(selectedCoinSymbol, durationValue)) {
      const constraints = getStakingConstraints(selectedCoinSymbol);
      const period = constraints?.stakingPeriods[0];
      setErrorMessage(
        `${selectedCoinSymbol} için stake süresi ${period?.minDays} ile ${period?.maxDays || 'sınırsız'} gün arasında olmalıdır.`
      );
      return;
    }
    
    // Platformu kontrol et
    if (selectedCoinPlatforms.length === 0) {
      setErrorMessage("Seçilen coin için platform bilgisi bulunamadı.");
      return;
    }
    
    // Seçilen platformun APR değerini al
    const platform = selectedCoinPlatforms[selectedPlatformIndex];
    if (!platform) {
      setErrorMessage("Geçerli bir platform seçin.");
      return;
    }
    
    // Hesaplama parametrelerini hazırla
    const params = {
      principal: amountValue,
      apr: platform.apr,
      days: durationValue,
      compoundingFrequency: getCompoundingFrequency(compoundFrequency)
    };
    
    // Hesaplamayı yap
    const result = calculateStakingRewards(params, useCompound);
    
    // Sonucu kaydet
    setCalculatedReward(result.interest);
    setErrorMessage(null);
  };

  // Fiyat bilgisi bulunan coinler için dolar değerini göster
  const getUsdValue = (coinAmount: number, symbol: string): string | null => {
    if (coinPrices[symbol]) {
      const usdValue = coinAmount * coinPrices[symbol];
      return `(≈ $${usdValue.toFixed(2)})`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold text-center text-sky-400 mb-8">Kripto Stake Ödül Hesaplayıcı</h1>

        {isLoading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
          </div>
        ) : (
          <>
            {/* Coin Selection */}
            <div className="mb-6">
              <label htmlFor="coin-select" className="block text-lg font-medium text-gray-300 mb-2">Coin Seçin:</label>
              <select 
                id="coin-select" 
                value={selectedCoinSymbol}
                onChange={handleCoinChange}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 text-white"
              >
                {coins.map(coin => (
                  <option key={coin.symbol} value={coin.symbol}>
                    {coin.name} ({coin.symbol})
                    {coinPrices[coin.symbol] ? ` - $${coinPrices[coin.symbol].toFixed(2)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Platform Selection */}
            {selectedCoinPlatforms.length > 0 && (
              <div className="mb-6">
                <label htmlFor="platform-select" className="block text-lg font-medium text-gray-300 mb-2">Platform Seçin:</label>
                <select 
                  id="platform-select" 
                  value={selectedPlatformIndex}
                  onChange={handlePlatformChange}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 text-white"
                >
                  {selectedCoinPlatforms.map((platform, index) => (
                    <option key={`${platform.name}-${index}`} value={index}>
                      {platform.name} - %{platform.apr.toFixed(2)} APY
                      {platform.tvlUsd ? ` - TVL: $${(platform.tvlUsd / 1000000).toFixed(2)}M` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount Input */}
            <div className="mb-6">
              <label htmlFor="amount-input" className="block text-lg font-medium text-gray-300 mb-2">Miktar (Kripto Cinsinden):</label>
              <input 
                type="number" 
                id="amount-input" 
                value={amount}
                onChange={handleAmountChange}
                placeholder={`Örn: ${getStakingConstraints(selectedCoinSymbol)?.minStakeAmount || 1}`}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 text-white placeholder-gray-500"
              />
              {selectedCoinSymbol && getStakingConstraints(selectedCoinSymbol) && (
                <p className="mt-1 text-sm text-gray-400">
                  Minimum: {getStakingConstraints(selectedCoinSymbol)?.minStakeAmount} {selectedCoinSymbol}
                </p>
              )}
            </div>

            {/* Duration Input */}
            <div className="mb-6">
              <label htmlFor="duration-input" className="block text-lg font-medium text-gray-300 mb-2">Süre (Gün Olarak):</label>
              <input 
                type="number" 
                id="duration-input" 
                value={duration}
                onChange={handleDurationChange}
                placeholder="Örn: 365"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 text-white placeholder-gray-500"
              />
              {selectedCoinSymbol && getStakingConstraints(selectedCoinSymbol) && (
                <p className="mt-1 text-sm text-gray-400">
                  {getStakingConstraints(selectedCoinSymbol)?.notes}
                </p>
              )}
            </div>

            {/* Compound Options */}
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <input 
                  type="checkbox" 
                  id="compound-toggle" 
                  checked={useCompound}
                  onChange={handleCompoundToggle}
                  className="h-5 w-5 text-sky-500 rounded focus:ring-sky-500 border-gray-600 bg-gray-700"
                />
                <label htmlFor="compound-toggle" className="ml-2 text-lg font-medium text-gray-300">
                  Bileşik Faiz Kullan
                </label>
              </div>
              
              {useCompound && (
                <div className="pl-7">
                  <label htmlFor="compound-frequency" className="block text-md font-medium text-gray-400 mb-2">
                    Bileşik Döngüsü:
                  </label>
                  <select
                    id="compound-frequency"
                    value={compoundFrequency}
                    onChange={handleCompoundFrequencyChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 text-white"
                  >
                    <option value="daily">Günlük</option>
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                    <option value="quarterly">Üç Aylık</option>
                    <option value="annually">Yıllık</option>
                  </select>
                </div>
              )}
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
                {errorMessage}
              </div>
            )}

            {/* Calculate Button */}
            <button 
              onClick={calculateReward} 
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-md text-lg transition duration-150 ease-in-out mb-8"
            >
              Hesapla
            </button>

            {/* Result Display */}
            {calculatedReward !== null && (
              <div className="bg-gray-700 p-6 rounded-lg mb-8">
                <h2 className="text-2xl font-semibold text-sky-400 mb-3">Hesaplanan Ödül:</h2>
                <p className="text-3xl text-green-400">
                  {calculatedReward.toFixed(6)} {selectedCoinSymbol} 
                  {' '}
                  <span className="text-lg text-green-300">
                    {getUsdValue(calculatedReward, selectedCoinSymbol)}
                  </span>
                </p>
                
                {/* Unbonding Period Warning */}
                {(() => {
                  const constraints = getStakingConstraints(selectedCoinSymbol);
                  return constraints && constraints.unbondingPeriod > 0 ? (
                    <div className="mt-4 p-3 bg-amber-900/30 border border-amber-800 rounded-md">
                      <p className="text-amber-200">
                        <strong>Not:</strong> {selectedCoinSymbol} için unstaking süreci {constraints.unbondingPeriod} gün sürer ve bu sürede ödül alamazsınız.
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Platform APR Comparison */}
            {selectedCoinSymbol && selectedCoinPlatforms.length > 0 && (
              <div className="bg-gray-700 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-sky-400 mb-4">Platform APY Karşılaştırması ({selectedCoinSymbol}):</h2>
                <ul className="space-y-2">
                  {selectedCoinPlatforms.map((platform, index) => (
                    <li 
                      key={`${platform.name}-${index}`} 
                      className={`flex justify-between items-center p-3 rounded-md ${
                        index === selectedPlatformIndex ? 'bg-sky-900/30 border border-sky-700' : 'bg-gray-600'
                      }`}
                    >
                      <div>
                        <span className="text-gray-200">{platform.name}</span>
                        {platform.chain && (
                          <span className="ml-2 text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-300">
                            {platform.chain}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-sky-300">%{platform.apr.toFixed(2)} APY</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      <footer className="text-center text-gray-500 mt-10">
        <p>Aşama 2: Akıllı Hesaplamalar & Canlı Veri</p>
      </footer>
    </div>
  );
}

