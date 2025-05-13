// Staking hesaplamaları için tip tanımlamaları
export interface StakingParameters {
  principal: number;      // Ana para miktarı
  apr: number;            // Yıllık getiri oranı (%)
  days: number;           // Staking süresi (gün)
  compoundingFrequency?: number;  // Bileşik döngüsü (günde 1, haftada 1, vs)
}

export interface StakingResult {
  principal: number;     // Ana para
  interest: number;      // Kazanılan faiz
  total: number;         // Toplam değer (ana para + faiz)
  apr: number;           // Kullanılan APR
  apy?: number;          // Hesaplanan APY (bileşik faiz kullanılıyorsa)
}

/**
 * APR'dan APY'ye dönüşüm
 * @param apr Yıllık getiri oranı (%)
 * @param compoundingFrequency Yıllık bileşik döngüsü
 * @returns Yıllık bileşik getiri oranı (%)
 */
export function aprToApy(apr: number, compoundingFrequency: number = 365): number {
  // APY = (1 + (APR / compoundingFrequency)) ^ compoundingFrequency - 1
  const periodicRate = apr / 100 / compoundingFrequency;
  const apy = Math.pow(1 + periodicRate, compoundingFrequency) - 1;
  return apy * 100; // % olarak döndür
}

/**
 * Basit faiz hesaplama
 * @param params Staking parametreleri
 * @returns Hesaplama sonuçları
 */
export function calculateSimpleInterest(params: StakingParameters): StakingResult {
  const { principal, apr, days } = params;
  
  // Günlük getiri oranını hesapla
  const dailyRate = apr / 100 / 365;
  
  // Kazanılan faiz
  const interest = principal * dailyRate * days;
  
  // Toplam değer
  const total = principal + interest;
  
  return {
    principal,
    interest,
    total,
    apr
  };
}

/**
 * Bileşik faiz hesaplama
 * @param params Staking parametreleri
 * @returns Hesaplama sonuçları
 */
export function calculateCompoundInterest(params: StakingParameters): StakingResult {
  const { principal, apr, days, compoundingFrequency = 1 } = params;
  
  // Döngü başına getiri oranını hesapla
  const periodicRate = apr / 100 / 365 * compoundingFrequency;
  
  // Döngü sayısı
  const periods = days / compoundingFrequency;
  
  // Bileşik faiz formülü: A = P * (1 + r)^n
  const total = principal * Math.pow(1 + periodicRate, periods);
  
  // Kazanılan faiz
  const interest = total - principal;
  
  // APY hesapla
  const apy = aprToApy(apr, 365 / compoundingFrequency);
  
  return {
    principal,
    interest,
    total,
    apr,
    apy
  };
}

/**
 * Verilen parametrelere göre basit veya bileşik faiz hesaplama
 * @param params Staking parametreleri
 * @param useCompound Bileşik faiz kullanılacak mı?
 * @returns Hesaplama sonuçları
 */
export function calculateStakingRewards(
  params: StakingParameters, 
  useCompound: boolean = false
): StakingResult {
  if (useCompound) {
    return calculateCompoundInterest(params);
  } else {
    return calculateSimpleInterest(params);
  }
}

/**
 * Bileşik döngü sıklığı için günlük değeri belirle
 * @param frequency Sıklık türü
 * @returns Gün cinsinden sıklık
 */
export function getCompoundingFrequency(frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'): number {
  switch (frequency) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90;
    case 'annually':
      return 365;
    default:
      return 1;
  }
} 