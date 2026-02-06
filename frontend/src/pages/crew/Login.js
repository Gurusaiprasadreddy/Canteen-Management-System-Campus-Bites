import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/utils/api';
import { setAuth } from '@/utils/auth';

export default function CrewLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/crew/dashboard';
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/crew/login', {
        email,
        password
      });

      setAuth(response.data.token, response.data.user);
      toast.success('Welcome back, Crew!');
      navigate('/crew/dashboard');
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setLoading(true);
    try {
      // Use pre-seeded credentials
      const response = await api.post('/auth/crew/login', {
        email: 'crew-sopanam@campusbites.com',
        password: 'crew123'
      });

      setAuth(response.data.token, response.data.user);
      toast.success('Test login successful');
      navigate('/crew/dashboard');
    } catch (error) {
      console.error('Test login failed:', error);
      toast.error('Test login failed. Ensure database is seeded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-8">
          {/* Go Back Button */}
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-4 text-gray-600 hover:text-blue-600 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>

          <div className="text-center mb-8">
            <Utensils className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crew Portal</h1>
            <p className="text-gray-600">Sign in to manage orders</p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            className="w-full py-6 rounded-xl bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-200"
            data-testid="google-login-btn"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign in with Google
          </Button>

          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="mx-4 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="crew@campusbites.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">For Developers</span>
              </div>
            </div>

            <Button
              onClick={handleTestLogin}
              variant="outline"
              className="w-full mt-4 py-6 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-500"
              data-testid="test-login-btn"
            >
              Quick Test Login
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Contact admin if you forgot your credentials
          </p>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/crew/signup')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
