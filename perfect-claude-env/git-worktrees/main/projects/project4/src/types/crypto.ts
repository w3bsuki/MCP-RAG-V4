export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  image: string;
}

export interface MarketOverview {
  total_market_cap: number;
  market_cap_change_percentage_24h: number;
  total_volume: number;
  active_cryptocurrencies: number;
}

export interface PriceHistory {
  timestamp: number;
  price: number;
}