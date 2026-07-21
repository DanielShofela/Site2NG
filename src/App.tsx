/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Jobs from './pages/Jobs';
import RecruiterDashboard from './pages/RecruiterDashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import Onboarding from './pages/Onboarding';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/About';
import PendingApproval from './pages/PendingApproval';
import ForgotPassword from './pages/ForgotPassword';
import RecruiterOnboarding from './pages/RecruiterOnboarding';
import CompanyProfile from './pages/CompanyProfile';
import CompaniesRegistry from './pages/CompaniesRegistry';
import Suspended from './pages/Suspended';
import NotFound from './pages/NotFound';
import Maintenance from './pages/Maintenance';
import CVLM from './pages/CVLM';
import Navbar from './components/layout/Navbar';
import ScrollToTop from './components/layout/ScrollToTop';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SiteConfigProvider, useSiteConfig } from './contexts/SiteConfigContext';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role: string }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Navigate to="/login" />;
  
  // Recruiter pending status check
  if (user.role === 'recruiter' && (user.status === 'pending' || user.status === 'submitted') && window.location.pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" />;
  }

  if (user.role !== role && role !== 'any') return <Navigate to="/" />;
  
  // If recruiter but profile not complete, redirect to recruiter onboarding
  if (user.role === 'recruiter' && !user.profileComplete && window.location.pathname !== '/recruiter-onboarding') {
    return <Navigate to="/recruiter-onboarding" />;
  }

  // If candidate but profile not complete, we don't force redirect anymore as per user request
  // (We will show a suggestion banner in the dashboard instead)

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <SiteConfigProvider>
        <Router>
          <ScrollToTop />
          <AppLayout />
        </Router>
      </SiteConfigProvider>
    </AuthProvider>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  const { config, maintenanceEnabled } = useSiteConfig();
  const location = useLocation();
  const isDashboardPage = location.pathname.startsWith('/admin') || 
                          location.pathname.startsWith('/recruiter') || 
                          location.pathname.startsWith('/candidate') ||
                          location.pathname.startsWith('/dashboard') ||
                          location.pathname === '/suspended';

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Admin bypass login or logged-in admin
  const isBypass = location.pathname === '/login' || (user && user.role === 'admin');
  if (maintenanceEnabled && !isBypass) {
    return <Maintenance />;
  }

  if (user && (user.accountStatus === 'suspended' || user.status === 'suspended') && location.pathname !== '/suspended') {
    return <Navigate to="/suspended" replace />;
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased overflow-x-hidden">
      {!isDashboardPage && <Navbar />}
      <main className={!isDashboardPage ? (config.bannerEnabled && config.bannerContent ? "pt-[136px] sm:pt-[128px]" : "pt-[88px]") : ""}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/landing" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/jobs" element={<Jobs />} />
          
          {/* Mapping user requested canonical SaaS routing aliases */}
          <Route path="/services" element={<Home />} />
          <Route path="/opportunites" element={<Jobs />} />
          <Route path="/entreprises" element={<CompaniesRegistry />} />
          <Route path="/contact" element={<Home />} />
          <Route path="/about" element={<About />} />

          {/* Authentication dropdown custom routes */}
          <Route path="/auth/login/member" element={<Login />} />
          <Route path="/auth/login/company" element={<Login />} />
          <Route path="/auth/register/member" element={<Navigate to="/signup?role=candidate" replace />} />
          <Route path="/auth/register/company" element={<Navigate to="/signup?role=recruiter" replace />} />

          {/* Protected Dashboards aliases */}
          <Route path="/dashboard/member" element={<ProtectedRoute role="candidate"><CandidateDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/company" element={<ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

          {/* Core Routes */}
          <Route path="/recruiter" element={<ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
          <Route path="/candidate" element={<ProtectedRoute role="candidate"><CandidateDashboard /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute role="candidate"><Onboarding /></ProtectedRoute>} />
          <Route path="/recruiter-onboarding" element={<ProtectedRoute role="recruiter"><RecruiterOnboarding /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/company/:id" element={<CompanyProfile />} />
          <Route path="/suspended" element={<Suspended />} />
          <Route path="/cvlm" element={<CVLM />} />

          {/* Wildcard 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
