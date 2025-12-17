import { motion } from 'framer-motion';
import { ShoppingCart, Search, Clock, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';

const animations = {
  float: {
    y: [0, -20, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export default function EmptyState({ type = 'cart', onAction, actionText, actionTestId }) {
  const configs = {
    cart: {
      icon: ShoppingCart,
      title: 'Your cart is empty',
      description: 'Add some delicious items to get started!',
      gradient: 'from-orange-200 to-amber-200'
    },
    search: {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search or filters',
      gradient: 'from-blue-200 to-purple-200'
    },
    orders: {
      icon: Clock,
      title: 'No orders yet',
      description: 'Start ordering to see your history here',
      gradient: 'from-green-200 to-teal-200'
    },
    menu: {
      icon: Utensils,
      title: 'No items available',
      description: 'Check back later for new items',
      gradient: 'from-pink-200 to-rose-200'
    }
  };

  const config = configs[type] || configs.cart;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Animated Icon */}
        <motion.div
          animate={animations.float}
          className="relative mx-auto w-32 h-32 mb-6"
        >
          <motion.div
            animate={animations.pulse}
            className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-full opacity-20`}
          />
          <div className="relative flex items-center justify-center w-full h-full">
            <Icon className="w-16 h-16 text-gray-400" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Text */}
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          {config.title}
        </motion.h3>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 mb-6"
        >
          {config.description}
        </motion.p>

        {/* Action Button */}
        {onAction && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={onAction}
              className="rounded-full px-8 py-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg"
              data-testid={actionTestId}
            >
              {actionText || 'Browse Menu'}
            </Button>
          </motion.div>
        )}

        {/* Decorative Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear'
            }}
            className={`absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br ${config.gradient} rounded-full blur-3xl opacity-20`}
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [360, 180, 0]
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'linear'
            }}
            className={`absolute bottom-1/4 right-1/4 w-40 h-40 bg-gradient-to-br ${config.gradient} rounded-full blur-3xl opacity-20`}
          />
        </div>
      </motion.div>
    </div>
  );
}
