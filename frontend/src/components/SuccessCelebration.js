import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SuccessCelebration({ show, onClose, title, message, tokenNumber }) {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const particles = [];
      for (let i = 0; i < 50; i++) {
        particles.push({
          id: i,
          x: Math.random() * 100,
          y: -10,
          rotation: Math.random() * 360,
          color: ['#f97316', '#fb923c', '#fdba74', '#fbbf24', '#facc15'][Math.floor(Math.random() * 5)],
          delay: Math.random() * 0.3,
          duration: 2 + Math.random() * 2
        });
      }
      setConfetti(particles);

      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          {/* Confetti */}
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                x: `${particle.x}vw`,
                y: -20,
                rotate: 0,
                opacity: 1
              }}
              animate={{
                y: '100vh',
                rotate: particle.rotation * 4,
                opacity: 0
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeIn'
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{ backgroundColor: particle.color }}
            />
          ))}

          {/* Success Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 15, stiffness: 300 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="bg-gradient-to-br from-green-400 to-green-600 rounded-full p-6 shadow-lg"
                >
                  <CheckCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
                </motion.div>

                {/* Pulse rings */}
                <motion.div
                  animate={{
                    scale: [1, 2, 2],
                    opacity: [0.5, 0, 0]
                  }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                  className="absolute inset-0 bg-green-400 rounded-full"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-3">{title || 'Success!'}</h2>
              <p className="text-gray-600 mb-6">{message || 'Your action was completed successfully'}</p>

              {tokenNumber && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 mb-6 border-2 border-orange-200"
                >
                  <p className="text-sm text-gray-600 mb-2">Your Token Number</p>
                  <p className="text-5xl font-mono font-bold text-orange-600 tracking-wider">
                    {tokenNumber}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Show this to the crew counter</p>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
              >
                Awesome!
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
