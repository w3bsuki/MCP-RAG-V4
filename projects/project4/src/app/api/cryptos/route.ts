import { CryptoApiService } from '@/services/cryptoApi';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await CryptoApiService.getTopCryptos(20);
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto data' },
      { status: 500 }
    );
  }
}