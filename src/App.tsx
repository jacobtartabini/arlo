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
import ConditionalNavBar from "./components/ConditionalNavBar";
import Chat from "./pages/Chat";
import CalendarPage from "./pages/Calendar";
import Habits from "./pages/modules/Habits";
import Budget from "./pages/modules/Budget";
import Nutrition from "./pages/modules/Nutrition";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="arlo-ui-theme">
      <AuthProvider>
        <ArloProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ConditionalNavBar />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<TailscaleAuth />} />

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
                <Route path="/habits" element={
                  <ProtectedRoute>
                    <Habits />
                  </ProtectedRoute>
                } />
                <Route path="/budget" element={
                  <ProtectedRoute>
                    <Budget />
                  </ProtectedRoute>
                } />
                <Route path="/nutrition" element={
                  <ProtectedRoute>
                    <Nutrition />
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
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
