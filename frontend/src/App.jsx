import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import LobbyScreen from './pages/LobbyScreen';
import DrawScreen from './pages/DrawScreen';
import SummaryScreen from './pages/SummaryScreen';
import ParticipantPortal from './pages/participant/ParticipantPortal';
import ParticipantRegister from './pages/participant/ParticipantRegister';
import CheckInPage from './pages/participant/CheckInPage';

// Protected route wrapper (admin only)
const ProtectedRoute = ({ children }) => {
  const { admin } = useAuth();
  if (!admin) return <Navigate to="/login" replace />;
  return children;
};

// Public route wrapper (redirect if already logged in as admin)
const PublicRoute = ({ children }) => {
  const { admin } = useAuth();
  if (admin) return <Navigate to="/admin" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Admin login */}
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />

      {/* Admin dashboard */}
      <Route path="/admin" element={
        <ProtectedRoute><AdminDashboard /></ProtectedRoute>
      } />

      {/* Admin — lobby (pre-draw waiting room) */}
      <Route path="/lobby/:eventId" element={
        <ProtectedRoute><LobbyScreen /></ProtectedRoute>
      } />

      {/* Admin — draw screen */}
      <Route path="/draw/:eventId" element={
        <ProtectedRoute><DrawScreen /></ProtectedRoute>
      } />

      {/* Admin — results summary after the draw */}
      <Route path="/summary/:eventId" element={
        <ProtectedRoute><SummaryScreen /></ProtectedRoute>
      } />

      {/* Participant — registration page via QR code scan */}
      {/* URL: /daftar/:eventId  — peserta scan QR → terus ke form daftar */}
      <Route path="/daftar/:eventId" element={<ParticipantRegister />} />

      {/* VIP — check-in with email + code */}
      <Route path="/checkin/:eventId" element={<CheckInPage />} />

      {/* Participant — old portal (results & login) — kept for backwards compat */}
      <Route path="/participantentries" element={<ParticipantPortal />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;