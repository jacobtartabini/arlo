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
import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { ArloProvider } from "./providers/ArloProvider";
import { ChatHistoryProvider } from "./providers/ChatHistoryProvider";
import ConditionalNavBar from "./components/ConditionalNavBar";
import Chat from "./pages/Chat";
import CalendarPage from "./pages/Calendar";
import PublicBookingPage from "./pages/PublicBooking";
import GlobalSearch from "./components/GlobalSearch";
import Finance from "./pages/modules/Finance";
import Productivity from "./pages/modules/Productivity";
import Travel from "./pages/modules/Travel";
import SystemSecurity from "./pages/modules/SystemSecurity";
import Health from "./pages/modules/Health";
import Files from "./pages/modules/Files";
import Creation from "./pages/modules/Creation";
import Knowledge from "./pages/modules/Knowledge";
import Automations from "./pages/modules/Automations";
import AIInsights from "./pages/modules/AIInsights";
import Notifications from "./pages/modules/Notifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="arlo-ui-theme">
      <AuthProvider>
        <ChatHistoryProvider>
          <ArloProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <GlobalSearch />
              <ConditionalNavBar />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<TailscaleAuth />} />
                <Route path="/book/:handle" element={<PublicBookingPage />} />
                <Route path="/book" element={<PublicBookingPage />} />

                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
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
                <Route path="/system" element={
                  <ProtectedRoute>
                    <SystemSecurity />
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
                <Route path="/knowledge" element={
                  <ProtectedRoute>
                    <Knowledge />
                  </ProtectedRoute>
                } />
                <Route path="/automations" element={
                  <ProtectedRoute>
                    <Automations />
                  </ProtectedRoute>
                } />
                <Route path="/insights" element={
                  <ProtectedRoute>
                    <AIInsights />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                } />

                {/* Network/connection issues (separate from auth) */}
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </ArloProvider>
        </ChatHistoryProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
