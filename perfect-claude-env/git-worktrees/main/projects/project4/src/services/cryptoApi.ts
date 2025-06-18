import axios from 'axios';
import { CryptoData, MarketOverview } from '@/types/crypto';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Mock data for fallback when API is rate limited
const MOCK_CRYPTO_DATA: CryptoData[] = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    current_price: 45230.12,
    market_cap: 880000000000,
    market_cap_rank: 1,
    price_change_percentage_24h: 2.34,
    total_volume: 28000000000
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    current_price: 2845.67,
    market_cap: 340000000000,
    market_cap_rank: 2,
    price_change_percentage_24h: 1.89,
    total_volume: 15000000000
  },
  {
    id: 'tether',
    symbol: 'usdt',
    name: 'Tether',
    image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    current_price: 1.00,
    market_cap: 120000000000,
    market_cap_rank: 3,
    price_change_percentage_24h: 0.02,
    total_volume: 35000000000
  },
  {
    id: 'solana',
    symbol: 'sol',
    name: 'Solana',
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    current_price: 102.45,
    market_cap: 44000000000,
    market_cap_rank: 4,
    price_change_percentage_24h: 3.21,
    total_volume: 2000000000
  }
];

const MOCK_MARKET_OVERVIEW: MarketOverview = {
  total_market_cap: 1800000000000,
  market_cap_change_percentage_24h: 2.1,
  total_volume: 85000000000,
  active_cryptocurrencies: 13847
};

export class CryptoApiService {
  static async getTopCryptos(limit: number = 20): Promise<CryptoData[]> {
    try {
      const response = await axios.get(`${COINGECKO_API}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch crypto data, using mock data:', error.message);
      
      // Return mock data with slight randomization for demo
      return MOCK_CRYPTO_DATA.slice(0, Math.min(limit, MOCK_CRYPTO_DATA.length)).map(crypto => ({
        ...crypto,
        current_price: crypto.current_price * (0.98 + Math.random() * 0.04), // ±2% variation
        price_change_percentage_24h: crypto.price_change_percentage_24h + (Math.random() - 0.5) * 2
      }));
    }
  }

  static async getMarketOverview(): Promise<MarketOverview> {
    try {
      const response = await axios.get(`${COINGECKO_API}/global`, {
        timeout: 10000 // 10 second timeout
      });
      const data = response.data.data;
      return {
        total_market_cap: data.total_market_cap.usd,
        market_cap_change_percentage_24h: data.market_cap_change_percentage_24h_usd,
        total_volume: data.total_volume.usd,
        active_cryptocurrencies: data.active_cryptocurrencies
      };
    } catch (error: any) {
      console.error('Failed to fetch market overview, using mock data:', error.message);
      
      // Return mock data with slight randomization
      return {
        ...MOCK_MARKET_OVERVIEW,
        total_market_cap: MOCK_MARKET_OVERVIEW.total_market_cap * (0.98 + Math.random() * 0.04),
        market_cap_change_percentage_24h: MOCK_MARKET_OVERVIEW.market_cap_change_percentage_24h + (Math.random() - 0.5) * 2
      };
    }
  }

  static async getCryptoPrice(id: string): Promise<number> {
    try {
      const response = await axios.get(`${COINGECKO_API}/simple/price`, {
        params: {
          ids: id,
          vs_currencies: 'usd'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data[id].usd;
    } catch (error: any) {
      console.error(`Failed to fetch price for ${id}, using mock data:`, error.message);
      
      // Return mock price based on id
      const mockData = MOCK_CRYPTO_DATA.find(crypto => crypto.id === id);
      if (mockData) {
        return mockData.current_price * (0.98 + Math.random() * 0.04); // ±2% variation
      }
      
      // Default fallback price
      return 100 * (0.5 + Math.random()); // Random price between $50-$150
    }
  }
}