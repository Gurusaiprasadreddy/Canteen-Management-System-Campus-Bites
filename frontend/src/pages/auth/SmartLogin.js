import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Loader2, GraduationCap, HardHat, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/utils/api";
import { setAuth } from "@/utils/auth";
import { toast } from "sonner";

export default function SmartLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("student");

    const [formData, setFormData] = useState({
        roll_number: "",
        email: "",
        password: ""
    });

    // Automatically select tab based on URL query parameter (e.g. ?tab=crew)
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tabParam = queryParams.get("tab");
        if (tabParam && ["student", "crew", "management"].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [location]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // Reset form data when switching tabs to prevent accidental cross-role contamination
        setFormData({ roll_number: "", email: "", password: "" });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Dynamic API endpoint based on the selected tab
            const endpoint = `/auth/${activeTab}/login`;

            // Send correct payload based on role
            const payload = activeTab === "student"
                ? { roll_number: formData.roll_number, password: formData.password }
                : { email: formData.email, password: formData.password };

            const response = await api.post(endpoint, payload);

            // Strict Cross-Role Verification
            // Ensure the returned token user role matches the tab they used!
            const userRole = response.data.user.role;
            if (userRole !== activeTab) {
                throw new Error(`Access Denied! Your account is a ${userRole} account. Please use the ${userRole.toUpperCase()} login section.`);
            }

            setAuth(response.data.token, response.data.user);
            toast.success(`Login successful! Welcome back.`);

            // Route dynamically to correct dashboard
            navigate(`/${activeTab}/dashboard`);

        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
                toast.error(`Login failed. This is the ${activeTab.toUpperCase()} login section. Are you sure you are in the right place?`);
            } else {
                toast.error(error.message || 'Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-lg">
                <div className="bg-white rounded-3xl shadow-2xl border border-orange-100 p-8">
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-flex items-center gap-2 mb-4">
                            <Utensils className="w-8 h-8 text-orange-600" />
                            <span className="text-2xl font-bold gradient-text">Campus Bites</span>
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Login</h1>
                        <p className="text-gray-600">Secure access to your dashboard</p>
                    </div>

                    {/* Role Selection Tabs */}
                    <div className="flex p-1 space-x-1 bg-orange-100/50 rounded-2xl mb-8 border border-orange-200">
                        <button
                            onClick={() => handleTabChange("student")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === "student"
                                    ? "bg-white text-orange-600 shadow-md ring-1 ring-black/5"
                                    : "text-gray-600 hover:text-orange-600 hover:bg-white/50"
                                }`}
                        >
                            <GraduationCap className="w-4 h-4" />
                            Student
                        </button>
                        <button
                            onClick={() => handleTabChange("crew")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === "crew"
                                    ? "bg-white text-amber-600 shadow-md ring-1 ring-black/5"
                                    : "text-gray-600 hover:text-amber-600 hover:bg-white/50"
                                }`}
                        >
                            <HardHat className="w-4 h-4" />
                            Crew
                        </button>
                        <button
                            onClick={() => handleTabChange("management")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === "management"
                                    ? "bg-white text-rose-600 shadow-md ring-1 ring-black/5"
                                    : "text-gray-600 hover:text-rose-600 hover:bg-white/50"
                                }`}
                        >
                            <Briefcase className="w-4 h-4" />
                            Management
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.form
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleSubmit}
                            className="space-y-6"
                        >
                            {/* Dynamic Input: Roll Number for Student, Email for others */}
                            {activeTab === "student" ? (
                                <div>
                                    <Label htmlFor="roll_number" className="text-gray-700 font-medium">Roll Number</Label>
                                    <Input
                                        id="roll_number"
                                        type="text"
                                        placeholder="CB.SC.U4CSE23134"
                                        value={formData.roll_number}
                                        onChange={handleInputChange}
                                        className="mt-2 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                        required
                                    />
                                </div>
                            ) : (
                                <div>
                                    <Label htmlFor="email" className="text-gray-700 font-medium">Work Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={`${activeTab}@campusbites.com`}
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`mt-2 rounded-xl border-gray-200 ${activeTab === 'crew' ? 'focus:border-amber-500 focus:ring-amber-500' : 'focus:border-rose-500 focus:ring-rose-500'}`}
                                        required
                                    />
                                </div>
                            )}

                            {/* Password is required for all */}
                            <div>
                                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter secure password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={`mt-2 rounded-xl border-gray-200 ${activeTab === 'student' ? 'focus:border-orange-500 focus:ring-orange-500' :
                                            activeTab === 'crew' ? 'focus:border-amber-500 focus:ring-amber-500' :
                                                'focus:border-rose-500 focus:ring-rose-500'
                                        }`}
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className={`w-full rounded-xl py-6 shadow-lg btn-ripple bg-gradient-to-r text-white ${activeTab === 'student' ? 'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/30' :
                                        activeTab === 'crew' ? 'from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-amber-500/30' :
                                            'from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/30'
                                    }`}
                            >
                                {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Authenticating {activeTab}...</>) : (`Login as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`)}
                            </Button>
                        </motion.form>
                    </AnimatePresence>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        Don't have an account?{" "}
                        <Link to={`/${activeTab}/register`} className={`font-semibold ${activeTab === 'student' ? 'text-orange-600 hover:text-orange-500' :
                                activeTab === 'crew' ? 'text-amber-600 hover:text-amber-500' :
                                    'text-rose-600 hover:text-rose-500'
                            }`}>
                            Sign up here
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
