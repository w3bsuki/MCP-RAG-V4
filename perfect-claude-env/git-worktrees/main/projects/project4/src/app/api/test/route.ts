import { CryptoApiService } from '@/services/cryptoApi';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await CryptoApiService.getTopCryptos(5);
    return NextResponse.json({ 
      success: true, 
      count: data.length,
      firstCrypto: data[0]?.name,
      price: data[0]?.current_price 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}