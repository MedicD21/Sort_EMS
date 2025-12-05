/**
 * Login Page
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff, LocalHospital } from "@mui/icons-material";
import { useAuthStore } from "../stores/authStore";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, error, isLoading, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ username, password });
      navigate("/dashboard");
    } catch (err) {
      // Error is handled by the store
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={8}>
          <CardContent sx={{ p: 4 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mb: 3,
              }}
            >
              <LocalHospital
                sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
              />
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                fontWeight="bold"
              >
                EMS Supply Tracking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to access your inventory
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                margin="normal"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? "text" : "password"}
                variant="outlined"
                margin="normal"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 1, py: 1.5 }}
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              {/* TEMP: Testing bypass button */}
              <Button
                fullWidth
                variant="outlined"
                size="large"
                sx={{ mb: 2, py: 1.5 }}
                onClick={() => navigate("/dashboard")}
              >
                Skip Login (Testing)
              </Button>
            </form>

            <Box sx={{ mt: 3, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                <strong>Demo Credentials:</strong>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Username: admin
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Password: ChangeMe123!
              </Typography>
            </Box>
          </CardContent>
        </Card>
        <Typography
          variant="body2"
          color="white"
          align="center"
          sx={{ mt: 3, opacity: 0.9 }}
        >
          © 2025 EMS Supply Tracking System
        </Typography>
      </Container>
    </Box>
  );
}
