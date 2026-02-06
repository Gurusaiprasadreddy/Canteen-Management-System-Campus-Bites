import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, ShoppingCart, TrendingUp, Sparkles, LogOut, History, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';
import { getAuth, clearAuth } from '@/utils/auth';
import { getCartItemCount } from '@/utils/cart';
import { toast } from 'sonner';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/student/login');
      return;
    }
    fetchCanteens();
    setCartCount(getCartItemCount());
  }, [user?.user_id, navigate]);

  const fetchCanteens = async () => {
    try {
      const response = await api.get('/canteens');
      setCanteens(response.data);
    } catch (error) {
      toast.error('Failed to load canteens');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading canteens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Utensils className="w-6 h-6 text-orange-600" />
              <span className="text-xl font-bold gradient-text">Campus Bites</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/student/cart" className="relative" data-testid="cart-link">
                <Button variant="outline" size="sm" className="rounded-full">
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, <span className="gradient-text">{user?.name}!</span>
          </h1>
          <p className="text-gray-600 text-lg">What would you like to eat today?</p>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <Link to="/student/orders/history" data-testid="quick-action-history">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-orange-100 hover:shadow-xl"
            >
              <History className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-bold text-gray-900">Order History</h3>
              <p className="text-sm text-gray-600">View past orders</p>
            </motion.div>
          </Link>

          <Link to="/student/orders/tracking" data-testid="quick-action-tracking">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-orange-100 hover:shadow-xl"
            >
              <Clock className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-bold text-gray-900">Track Order</h3>
              <p className="text-sm text-gray-600">Real-time updates</p>
            </motion.div>
          </Link>

          <Link to="/student/spending" data-testid="quick-action-spending">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-orange-100 hover:shadow-xl"
            >
              <TrendingUp className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-bold text-gray-900">Spending</h3>
              <p className="text-sm text-gray-600">Track your budget</p>
            </motion.div>
          </Link>

          <Link to="/student/ai-recommendations" data-testid="quick-action-ai">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-orange-100 hover:shadow-xl"
            >
              <Sparkles className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-bold text-gray-900">AI Suggestions</h3>
              <p className="text-sm text-gray-600">Personalized meals</p>
            </motion.div>
          </Link>
        </div>

        {/* Canteens Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-6">
            <span className="gradient-text">Choose Your Canteen</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {canteens.map((canteen, index) => (
              <motion.div
                key={canteen.canteen_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                data-testid={`canteen-card-${canteen.canteen_id}`}
              >
                <div
                  onClick={() => navigate(`/student/canteen/${canteen.canteen_id}`)}
                  className="bg-white rounded-3xl overflow-hidden shadow-xl border border-orange-100 hover:shadow-2xl card-hover cursor-pointer"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={canteen.image_url}
                      alt={canteen.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">{canteen.name}</h3>
                    <p className="text-gray-600 mb-4">{canteen.description}</p>
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <Clock className="w-4 h-4" />
                      <span>{canteen.operating_hours}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
