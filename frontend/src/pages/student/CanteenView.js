import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, ShoppingCart, ArrowLeft, Search, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { addToCart, getCartItemCount } from '@/utils/cart';
import { toast } from 'sonner';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';

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
  const [myRatings, setMyRatings] = useState({});  // item_id → stars
  const [hoverStars, setHoverStars] = useState({});  // item_id → hovered star
  const [submittingRating, setSubmittingRating] = useState(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    if (!user) {
      navigate('/student/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [canteenRes, menuRes] = await Promise.all([
          api.get('/canteens', { signal: controller.signal }),
          api.get(`/menu/${canteenId}`, { signal: controller.signal })
        ]);

        if (mounted) {
          const currentCanteen = canteenRes.data.find(c => c.canteen_id === canteenId);
          setCanteen(currentCanteen);
          setMenuItems(menuRes.data);
          setFilteredItems(menuRes.data);
        }

        // Fetch user's own ratings
        try {
          const ratingsRes = await api.get('/ratings/my/given');
          const ratingsMap = {};
          ratingsRes.data.forEach(r => { ratingsMap[r.item_id] = r.stars; });
          if (mounted) setMyRatings(ratingsMap);
        } catch {} // ratings are optional
      } catch (error) {
        if (mounted && error.name !== 'CanceledError') {
          console.error("Error fetching data:", error);
          toast.error('Failed to load menu');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    setCartCount(getCartItemCount());

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [canteenId, user?.user_id, navigate]);

  useEffect(() => {
    filterItems();
  }, [searchQuery, selectedCategory, sortBy, selectedAllergyFilter, menuItems]);

  useEffect(() => {
    // Scroll to item if navigated with hash
    if (!loading && filteredItems.length > 0 && window.location.hash) {
      const id = window.location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Optional: Add a brief highlight class to bring attention
          element.classList.add('ring-4', 'ring-orange-500', 'ring-opacity-50', 'transition-all', 'duration-1000');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-orange-500', 'ring-opacity-50');
          }, 2000);
        }
      }, 100);
    }
  }, [loading, filteredItems, window.location.hash]);

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

    // Allergy filters
    if (selectedAllergyFilter !== 'all') {
      filtered = filtered.filter(item => {
        const allergens = item.allergens.toLowerCase();
        switch (selectedAllergyFilter) {
          case 'dairy-free':
            return !allergens.includes('dairy');
          case 'gluten-free':
            return !allergens.includes('gluten');
          case 'nut-free':
            return !allergens.includes('nut');
          case 'veg-only':
            return item.veg_type === 'veg';
          case 'non-veg-only':
            return item.veg_type === 'non-veg';
          default:
            return true;
        }
      });
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
        case 'rating-high':
          return (b.avg_rating || 0) - (a.avg_rating || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredItems(filtered);
  };

  const categories = ['All', ...new Set(menuItems.map(item => item.category))];

  const handleAddToCart = (item) => {
    if (!item.available || item.stock_qty <= 0) {
      toast.error('This item is unavailable (Out of Stock)');
      return;
    }
    addToCart(item, 1);
    setCartCount(getCartItemCount());
    toast.success(`${item.name} added to cart!`);
  };

  const getOptimizedImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8001';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleRateItem = async (item_id, stars) => {
    setSubmittingRating(item_id);
    try {
      const res = await api.post('/ratings', { item_id, stars, review: '' });
      setMyRatings(prev => ({ ...prev, [item_id]: stars }));
      // Update avg_rating in local state
      setMenuItems(prev => prev.map(it =>
        it.item_id === item_id
          ? { ...it, avg_rating: res.data.avg_rating, rating_count: (it.rating_count || 0) + 1 }
          : it
      ));
      toast.success(`Rated ${stars} ⭐`);
    } catch (e) {
      toast.error('Failed to submit rating');
    } finally {
      setSubmittingRating(null);
    }
  };

  // Inline star component
  const StarDisplay = ({ itemId, avgRating, ratingCount }) => {
    const myRating = myRatings[itemId] || 0;
    const hover = hoverStars[itemId] || 0;
    const displayRating = hover || myRating;
    return (
      <div style={{ margin: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[1,2,3,4,5].map(s => (
            <button
              key={s}
              onClick={() => handleRateItem(itemId, s)}
              onMouseEnter={() => setHoverStars(p => ({ ...p, [itemId]: s }))}
              onMouseLeave={() => setHoverStars(p => ({ ...p, [itemId]: 0 }))}
              disabled={submittingRating === itemId}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', lineHeight: 1 }}
              title={`Rate ${s} star${s > 1 ? 's' : ''}`}
            >
              <Star
                className="w-4 h-4"
                fill={s <= displayRating ? '#f97316' : 'none'}
                stroke={s <= displayRating ? '#f97316' : '#d1d5db'}
              />
            </button>
          ))}
          {avgRating > 0 && (
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
              {avgRating} ({ratingCount})
            </span>
          )}
          {myRating > 0 && (
            <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>✔ Rated</span>
          )}
        </div>
      </div>
    );
  };

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
                {loading ? (
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <span className="text-xl font-bold gradient-text">{canteen?.name}</span>
                )}
              </div>
            </div>
            <Link to="/student/cart" className="relative" data-testid="cart-link">
              <Button variant="outline" size="sm" className="rounded-full">
                <ShoppingCart className="w-4 h-4" />
                {!loading && cartCount > 0 && (
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
        {loading ? (
          <>
            {/* Header Skeleton */}
            <div className="mb-8">
              <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* Controls Skeleton */}
            <div className="mb-8 space-y-4">
              <div className="h-10 w-full bg-gray-200 rounded-xl animate-pulse" />
              <div className="flex gap-2 pb-2">
                <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Menu Items Skeleton */}
            <SkeletonLoader type="menu" count={6} />
          </>
        ) : (
          <>
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

              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
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

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Dietary:</span>
                    <select
                      value={selectedAllergyFilter}
                      onChange={(e) => setSelectedAllergyFilter(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                      data-testid="allergy-filter"
                    >
                      <option value="all">All Items</option>
                      <option value="veg-only">Vegetarian Only</option>
                      <option value="non-veg-only">Non-Vegetarian Only</option>
                      <option value="dairy-free">Dairy Free</option>
                      <option value="gluten-free">Gluten Free</option>
                      <option value="nut-free">Nut Free</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                      data-testid="sort-select"
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="rating-high">⭐ Top Rated</option>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.item_id}
                  id={item.item_id}
                  className="bg-white rounded-3xl overflow-hidden shadow-lg border border-orange-100 hover:shadow-xl transition-shadow duration-200"
                  data-testid={`menu-item-${item.item_id}`}
                >
                  <div className="h-48 overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center relative group">
                    {item.image_url ? (
                      <img
                        src={getOptimizedImageUrl(item.image_url)}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 flex items-center justify-center bg-orange-100 ${item.image_url ? 'hidden' : 'flex'}`}>
                      <Utensils className="w-20 h-20 text-orange-300" />
                    </div>
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

                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.ingredients}</p>

                    {/* ⭐ Star Rating */}
                    <StarDisplay
                      itemId={item.item_id}
                      avgRating={item.avg_rating || 0}
                      ratingCount={item.rating_count || 0}
                    />

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
                      disabled={!item.available || item.stock_qty <= 0}
                      className={`w-full rounded-xl ${item.available && item.stock_qty > 0
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                        : 'bg-red-500 cursor-not-allowed text-white opacity-80'
                        }`}
                      data-testid={`add-to-cart-${item.item_id}`}
                    >
                      {item.available && item.stock_qty > 0 ? (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Cart
                        </>
                      ) : (
                        'Out of Stock'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <EmptyState
                type="search"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedAllergyFilter('all');
                }}
                actionText="Clear Filters"
                actionTestId="clear-filters-btn"
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
