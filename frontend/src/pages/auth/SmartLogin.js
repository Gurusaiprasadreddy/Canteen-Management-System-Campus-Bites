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

export default function SmartLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("student");
    const [showPassword, setShowPassword] = useState(false);

    // Animation Refs
    const charactersRef = useRef(null);
    const shapeRefs = useRef([]);
    const pupilRefs = useRef([]);
    const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const lastPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const requestRef = useRef();

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
        setShowPassword(false); // Reset password visibility context
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 sm:p-8">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl border border-orange-100 bg-white grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">

                {/* LEFT PORTION: Animated Characters */}
                <div className="hidden md:flex items-center justify-center relative overflow-hidden p-8 border-r border-orange-100 bg-orange-50/30">

                    <div className="login-characters z-10" ref={charactersRef}>
                        {/* Orange Shape */}
                        <div className="login-shape shape-orange" ref={el => shapeRefs.current[0] = el}>
                            <div className="eyes">
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[0] = el}></div></div>
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[1] = el}></div></div>
                            </div>
                        </div>
                        {/* Purple Shape */}
                        <div className="login-shape shape-purple" ref={el => shapeRefs.current[1] = el}>
                            <div className="eyes">
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[2] = el}></div></div>
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[3] = el}></div></div>
                            </div>
                        </div>
                        {/* Black Shape */}
                        <div className="login-shape shape-black" ref={el => shapeRefs.current[2] = el}>
                            <div className="eyes">
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[4] = el}></div></div>
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[5] = el}></div></div>
                            </div>
                        </div>
                        {/* Yellow Shape */}
                        <div className="login-shape shape-yellow" ref={el => shapeRefs.current[3] = el}>
                            <div className="eyes">
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[6] = el}></div></div>
                                <div className="login-eye"><div className="login-pupil" ref={el => pupilRefs.current[7] = el}></div></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PORTION: The Form */}
                <div className="p-8 sm:p-12 md:p-10 lg:p-12 flex flex-col justify-center">
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
                                        placeholder="UNI-SCH-PROG-DEPT-YY-XXX"
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
                                <div className="relative mt-2">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className={`rounded-xl pr-24 border-gray-200 transition-all ${activeTab === 'student' ? 'focus:border-orange-500 focus:ring-orange-500' :
                                            activeTab === 'crew' ? 'focus:border-amber-500 focus:ring-amber-500' :
                                                'focus:border-rose-500 focus:ring-rose-500'
                                            }`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1 bottom-1 my-auto flex items-center h-8 gap-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-sm font-medium transition-colors group overflow-hidden"
                                    >
                                        <span className="text-lg leading-none shrink-0 w-5 flex justify-center items-center">{showPassword ? "🙈" : "👁"}</span>
                                        <span className="max-w-0 opacity-0 group-hover:max-w-[40px] group-hover:opacity-100 group-hover:ml-1 overflow-hidden transition-all duration-300 ease-out whitespace-nowrap font-semibold">
                                            {showPassword ? "Hide" : "Show"}
                                        </span>
                                    </button>
                                </div>
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
                        <Link to={`/signup?tab=${activeTab}`} className={`font-semibold ${activeTab === 'student' ? 'text-orange-600 hover:text-orange-500' :
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
