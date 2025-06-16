import React from 'react';
import clsx from 'clsx';

interface MetricsCardProps {
  title: string;
  value: string | number;
  total?: number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const colorClasses = {
  primary: {
    icon: 'text-blue-600 bg-blue-100',
    accent: 'text-blue-600'
  },
  success: {
    icon: 'text-green-600 bg-green-100',
    accent: 'text-green-600'
  },
  warning: {
    icon: 'text-yellow-600 bg-yellow-100',
    accent: 'text-yellow-600'
  },
  danger: {
    icon: 'text-red-600 bg-red-100',
    accent: 'text-red-600'
  },
  info: {
    icon: 'text-blue-600 bg-blue-100',
    accent: 'text-blue-600'
  }
};

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  total,
  icon,
  color,
  trend
}) => {
  const classes = colorClasses[color];

  return (
    <div className="card">
      <div className="flex items-center">
        <div className={clsx('p-3 rounded-lg', classes.icon)}>
          {icon}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {total !== undefined && (
              <p className="ml-2 text-sm text-gray-500">/ {total}</p>
            )}
          </div>
          {trend && (
            <div className="flex items-center mt-1">
              <span
                className={clsx(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};