import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import SetupProfile from './pages/SetupProfile'
import Home from './pages/Home'
import GroupChat from './pages/GroupChat'
import DirectMessage from './pages/DirectMessage'
import ProfileEdit from './pages/ProfileEdit'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-amber-50"><span className="text-amber-600 text-lg">Carregando… 🏠</span></div>
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/setup-profile" replace />
  return <>{children}</>
}

function RequireAuthNoProfile({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-amber-50"><span className="text-amber-600 text-lg">Carregando… 🏠</span></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup-profile" element={
            <RequireAuthNoProfile><SetupProfile /></RequireAuthNoProfile>
          } />
          <Route path="/" element={
            <RequireAuth><Home /></RequireAuth>
          } />
          <Route path="/group/:groupId" element={
            <RequireAuth><GroupChat /></RequireAuth>
          } />
          <Route path="/dm/:userId" element={
            <RequireAuth><DirectMessage /></RequireAuth>
          } />
          <Route path="/profile" element={
            <RequireAuthNoProfile><ProfileEdit /></RequireAuthNoProfile>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
