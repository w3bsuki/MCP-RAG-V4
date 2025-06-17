export interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  buyPrice: number;
  currentPrice: number;
  value: number;
  profit: number;
  profitPercent: number;
  addedAt: Date;
}

export interface PortfolioStats {
  totalValue: number;
  totalProfit: number;
  totalProfitPercent: number;
  totalInvested: number;
}