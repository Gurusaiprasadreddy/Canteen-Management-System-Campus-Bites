import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

// Import pages
import Landing from "@/pages/Landing";
import StudentLogin from "@/pages/student/Login";
import StudentRegister from "@/pages/student/Register";
import StudentDashboard from "@/pages/student/Dashboard";
import CanteenView from "@/pages/student/CanteenView";
import Cart from "@/pages/student/Cart";
import OrderTracking from "@/pages/student/OrderTracking";
import OrderHistory from "@/pages/student/OrderHistory";
import SpendingAnalytics from "@/pages/student/SpendingAnalytics";
import AIRecommendations from "@/pages/student/AIRecommendations";
import CrewLogin from "@/pages/crew/Login";
import CrewDashboard from "@/pages/crew/Dashboard";
import ManagementLogin from "@/pages/management/Login";
import ManagementDashboard from "@/pages/management/Dashboard";
import MenuManagement from "@/pages/management/MenuManagement";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Landing />} />
          
          {/* Student Routes */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/register" element={<StudentRegister />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/canteen/:canteenId" element={<CanteenView />} />
          <Route path="/student/cart" element={<Cart />} />
          <Route path="/student/orders/tracking" element={<OrderTracking />} />
          <Route path="/student/orders/history" element={<OrderHistory />} />
          <Route path="/student/spending" element={<SpendingAnalytics />} />
          <Route path="/student/ai-recommendations" element={<AIRecommendations />} />
          
          {/* Crew Routes */}
          <Route path="/crew/login" element={<CrewLogin />} />
          <Route path="/crew/dashboard" element={<CrewDashboard />} />
          
          {/* Management Routes */}
          <Route path="/management/login" element={<ManagementLogin />} />
          <Route path="/management/dashboard" element={<ManagementDashboard />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" expand={true} richColors />
    </div>
  );
}

export default App;
