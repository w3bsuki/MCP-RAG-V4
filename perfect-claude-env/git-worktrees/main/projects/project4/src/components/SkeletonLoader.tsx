'use client';

interface SkeletonLoaderProps {
  className?: string;
  rows?: number;
  animated?: boolean;
}

export function SkeletonLoader({ 
  className = '', 
  rows = 1, 
  animated = true 
}: SkeletonLoaderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div 
          key={index}
          className={`
            bg-terminal-darkgray h-4 border-2 border-terminal-darkgray shadow-sunken
            ${animated ? 'animate-pulse' : ''}
          `}
        />
      ))}
    </div>
  );
}

export function CryptoTableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="bg-terminal-gray border-2 border-terminal-darkgray shadow-raised p-3">
        <SkeletonLoader className="w-1/3" />
      </div>
      
      {/* Row skeletons */}
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="bg-terminal-gray border-2 border-terminal-darkgray shadow-raised p-3">
          <div className="flex justify-between items-center space-x-4">
            <SkeletonLoader className="w-1/4" />
            <SkeletonLoader className="w-1/6" />
            <SkeletonLoader className="w-1/6" />
            <SkeletonLoader className="w-1/6" />
            <SkeletonLoader className="w-1/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketOverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-terminal-gray border-2 border-terminal-darkgray shadow-raised p-4">
          <SkeletonLoader rows={2} className="space-y-2" />
        </div>
      ))}
    </div>
  );
}