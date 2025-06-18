import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PortfolioItem, PortfolioStats } from '@/types/portfolio';

interface PortfolioStore {
  items: PortfolioItem[];
  addItem: (symbol: string, name: string, amount: number, buyPrice: number) => void;
  removeItem: (id: string) => void;
  updateCurrentPrices: (prices: Record<string, number>) => void;
  getStats: () => PortfolioStats;
  clearPortfolio: () => void;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (symbol, name, amount, buyPrice) => {
        const newItem: PortfolioItem = {
          id: crypto.randomUUID(),
          symbol: symbol.toUpperCase(),
          name,
          amount,
          buyPrice,
          currentPrice: buyPrice, // Will be updated by price updates
          value: amount * buyPrice,
          profit: 0,
          profitPercent: 0,
          addedAt: new Date(),
        };
        
        set((state) => ({
          items: [...state.items, newItem],
        }));
      },
      
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },
      
      updateCurrentPrices: (prices) => {
        set((state) => ({
          items: state.items.map((item) => {
            const currentPrice = prices[item.symbol.toLowerCase()] || item.currentPrice;
            const value = item.amount * currentPrice;
            const profit = value - (item.amount * item.buyPrice);
            const profitPercent = ((currentPrice - item.buyPrice) / item.buyPrice) * 100;
            
            return {
              ...item,
              currentPrice,
              value,
              profit,
              profitPercent,
            };
          }),
        }));
      },
      
      getStats: () => {
        const items = get().items;
        const totalValue = items.reduce((sum, item) => sum + item.value, 0);
        const totalInvested = items.reduce((sum, item) => sum + (item.amount * item.buyPrice), 0);
        const totalProfit = totalValue - totalInvested;
        const totalProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
        
        return {
          totalValue,
          totalProfit,
          totalProfitPercent,
          totalInvested,
        };
      },
      
      clearPortfolio: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'crypto-portfolio',
    }
  )
);