import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import LobbyScreen from './pages/LobbyScreen';
import DrawScreen from './pages/DrawScreen';
import ParticipantPortal from './pages/participant/ParticipantPortal';
import ParticipantRegister from './pages/participant/ParticipantRegister';

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

      {/* Participant — registration page via QR code scan */}
      {/* URL: /daftar/:eventId  — peserta scan QR → terus ke form daftar */}
      <Route path="/daftar/:eventId" element={<ParticipantRegister />} />

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