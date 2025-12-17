import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CrewLogin() {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/crew/dashboard';
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
  };

  const handleTestLogin = () => {
    // For testing - create a test crew session
    const testCrew = {
      user_id: 'crew_test_' + Date.now(),
      name: 'Test Crew Member',
      email: 'test.crew@gmail.com',
      role: 'crew',
      canteen_id: 'sopanam'
    };
    localStorage.setItem('user', JSON.stringify(testCrew));
    localStorage.setItem('token', 'test_crew_token_' + Date.now());
    navigate('/crew/dashboard');
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
          <div className="text-center mb-8">
            <Utensils className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crew Portal</h1>
            <p className="text-gray-600">Sign in with your @amrita.edu account</p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            className="w-full py-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
            data-testid="google-login-btn"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign in with Google
          </Button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Only @amrita.edu emails are allowed
          </p>
        </div>
      </motion.div>
    </div>
  );
}
