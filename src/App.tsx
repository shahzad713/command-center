import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminRoute } from './components/SuperAdminRoute'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ThemeProvider } from './context/ThemeContext'

const AccountsPage = lazy(() => import('./pages/AccountsPage').then((module) => ({ default: module.AccountsPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const PipelinePage = lazy(() => import('./pages/PipelinePage').then((module) => ({ default: module.PipelinePage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage').then((module) => ({ default: module.SuperAdminPage })))

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <Suspense fallback={<div className="loading-panel page-loader">Loading page…</div>}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<DashboardPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="pipeline" element={<PipelinePage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="admin" element={<AdminPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="super-admin" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />
                </Route>
              </Routes>
            </Suspense>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
