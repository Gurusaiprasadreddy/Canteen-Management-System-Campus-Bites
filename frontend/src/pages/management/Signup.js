import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { setAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function ManagementSignup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/management/signup', {
                name: formData.name,
                email: formData.email,
                password: formData.password
            });

            // Don't auto-login, just show success and redirect to login
            toast.success('Account created successfully! Please login with your credentials.');
            setTimeout(() => {
                navigate('/management/login');
            }, 1500); // Wait 1.5 seconds to show the success message
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8">
                    {/* Go Back Button */}
                    <Button
                        onClick={() => navigate('/management/login')}
                        variant="ghost"
                        className="mb-4 text-gray-300 hover:text-white -ml-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Login
                    </Button>

                    <div className="text-center mb-8">
                        <Utensils className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold text-white mb-2">Join Management</h1>
                        <p className="text-gray-300">Create your management account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="name" className="text-white font-medium">Full Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-2 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="email" className="text-white font-medium">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="manager@amrita.edu"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="mt-2 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="password" className="text-white font-medium">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter password (min 6 characters)"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="mt-2 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword" className="text-white font-medium">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="mt-2 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl py-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5 mr-2" />
                                    Create Account
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/20 text-center">
                        <p className="text-sm text-gray-300">
                            Already have an account?{' '}
                            <button
                                onClick={() => navigate('/management/login')}
                                className="text-orange-400 hover:text-orange-300 font-medium"
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
