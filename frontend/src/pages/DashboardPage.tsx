/**
 * Dashboard Page
 */
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
} from "@mui/material";
import {
  Inventory2,
  Warning,
  EventAvailable,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
} from "@mui/icons-material";

// Stats card component
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: "up" | "down";
  trendValue?: string;
}

function StatsCard({
  title,
  value,
  icon,
  color,
  trend,
  trendValue,
}: StatsCardProps) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            {trend && trendValue && (
              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                {trend === "up" ? (
                  <TrendingUp
                    fontSize="small"
                    sx={{ color: "success.main", mr: 0.5 }}
                  />
                ) : (
                  <TrendingDown
                    fontSize="small"
                    sx={{ color: "error.main", mr: 0.5 }}
                  />
                )}
                <Typography
                  variant="caption"
                  color={trend === "up" ? "success.main" : "error.main"}
                >
                  {trendValue}
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: color,
              borderRadius: 2,
              p: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  // TODO: Fetch real data from API
  const stats = {
    totalItems: 179,
    lowStock: 12,
    expiringSoon: 5,
    pendingOrders: 3,
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        Welcome back! Here's your inventory overview.
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Items"
            value={stats.totalItems}
            icon={<Inventory2 sx={{ color: "white", fontSize: 32 }} />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Low Stock Items"
            value={stats.lowStock}
            icon={<Warning sx={{ color: "white", fontSize: 32 }} />}
            color="warning.main"
            trend="down"
            trendValue="3 from yesterday"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Expiring Soon"
            value={stats.expiringSoon}
            icon={<EventAvailable sx={{ color: "white", fontSize: 32 }} />}
            color="error.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={<ShoppingCart sx={{ color: "white", fontSize: 32 }} />}
            color="success.main"
          />
        </Grid>
      </Grid>

      {/* Recent Activity & Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Recent Activity
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Activity feed will be displayed here...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                • Recent scans
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Inventory movements
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Order updates
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Quick Actions
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Quick action buttons will be displayed here...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                • Scan Item
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Create Order
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • View Reports
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Low Stock Alerts */}
      <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Low Stock Alerts
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Items below par level will be displayed here...
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
