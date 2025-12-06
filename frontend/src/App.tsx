/**
 * Main App component
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

// Pages
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import ItemManagementPage from "./pages/ItemManagementPage";
import CategoryManagementPage from "./pages/CategoryManagementPage";
import ScannerPage from "./pages/ScannerPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import AssetManagementPage from "./pages/AssetManagementPage";
import FormsPage from "./pages/FormsPage";
import ExpirationAlertsPage from "./pages/ExpirationAlertsPage";
import RestockOrdersPage from "./pages/RestockOrdersPage";
import VendorManagementPage from "./pages/VendorManagementPage";
import ReorderSuggestionsPage from "./pages/ReorderSuggestionsPage";

// Components
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Store
import { useAuthStore } from "./stores/authStore";

// Create MUI theme with dark mode
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#64b5f6",
      light: "#90caf9",
      dark: "#42a5f5",
    },
    secondary: {
      main: "#f48fb1",
      light: "#f8bbd0",
      dark: "#ec407a",
    },
    error: {
      main: "#ef5350",
    },
    warning: {
      main: "#ffa726",
    },
    success: {
      main: "#66bb6a",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#ffffff",
      secondary: "rgba(255, 255, 255, 0.7)",
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
  },
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="items" element={<ItemManagementPage />} />
              <Route path="categories" element={<CategoryManagementPage />} />
              <Route path="assets" element={<AssetManagementPage />} />
              <Route path="forms" element={<FormsPage />} />
              <Route
                path="expiration-alerts"
                element={<ExpirationAlertsPage />}
              />
              <Route path="restock-orders" element={<RestockOrdersPage />} />
              <Route path="vendors" element={<VendorManagementPage />} />
              <Route
                path="reorder-suggestions"
                element={<ReorderSuggestionsPage />}
              />
              <Route path="scanner" element={<ScannerPage />} />
              <Route path="orders" element={<PurchaseOrdersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
