'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PredictionCard } from '@/components/PredictionCard';
import { MarketSentiment } from '@/components/MarketSentiment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import predictionsData from '@/data/predictions.json';

export default function AIPredictionsPage() {
  const [isPremium, setIsPremium] = useState(false);

  return (
    <div className="min-h-screen p-8 bg-terminal-black text-terminal-white font-mono">
      <main className="max-w-7xl mx-auto space-y-8">
        <Navigation />
        
        {/* Terminal Header */}
        <div className="text-center mb-8 border-2 border-terminal-gray bg-terminal-gray text-terminal-black p-4">
          <div className="text-xs mb-2">████████████████████████████████████████████████</div>
          <h1 className="text-4xl font-bold mb-2">
            AI PREDICTIONS v1.0
          </h1>
          <p className="text-lg">
            CLAUDE-POWERED CRYPTOCURRENCY PRICE PREDICTIONS
          </p>
          <div className="text-xs mt-2">████████████████████████████████████████████████</div>
        </div>

        {/* Premium Toggle (Demo) */}
        <Card>
          <CardHeader>
            <CardTitle>SUBSCRIPTION STATUS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-mono">
                  CURRENT PLAN: {isPremium ? 'PREMIUM' : 'FREE TIER'}
                </div>
                <div className="text-xs text-terminal-darkgray mt-1">
                  {isPremium 
                    ? 'FULL ACCESS TO ALL AI PREDICTIONS' 
                    : 'LIMITED PREVIEW - UPGRADE FOR FULL ACCESS'}
                </div>
              </div>
              <Button
                variant={isPremium ? 'destructive' : 'default'}
                onClick={() => setIsPremium(!isPremium)}
                className="font-mono"
              >
                {isPremium ? 'DOWNGRADE TO FREE' : 'UPGRADE TO PREMIUM'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Market Sentiment Overview */}
        <MarketSentiment 
          data={predictionsData.marketContext} 
          isPremium={isPremium}
        />

        {/* Prediction Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(predictionsData.predictions).map(([crypto, data]) => (
            <PredictionCard
              key={crypto}
              crypto={crypto}
              data={data}
              isPremium={isPremium}
            />
          ))}
        </div>

        {/* AI Model Info */}
        <Card>
          <CardHeader>
            <CardTitle>AI MODEL INFORMATION</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div>
                <div className="text-xs text-terminal-darkgray">MODEL</div>
                <div>{predictionsData.metadata.model.toUpperCase()}</div>
              </div>
              <div>
                <div className="text-xs text-terminal-darkgray">LAST UPDATE</div>
                <div>{new Date(predictionsData.metadata.generatedAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-terminal-darkgray">NEXT UPDATE</div>
                <div>{new Date(predictionsData.metadata.nextUpdate).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-terminal-darkgray">CONFIDENCE</div>
                <div className="text-terminal-green">HIGH</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-terminal-black border-2 border-terminal-red">
              <div className="text-xs text-terminal-red font-bold">
                ⚠️ DISCLAIMER: {predictionsData.metadata.disclaimer}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lucky 8-Ball Feature */}
        <Card>
          <CardHeader>
            <CardTitle>LUCKY 8-BALL PREDICTOR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <pre className="text-xs text-terminal-green mb-4">
{`     .-..-. 
    ( o  o )
     |  >  |
     |_____|`}
              </pre>
              <Button 
                variant="outline"
                className="font-mono"
                onClick={() => {
                  const responses = [
                    "BUY THE DIP",
                    "HODL STRONG", 
                    "MOON SOON",
                    "REKT INCOMING",
                    "PUMP IT",
                    "PROBABLY NOTHING",
                    "WAGMI",
                    "NGMI"
                  ];
                  const random = responses[Math.floor(Math.random() * responses.length)];
                  alert(`8-BALL SAYS: ${random}`);
                }}
              >
                ASK THE 8-BALL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Terminal Footer */}
        <div className="text-center text-xs text-terminal-darkgray border-t-2 border-terminal-darkgray pt-4">
          <div className="font-mono">
            AI STATUS: ONLINE • MODEL: CLAUDE-3-OPUS • 
            {isPremium ? ' PREMIUM ACCESS ACTIVE' : ' UPGRADE FOR FULL PREDICTIONS'}
          </div>
        </div>
      </main>
    </div>
  );
}