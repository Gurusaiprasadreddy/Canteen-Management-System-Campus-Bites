import { motion } from 'framer-motion';

export function MenuItemSkeleton() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-orange-100 p-6">
      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse mb-4" />
      
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded-lg animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-1/2" />
        <div className="flex gap-2 mt-4">
          <div className="h-8 bg-gray-200 rounded-full animate-pulse w-16" />
          <div className="h-8 bg-gray-200 rounded-full animate-pulse w-16" />
          <div className="h-8 bg-gray-200 rounded-full animate-pulse w-16" />
        </div>
        <div className="h-12 bg-gray-200 rounded-xl animate-pulse mt-4" />
      </div>
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse mb-4" />
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 rounded-lg animate-pulse w-2/3" />
        <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-full" />
        <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-gray-200 rounded-lg animate-pulse w-32" />
          <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-48" />
        </div>
        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-full" />
        <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-3/4" />
      </div>
    </div>
  );
}

export function ShimmerEffect() {
  return (
    <motion.div
      animate={{
        backgroundPosition: ['200% 0', '-200% 0']
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear'
      }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
      style={{ backgroundSize: '200% 100%' }}
    />
  );
}

export default function SkeletonLoader({ type = 'menu', count = 3 }) {
  const skeletons = Array.from({ length: count });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {skeletons.map((_, index) => {
        switch (type) {
          case 'menu':
            return <MenuItemSkeleton key={index} />;
          case 'dashboard':
            return <DashboardCardSkeleton key={index} />;
          case 'order':
            return <OrderCardSkeleton key={index} />;
          default:
            return <MenuItemSkeleton key={index} />;
        }
      })}
    </div>
  );
}
