'use client';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}

const colorStyles = {
  blue: 'bg-[#2D5BFF]/10 text-[#2D5BFF]',
  green: 'bg-green-500/10 text-green-600',
  yellow: 'bg-yellow-500/10 text-yellow-600',
  red: 'bg-red-500/10 text-red-600',
  purple: 'bg-purple-500/10 text-purple-600',
  gray: 'bg-gray-500/10 text-gray-600',
};

export function StatCard({ title, value, icon, change, color = 'blue' }: StatCardProps) {
  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl shadow-glass border border-white/20 dark:border-slate-700/30 p-6 hover:shadow-xl hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change && (
            <p
              className={`mt-2 text-sm font-medium ${
                change.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {change.isPositive ? '+' : '-'}{Math.abs(change.value)}%
              <span className="text-gray-500 dark:text-gray-400 ml-1">จากเดือนก่อน</span>
            </p>
          )}
        </div>
        <div className={`p-4 rounded-2xl ${colorStyles[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
