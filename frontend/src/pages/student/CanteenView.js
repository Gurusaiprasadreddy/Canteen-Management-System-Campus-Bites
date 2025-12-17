import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, ShoppingCart, ArrowLeft, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { addToCart, getCartItemCount } from '@/utils/cart';
import { toast } from 'sonner';

export default function CanteenView() {
  const { canteenId } = useParams();
  const navigate = useNavigate();
  const { user } = getAuth();
  const [canteen, setCanteen] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [selectedAllergyFilter, setSelectedAllergyFilter] = useState('all');
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/student/login');
      return;
    }
    fetchData();
    setCartCount(getCartItemCount());
  }, [canteenId, user, navigate]);

  useEffect(() => {
    filterItems();
  }, [searchQuery, selectedCategory, sortBy, selectedAllergyFilter, menuItems]);

  const fetchData = async () => {
    try {
      const [canteenRes, menuRes] = await Promise.all([
        api.get('/canteens'),
        api.get(`/menu/${canteenId}`)
      ]);
      
      const currentCanteen = canteenRes.data.find(c => c.canteen_id === canteenId);
      setCanteen(currentCanteen);
      setMenuItems(menuRes.data.filter(item => item.available));
      setFilteredItems(menuRes.data.filter(item => item.available));
    } catch (error) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = menuItems;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ingredients.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Sort items
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'calories-low':
          return a.nutrition.calories - b.nutrition.calories;
        case 'calories-high':
          return b.nutrition.calories - a.nutrition.calories;
        case 'protein-high':
          return b.nutrition.protein - a.nutrition.protein;
        case 'carbs-low':
          return a.nutrition.carbs - b.nutrition.carbs;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredItems(filtered);
  };

  const categories = ['All', ...new Set(menuItems.map(item => item.category))];

  const handleAddToCart = (item) => {
    addToCart(item, 1);
    setCartCount(getCartItemCount());
    toast.success(`${item.name} added to cart!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/student/dashboard')} data-testid="back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Utensils className="w-6 h-6 text-orange-600" />
                <span className="text-xl font-bold gradient-text">{canteen?.name}</span>
              </div>
            </div>
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 gradient-text">{canteen?.name}</h1>
          <p className="text-gray-600">{canteen?.description}</p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by name or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-gray-200"
              data-testid="search-input"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full whitespace-nowrap"
                  data-testid={`category-${category}`}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                data-testid="sort-select"
              >
                <option value="name">Name (A-Z)</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="calories-low">Calories: Low to High</option>
                <option value="calories-high">Calories: High to Low</option>
                <option value="protein-high">Protein: High to Low</option>
                <option value="carbs-low">Carbs: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.item_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl overflow-hidden shadow-lg border border-orange-100 hover:shadow-2xl card-hover"
              data-testid={`menu-item-${item.item_id}`}
            >
              <div className="h-48 overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                <Utensils className="w-20 h-20 text-orange-300" />
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{item.name}</h3>
                    <Badge variant={item.veg_type === 'veg' ? 'secondary' : 'destructive'} className="text-xs">
                      {item.veg_type === 'veg' ? 'Veg' : 'Non-Veg'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">₹{item.price}</p>
                    <p className="text-xs text-gray-500">{item.nutrition.calories} kcal</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.ingredients}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded-full">
                    P: {item.nutrition.protein}g
                  </span>
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                    C: {item.nutrition.carbs}g
                  </span>
                  <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
                    F: {item.nutrition.fat}g
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">
                    Fiber: {item.nutrition.fiber}g
                  </span>
                </div>

                <Button
                  onClick={() => handleAddToCart(item)}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  data-testid={`add-to-cart-${item.item_id}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No items found</p>
          </div>
        )}
      </main>
    </div>
  );
}
