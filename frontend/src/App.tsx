import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { IncomePage } from '@/pages/Income'
import { ExpensesPage } from '@/pages/Expenses'
import { GoalsPage } from '@/pages/Goals'
import { RecurringPage } from '@/pages/Recurring'
import { ProjectionsPage } from '@/pages/Projections'
import { SettingsPage } from '@/pages/Settings'
import { ComptesPage } from '@/pages/Comptes'
import { AnalysePage } from '@/pages/Analyse'

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}

function RequireAuth() {
  const { user, loading } = useAuthStore()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function RedirectIfAuth() {
  const { user, loading } = useAuthStore()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  const { fetchMe } = useAuthStore()

  useEffect(() => { fetchMe() }, [fetchMe])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RedirectIfAuth />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/comptes" element={<ComptesPage />} />
            <Route path="/analyse" element={<AnalysePage />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/projections" element={<ProjectionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
