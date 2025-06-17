import { NextResponse } from 'next/server';
import { ClaudeService } from '@/services/claude/ClaudeService';

const claudeService = new ClaudeService();

export async function GET() {
  const stats = claudeService.getCacheStats();
  
  return NextResponse.json({
    cache: stats,
    service: {
      apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-haiku-20240307',
      cacheTimeout: '1 hour',
      retryLogic: 'enabled (max 2 retries)'
    },
    endpoints: {
      predictions: '/api/predictions/[symbol]',
      stats: '/api/claude-stats'
    },
    lastChecked: new Date().toISOString()
  });
}

export async function DELETE() {
  claudeService.clearCache();
  
  return NextResponse.json({
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  });
}