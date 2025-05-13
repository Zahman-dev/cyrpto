"use client";

import { useState, useEffect } from 'react';
import stakingData from '../lib/staking_data.json'; // Adjust path if necessary

interface Platform {
  name: string;
  apr: number;
}

interface CoinData {
  name: string;
  symbol: string;
  platforms: Platform[];
}

export default function StakingCalculatorPage() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [selectedCoinSymbol, setSelectedCoinSymbol] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [duration, setDuration] = useState<string>(''); // Duration in days
  const [calculatedReward, setCalculatedReward] = useState<number | null>(null);
  const [selectedCoinPlatforms, setSelectedCoinPlatforms] = useState<Platform[]>([]);

  useEffect(() => {
    // Type assertion as stakingData is imported directly
    setCoins(stakingData as CoinData[]);
    if (stakingData.length > 0) {
      setSelectedCoinSymbol((stakingData as CoinData[])[0].symbol);
    }
  }, []);

  useEffect(() => {
    if (selectedCoinSymbol) {
      const coin = coins.find(c => c.symbol === selectedCoinSymbol);
      if (coin) {
        setSelectedCoinPlatforms(coin.platforms);
      } else {
        setSelectedCoinPlatforms([]);
      }
    }
    // Reset reward when coin changes
    setCalculatedReward(null);
  }, [selectedCoinSymbol, coins]);

  const handleCoinChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCoinSymbol(event.target.value);
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value);
  };

  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDuration(event.target.value);
  };

  const calculateReward = () => {
    if (!selectedCoinSymbol || !amount || !duration || parseFloat(amount) <= 0 || parseInt(duration) <= 0) {
      setCalculatedReward(null);
      alert("Lütfen geçerli bir coin, miktar ve süre girin.");
      return;
    }

    const principal = parseFloat(amount);
    const days = parseInt(duration);
    const coin = coins.find(c => c.symbol === selectedCoinSymbol);

    if (coin && coin.platforms.length > 0) {
      // For MVP, let's use the APR of the first platform available for the selected coin.
      // In a more advanced version, the user might select a specific platform.
      const platform = coin.platforms[0];
      const apr = platform.apr / 100; // Convert percentage to decimal
      const reward = principal * apr * (days / 365);
      setCalculatedReward(reward);
    } else {
      setCalculatedReward(null);
      alert("Seçilen coin için platform bilgisi bulunamadı veya APR oranı mevcut değil.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold text-center text-sky-400 mb-8">Kripto Stake Ödül Hesaplayıcı</h1>

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
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label htmlFor="amount-input" className="block text-lg font-medium text-gray-300 mb-2">Miktar (Kripto Cinsinden):</label>
          <input 
            type="number" 
            id="amount-input" 
            value={amount}
            onChange={handleAmountChange}
            placeholder="Örn: 100"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 text-white placeholder-gray-500"
          />
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
        </div>

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
            <p className="text-3xl text-green-400">{calculatedReward.toFixed(6)} {selectedCoinSymbol}</p>
          </div>
        )}

        {/* Platform APR Comparison */}
        {selectedCoinSymbol && selectedCoinPlatforms.length > 0 && (
          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-sky-400 mb-4">Platform APR Karşılaştırması ({selectedCoinSymbol}):</h2>
            <ul className="space-y-2">
              {selectedCoinPlatforms.map(platform => (
                <li key={platform.name} className="flex justify-between items-center p-3 bg-gray-600 rounded-md">
                  <span className="text-gray-200">{platform.name}</span>
                  <span className="font-semibold text-sky-300">%{platform.apr.toFixed(2)} APR</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <footer className="text-center text-gray-500 mt-10">
        <p>MVP Aşaması - Manus AI tarafından geliştirildi.</p>
      </footer>
    </div>
  );
}

