import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Loader2, GraduationCap, HardHat, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/utils/api";
import { setAuth } from "@/utils/auth";
import { toast } from "sonner";
import "./LoginCharacters.css";

export default function SmartSignup() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("student");
    const [showPassword, setShowPassword] = useState(false);
    const [showOtp, setShowOtp] = useState(false);

    // Animation Refs
    const charactersRef = useRef(null);
    const shapeRefs = useRef([]);
    const pupilRefs = useRef([]);
    const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const lastPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const requestRef = useRef();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        roll_number: "", // Student
        otp: "",         // Student
        canteen_id: "sopanam" // Crew
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
        // Reset form data when switching tabs
        setFormData({
            name: "", email: "", password: "", confirmPassword: "",
            roll_number: "", otp: "", canteen_id: "sopanam"
        });
        setShowPassword(false);
        setShowOtp(false);
    };

    // --- Interactive Character Animation Logic ---
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (showPassword) return; // Freeze tracking if shy
            mousePos.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener("mousemove", handleMouseMove);

        const lookAt = (x, y) => {
            if (!pupilRefs.current.length) return;
            const maxOffset = 6;
            pupilRefs.current.forEach((pupil) => {
                if (!pupil || !pupil.parentElement) return;
                const eyeRect = pupil.parentElement.getBoundingClientRect();
                const eyeCenterX = eyeRect.left + eyeRect.width / 2;
                const eyeCenterY = eyeRect.top + eyeRect.height / 2;

                const dx = x - eyeCenterX;
                const dy = y - eyeCenterY;

                const angle = Math.atan2(dy, dx);
                const offsetX = Math.cos(angle) * maxOffset;
                const offsetY = Math.sin(angle) * maxOffset;

                pupil.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            });
        };

        const moveCharacters = (x) => {
            if (!charactersRef.current || !shapeRefs.current.length) return;
            const boxRect = charactersRef.current.getBoundingClientRect();
            const centerX = boxRect.left + boxRect.width / 2;
            const relX = (x - centerX) / boxRect.width;

            shapeRefs.current.forEach((shape, index) => {
                if (!shape) return;
                const baseTilt = 6;
                const extraTilt = index * 2;
                const angle = relX * (baseTilt + extraTilt);
                shape.style.transform = `rotate(${angle}deg)`;
            });
        };

        const animateCharacters = () => {
            if (!showPassword) {
                lastPos.current.x += (mousePos.current.x - lastPos.current.x) * 0.12;
                lastPos.current.y += (mousePos.current.y - lastPos.current.y) * 0.12;

                moveCharacters(lastPos.current.x);
                lookAt(lastPos.current.x, lastPos.current.y);
            } else {
                // Shy Mode
                shapeRefs.current.forEach((shape) => {
                    if (shape) shape.style.transform = "rotate(-15deg)";
                });
                pupilRefs.current.forEach((pupil) => {
                    if (pupil) pupil.style.transform = `translate(-6px, 0px)`;
                });
            }
            requestRef.current = requestAnimationFrame(animateCharacters);
        };

        requestRef.current = requestAnimationFrame(animateCharacters);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(requestRef.current);
        };
    }, [showPassword]);

    const handleSendOtp = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (!/^CB\.[A-Z]{2,4}\.U4[A-Z]{3}\d{5}$/.test(formData.roll_number)) {
            toast.error('Invalid roll number format. Example: CB.SC.U4CSE23134');
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/student/send-otp', { email: formData.email });
            toast.success('OTP sent! Please check the terminal.');
            setShowOtp(true);
        } catch (error) {
            const detail = error.response?.data?.detail;
            const errorMessage = Array.isArray(detail)
                ? detail.map(err => err.msg).join(', ')
                : (detail || 'Failed to send OTP');
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (activeTab === "student" && !showOtp) {
            return handleSendOtp(e);
        }

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
            if (activeTab === "student") {
                const response = await api.post('/auth/student/register', {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    roll_number: formData.roll_number,
                    otp: formData.otp
                });
                setAuth(response.data.token, response.data.user);
                toast.success('Registration successful!');
                navigate('/student/dashboard');
            } else if (activeTab === "crew") {
                await api.post('/auth/crew/signup', {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    canteen_id: formData.canteen_id
                });
                toast.success('Account created successfully! Please login with your credentials.');
                setTimeout(() => navigate('/login?tab=crew'), 1500);
            } else if (activeTab === "management") {
                await api.post('/auth/management/signup', {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                });
                toast.success('Account created successfully! Please login with your credentials.');
                setTimeout(() => navigate('/login?tab=management'), 1500);
            }
        } catch (error) {
            const detail = error.response?.data?.detail;
            const errorMessage = Array.isArray(detail)
                ? detail.map(err => err.msg).join(', ')
                : (detail || 'Signup failed');
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 sm:p-8">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl border border-orange-100 bg-white grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">

                {/* LEFT PORTION: Animated Characters */}
                <div className="hidden md:flex items-center justify-center relative overflow-hidden p-8 border-r border-orange-100 bg-orange-50/30">
                    <div className="login-characters z-10" ref={charactersRef}>
                        <div className="login-shape shape-orange" ref={el => shapeRefs.current[0] = el}>
                            <div className="eyes">
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[0] = el}></div></div>
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[1] = el}></div></div>
                            </div>
                        </div>
                        <div className="login-shape shape-purple" ref={el => shapeRefs.current[1] = el}>
                            <div className="eyes">
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[2] = el}></div></div>
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[3] = el}></div></div>
                            </div>
                        </div>
                        <div className="login-shape shape-black" ref={el => shapeRefs.current[2] = el}>
                            <div className="eyes">
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[4] = el}></div></div>
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[5] = el}></div></div>
                            </div>
                        </div>
                        <div className="login-shape shape-yellow" ref={el => shapeRefs.current[3] = el}>
                            <div className="eyes">
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[6] = el}></div></div>
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[7] = el}></div></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PORTION: The Form */}
                <div className="p-8 sm:p-12 md:p-10 lg:p-12 flex flex-col justify-center max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="text-center mb-6">
                        <Link to="/" className="inline-flex items-center gap-2 mb-2">
                            <Utensils className="w-8 h-8 text-orange-600" />
                            <span className="text-2xl font-bold gradient-text">Campus Bites</span>
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                        <p className="text-gray-600">Join our campus dining network</p>
                    </div>

                    {/* Role Selection Tabs */}
                    <div className="flex p-1 space-x-1 bg-orange-100/50 rounded-2xl mb-6 border border-orange-200 shrink-0">
                        <button
                            type="button"
                            onClick={() => handleTabChange("student")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === "student"
                                ? "bg-white text-orange-600 shadow-md ring-1 ring-black/5"
                                : "text-gray-600 hover:text-orange-600 hover:bg-white/50"
                                }`}
                        >
                            <GraduationCap className="w-4 h-4" />
                            Student
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange("crew")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === "crew"
                                ? "bg-white text-amber-600 shadow-md ring-1 ring-black/5"
                                : "text-gray-600 hover:text-amber-600 hover:bg-white/50"
                                }`}
                        >
                            <HardHat className="w-4 h-4" />
                            Crew
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange("management")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === "management"
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
                            className="space-y-4"
                        >
                            {(!showOtp || activeTab !== "student") && (
                                <>
                                    {/* Universal Registration Fields */}
                                    <div>
                                        <Label htmlFor="name" className="text-gray-700 font-medium text-xs">Full Name</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="John Doe"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="mt-1 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="email" className="text-gray-700 font-medium text-xs">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder={activeTab === 'student' ? 'john@am.students.amrita.edu' : `${activeTab}@campusbites.com`}
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="mt-1 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                            required
                                        />
                                    </div>

                                    {/* Student Specific Fields */}
                                    {activeTab === "student" && (
                                        <div>
                                            <Label htmlFor="roll_number" className="text-gray-700 font-medium text-xs">Roll Number</Label>
                                            <Input
                                                id="roll_number"
                                                type="text"
                                                placeholder="CB.SC.U4CSE23134"
                                                value={formData.roll_number}
                                                onChange={handleInputChange}
                                                className="mt-1 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Crew Specific Fields */}
                                    {activeTab === "crew" && (
                                        <div>
                                            <Label htmlFor="canteen_id" className="text-gray-700 font-medium text-xs">Assigned Canteen</Label>
                                            <select
                                                id="canteen_id"
                                                value={formData.canteen_id}
                                                onChange={handleInputChange}
                                                className="mt-1 w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white font-medium"
                                                required
                                            >
                                                <option value="sopanam">Sopanam Canteen</option>
                                                <option value="mba">MBA Canteen</option>
                                                <option value="samudra">Samudra Canteen</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Password Container */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label htmlFor="password" className="text-gray-700 font-medium text-xs">Password</Label>
                                            <div className="relative mt-1">
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    className="rounded-xl pr-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="confirmPassword" className="text-gray-700 font-medium text-xs">Confirm</Label>
                                            <div className="relative mt-1">
                                                <Input
                                                    id="confirmPassword"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    className="rounded-xl pr-24 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2 top-0.5 bottom-0.5 my-auto flex items-center h-8 gap-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-sm font-medium transition-colors group overflow-hidden"
                                                >
                                                    <span className="text-lg leading-none shrink-0 w-5 flex justify-center items-center">{showPassword ? "🙈" : "👁"}</span>
                                                    <span className="max-w-0 opacity-0 group-hover:max-w-[40px] group-hover:opacity-100 group-hover:ml-1 overflow-hidden transition-all duration-300 ease-out whitespace-nowrap font-semibold">
                                                        {showPassword ? "Hide" : "Show"}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* OTP View for Students exclusively */}
                            {activeTab === "student" && showOtp && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                    <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl text-center space-y-4">
                                        <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                            <span className="text-2xl">📧</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Verify your Email</h3>
                                            <p className="text-sm text-gray-600 px-4 mt-2 mb-4 drop-shadow-sm">We've sent a 6-digit verification code to <span className="font-semibold text-gray-900">{formData.email}</span></p>
                                        </div>
                                        <div>
                                            <Input
                                                id="otp"
                                                type="text"
                                                placeholder="Enter 6-digit OTP"
                                                value={formData.otp}
                                                onChange={handleInputChange}
                                                className="rounded-xl text-center text-xl tracking-widest font-mono border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                                                required
                                                maxLength="6"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowOtp(false)}
                                            className="text-sm text-gray-500 hover:text-orange-600 font-medium"
                                        >
                                            ← Change Email Address
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            <Button
                                type="submit"
                                disabled={loading}
                                className={`w-full rounded-xl py-6 shadow-lg btn-ripple bg-gradient-to-r text-white mt-4 ${activeTab === 'student' ? 'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/30' :
                                    activeTab === 'crew' ? 'from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-amber-500/30' :
                                        'from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/30'
                                    }`}
                            >
                                {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>) : (
                                    activeTab === "student" && !showOtp ? "Verify Email & Send OTP" :
                                        `Create ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Account`
                                )}
                            </Button>
                        </motion.form>
                    </AnimatePresence>

                    <div className="mt-6 text-center text-sm text-gray-500 shrink-0">
                        Already have an account?{" "}
                        <Link to={`/login?tab=${activeTab}`} className={`font-semibold ${activeTab === 'student' ? 'text-orange-600 hover:text-orange-500' :
                            activeTab === 'crew' ? 'text-amber-600 hover:text-amber-500' :
                                'text-rose-600 hover:text-rose-500'
                            }`}>
                            Log in here
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
