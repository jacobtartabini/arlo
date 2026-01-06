import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import TailscaleAuth from "./components/TailscaleAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import DomainAwareRoute from "./components/DomainAwareRoute";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { ArloProvider } from "./providers/ArloProvider";
import { ChatHistoryProvider } from "./providers/ChatHistoryProvider";
import { UserSettingsProvider } from "./providers/UserSettingsProvider";
import { NotificationsProvider } from "./providers/NotificationsProvider";
import ConditionalNavBar from "./components/ConditionalNavBar";
import Chat from "./pages/Chat";
import CalendarPage from "./pages/Calendar";
import PublicBookingPage from "./pages/PublicBooking";
import ManageBookingPage from "./pages/ManageBooking";
import ArloCommandLauncher from "./components/ArloCommandLauncher";
import Finance from "./pages/modules/Finance";
import Productivity from "./pages/modules/Productivity";
import Travel from "./pages/modules/Travel";
import TripDetail from "./pages/TripDetail";
import Services from "./pages/modules/Services";
import Health from "./pages/modules/Health";
import Files from "./pages/modules/Files";
import Creation from "./pages/modules/Creation";
import Automations from "./pages/modules/Automations";
import Notifications from "./pages/modules/Notifications";
import Notes from "./pages/Notes";
// NotesDashboard removed - /notes-dashboard now redirects to /notes
import Habits from "./pages/modules/Habits";
import Inbox from "./pages/Inbox";
import ArloMaps from "./pages/ArloMaps";
import MorningView from "./pages/MorningView";
import FocusSession from "./pages/FocusSession";
import { NotificationMonitor } from "./components/NotificationMonitor";
import { MorningWakeupScheduler } from "./components/MorningWakeupScheduler";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="arlo-ui-theme">
      <AuthProvider>
        <UserSettingsProvider>
          <ChatHistoryProvider>
            <ArloProvider>
              <NotificationsProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <NotificationMonitor />
                  <MorningWakeupScheduler />
                  <BrowserRouter>
                    <ArloCommandLauncher />
                <ConditionalNavBar />
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<TailscaleAuth />} />
                  <Route path="/book/:handle" element={<PublicBookingPage />} />
                  <Route path="/book" element={<PublicBookingPage />} />
                  <Route path="/booking/:eventId" element={<ManageBookingPage />} />

                  {/* Protected routes */}
                  <Route path="/" element={
                    <DomainAwareRoute>
                      <Dashboard />
                    </DomainAwareRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/chat" element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } />
                  <Route path="/calendar" element={
                    <ProtectedRoute>
                      <CalendarPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/inbox" element={
                    <ProtectedRoute>
                      <Inbox />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />

                  {/* Module routes */}
                  <Route path="/finance" element={
                    <ProtectedRoute>
                      <Finance />
                    </ProtectedRoute>
                  } />
                  <Route path="/productivity" element={
                    <ProtectedRoute>
                      <Productivity />
                    </ProtectedRoute>
                  } />
                  <Route path="/travel" element={
                    <ProtectedRoute>
                      <Travel />
                    </ProtectedRoute>
                  } />
                  <Route path="/travel/:tripId" element={
                    <ProtectedRoute>
                      <TripDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/security" element={
                    <ProtectedRoute>
                      <Services />
                    </ProtectedRoute>
                  } />
                  <Route path="/files" element={
                    <ProtectedRoute>
                      <Files />
                    </ProtectedRoute>
                  } />
                  <Route path="/health" element={
                    <ProtectedRoute>
                      <Health />
                    </ProtectedRoute>
                  } />
                  <Route path="/creation" element={
                    <ProtectedRoute>
                      <Creation />
                    </ProtectedRoute>
                  } />
                  <Route path="/automations" element={
                    <ProtectedRoute>
                      <Automations />
                    </ProtectedRoute>
                  } />
                  <Route path="/notifications" element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  } />
                  <Route path="/notes" element={
                    <ProtectedRoute>
                      <Notes />
                    </ProtectedRoute>
                  } />
                  {/* Redirect /notes-dashboard to /notes */}
                  <Route path="/notes-dashboard" element={
                    <ProtectedRoute>
                      <Notes />
                    </ProtectedRoute>
                  } />
                  <Route path="/habits" element={
                    <ProtectedRoute>
                      <Habits />
                    </ProtectedRoute>
                  } />
                  <Route path="/maps" element={
                    <ProtectedRoute>
                      <ArloMaps />
                    </ProtectedRoute>
                  } />
                  <Route path="/morning" element={
                    <ProtectedRoute>
                      <MorningView />
                    </ProtectedRoute>
                  } />
                  <Route path="/focus" element={
                    <ProtectedRoute>
                      <FocusSession />
                    </ProtectedRoute>
                  } />

                  {/* Network/connection issues (separate from auth) */}
                  <Route path="/unauthorized" element={<Unauthorized />} />

                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
                </TooltipProvider>
              </NotificationsProvider>
            </ArloProvider>
          </ChatHistoryProvider>
        </UserSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
