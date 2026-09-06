import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { LoadingState } from '@/components/common/states'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider, useAuth } from '@/context/auth-context'
import { TripProvider, useTrip } from '@/context/trip-context'
import { VaultProvider } from '@/context/vault-context'
import { LoginPage } from '@/features/auth/LoginPage'
import { OnboardingPage } from '@/features/auth/OnboardingPage'

// Every feature page is its own lazily-loaded chunk so the initial bundle a
// visitor downloads is just the shell + whichever page they land on — this
// matters on the patchy mobile connectivity this app is built for.
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ItineraryPage = lazy(() => import('@/features/itinerary/ItineraryPage').then((m) => ({ default: m.ItineraryPage })))
const MapPage = lazy(() => import('@/features/map/MapPage').then((m) => ({ default: m.MapPage })))
const StaysPage = lazy(() => import('@/features/stays/StaysPage').then((m) => ({ default: m.StaysPage })))
const TransportPage = lazy(() => import('@/features/transport/TransportPage').then((m) => ({ default: m.TransportPage })))
const ActivitiesPage = lazy(() => import('@/features/activities/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage })))
const SafetyPage = lazy(() => import('@/features/safety/SafetyPage').then((m) => ({ default: m.SafetyPage })))
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage').then((m) => ({ default: m.ExpensesPage })))
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage })))
const PackingPage = lazy(() => import('@/features/packing/PackingPage').then((m) => ({ default: m.PackingPage })))
const TasksPage = lazy(() => import('@/features/tasks/TasksPage').then((m) => ({ default: m.TasksPage })))
const EmergencyPage = lazy(() => import('@/features/emergency/EmergencyPage').then((m) => ({ default: m.EmergencyPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingState label="Signing you in…" />
  if (!user) return <LoginPage />
  return <>{children}</>
}

function TripGate({ children }: { children: React.ReactNode }) {
  const { trips, loading } = useTrip()
  if (loading) return <LoadingState label="Loading your trip…" />
  if (trips.length === 0) return <OnboardingPage />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <TripProvider>
          <TripGate>
            <VaultProvider>
              <AppShell>
                <Suspense fallback={<LoadingState />}>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/itinerary" element={<ItineraryPage />} />
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/stays" element={<StaysPage />} />
                    <Route path="/transport" element={<TransportPage />} />
                    <Route path="/activities" element={<ActivitiesPage />} />
                    <Route path="/safety" element={<SafetyPage />} />
                    <Route path="/expenses" element={<ExpensesPage />} />
                    <Route path="/documents" element={<DocumentsPage />} />
                    <Route path="/packing" element={<PackingPage />} />
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route path="/emergency" element={<EmergencyPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </AppShell>
            </VaultProvider>
          </TripGate>
        </TripProvider>
      </AuthGate>
      <Toaster />
    </AuthProvider>
  )
}
