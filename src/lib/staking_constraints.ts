// Staking kısıtlamaları ve coin bilgileri için arayüzler
export interface StakingPeriod {
  name: string;       // Periyot adı (örn: "Flexible", "30 days", vb.)
  minDays: number;    // Minimum stake süresi (gün)
  maxDays: number | null;  // Maksimum stake süresi (gün) (null = sınırsız)
  apr?: number;       // Bu periyoda özel APR (varsa)
}

export interface CoinStakingConstraints {
  symbol: string;            // Coin sembolü
  name: string;              // Coin adı
  minStakeAmount: number;    // Minimum stake edilebilir miktar
  unbondingPeriod: number;   // Çözülme süresi (gün)
  stakingPeriods: StakingPeriod[];  // Desteklenen stake süreleri
  notes?: string;            // Ek notlar
  stakingMethod?: string;    // Stake yöntemi (liquid, delegated, vb.)
  stakingRisks?: string[];   // Stake riskleri
  rewardType?: string;       // Ödül tipi (aynı token, farklı token, vb.)
}

// Desteklenen coinler ve staking kısıtlamaları
const stakingConstraints: CoinStakingConstraints[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    minStakeAmount: 0.01,
    unbondingPeriod: 0, // Liquid staking için sıfır
    stakingPeriods: [
      { name: "Flexible", minDays: 1, maxDays: null }
    ],
    notes: "Liquid staking olarak işletilebilir, bu yüzden çözülme süresi yoktur.",
    stakingMethod: "Liquid Staking",
    stakingRisks: ["Smart contract riski", "Validator riski"],
    rewardType: "ETH"
  },
  {
    symbol: "SOL",
    name: "Solana",
    minStakeAmount: 0.1,
    unbondingPeriod: 2, // 2-3 gün çözülme
    stakingPeriods: [
      { name: "Flexible", minDays: 1, maxDays: null }
    ],
    notes: "Solana'da unstaking süreci 2-3 gün sürer.",
    stakingMethod: "Delegation",
    stakingRisks: ["Validator riski", "Network durma riski"],
    rewardType: "SOL"
  },
  {
    symbol: "ADA",
    name: "Cardano",
    minStakeAmount: 5,
    unbondingPeriod: 0, // Anında çekilebilir
    stakingPeriods: [
      { name: "Flexible", minDays: 1, maxDays: null }
    ],
    notes: "Cardano'da staking yaparken fonlarınız kilitlenmez, istediğiniz zaman çekebilirsiniz.",
    stakingMethod: "Delegation",
    stakingRisks: ["Düşük riskli"],
    rewardType: "ADA"
  },
  {
    symbol: "DOT",
    name: "Polkadot",
    minStakeAmount: 1,
    unbondingPeriod: 28, // 28 gün çözülme süresi
    stakingPeriods: [
      { name: "Bonded", minDays: 28, maxDays: null }
    ],
    notes: "Unbonding süresi 28 gündür ve bu süre içinde ödül alınmaz.",
    stakingMethod: "Bonding",
    stakingRisks: ["Likidite kilidi", "Slashing riski"],
    rewardType: "DOT"
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    minStakeAmount: 1,
    unbondingPeriod: 14, // 14 gün çözülme süresi
    stakingPeriods: [
      { name: "Flexible", minDays: 14, maxDays: 365 }
    ],
    notes: "Avalanche'da stake süresi 14 ile 365 gün arasında değişebilir.",
    stakingMethod: "Delegation",
    stakingRisks: ["Validator riski", "Likidite kilidi"],
    rewardType: "AVAX"
  },
  {
    symbol: "ATOM",
    name: "Cosmos",
    minStakeAmount: 0.1,
    unbondingPeriod: 21, // 21 gün çözülme süresi
    stakingPeriods: [
      { name: "Bonded", minDays: 21, maxDays: null }
    ],
    notes: "Unbonding süresi 21 gündür ve bu süre içinde ödül alınmaz.",
    stakingMethod: "Delegation",
    stakingRisks: ["Likidite kilidi", "Slashing riski"],
    rewardType: "ATOM"
  },
  {
    symbol: "ALGO",
    name: "Algorand",
    minStakeAmount: 1,
    unbondingPeriod: 0, // Anında çekilebilir
    stakingPeriods: [
      { name: "Flexible", minDays: 1, maxDays: null }
    ],
    notes: "Algorand stake işlemi anında ve herhangi bir kilitleme olmadan gerçekleşir.",
    stakingMethod: "Participation",
    stakingRisks: ["Düşük riskli"],
    rewardType: "ALGO"
  }
];

/**
 * Bir coin için staking kısıtlamalarını getir
 * @param symbol Coin sembolü
 * @returns Coin kısıtlamaları, bulunamazsa null
 */
export function getStakingConstraints(symbol: string): CoinStakingConstraints | null {
  const normalizedSymbol = symbol.toUpperCase();
  return stakingConstraints.find(coin => coin.symbol === normalizedSymbol) || null;
}

/**
 * Tüm desteklenen coinlerin kısıtlamalarını getir
 * @returns Coin kısıtlamaları listesi
 */
export function getAllStakingConstraints(): CoinStakingConstraints[] {
  return [...stakingConstraints];
}

/**
 * Bir coin için minimum stake miktarını kontrol et
 * @param symbol Coin sembolü
 * @param amount Kontrol edilecek miktar
 * @returns Geçerli ise true, değilse false
 */
export function isValidStakeAmount(symbol: string, amount: number): boolean {
  const constraints = getStakingConstraints(symbol);
  if (!constraints) return true; // Kısıtlama yoksa geçerli say
  
  return amount >= constraints.minStakeAmount;
}

/**
 * Bir coin için geçerli stake süresini kontrol et
 * @param symbol Coin sembolü
 * @param days Kontrol edilecek gün sayısı
 * @returns Geçerli ise true, değilse false
 */
export function isValidStakeDuration(symbol: string, days: number): boolean {
  const constraints = getStakingConstraints(symbol);
  if (!constraints) return true; // Kısıtlama yoksa geçerli say
  
  // Desteklenen herhangi bir periyoda uygunsa geçerli
  return constraints.stakingPeriods.some(period => {
    return days >= period.minDays && (period.maxDays === null || days <= period.maxDays);
  });
} 