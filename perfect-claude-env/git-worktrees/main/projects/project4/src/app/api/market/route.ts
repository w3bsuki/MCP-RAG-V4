import { CryptoApiService } from '@/services/cryptoApi';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await CryptoApiService.getMarketOverview();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}