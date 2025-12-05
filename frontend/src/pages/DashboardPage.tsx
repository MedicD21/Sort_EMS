/**
 * Dashboard Page
 */
import { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import {
  Inventory2,
  Warning,
  EventAvailable,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DateRange,
  Error as ErrorIcon,
} from "@mui/icons-material";
import {
  reportsApi,
  InventorySummary,
  LowStockItem,
  inventoryApi,
  ExpiringItem,
} from "../services/apiService";

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
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [expiredItems, setExpiredItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, lowStockRes, expiringRes, expiredRes] =
        await Promise.all([
          reportsApi.inventorySummary(),
          reportsApi.lowStock(),
          inventoryApi.expiringItems({ days_ahead: 30, limit: 10 }),
          inventoryApi.expiredItems({ limit: 10 }),
        ]);

      setSummary(summaryRes.data);
      setLowStock(lowStockRes.data);
      setExpiringItems(expiringRes.data);
      setExpiredItems(expiredRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load dashboard data");
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const stats = {
    totalItems: summary?.total_items || 0,
    lowStock: summary?.items_below_par || 0,
    locations: summary?.total_locations || 0,
    totalValue: summary?.total_value || 0,
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
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Expiring Soon"
            value={expiringItems.length}
            icon={<DateRange sx={{ color: "white", fontSize: 32 }} />}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Expired Items"
            value={expiredItems.length}
            icon={<ErrorIcon sx={{ color: "white", fontSize: 32 }} />}
            color="error.main"
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
        {lowStock.length === 0 ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No items below par level.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Current Qty</TableCell>
                  <TableCell align="right">Par Level</TableCell>
                  <TableCell align="right">Reorder Level</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowStock.map((item) => {
                  const stockPercent = item.par_level
                    ? (item.current_quantity / item.par_level) * 100
                    : 0;
                  const severity =
                    stockPercent < 25
                      ? "error"
                      : stockPercent < 50
                      ? "warning"
                      : "info";

                  return (
                    <TableRow key={item.item_id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.item_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.location_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.current_quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.par_level}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.reorder_level}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${stockPercent.toFixed(0)}% of par`}
                          color={severity}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Expiring Items Section */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        {/* Expiring Soon */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Expiring Soon (Next 30 Days)
            </Typography>
            {expiringItems.length === 0 ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No items expiring soon.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Expiration</TableCell>
                      <TableCell>Days Left</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expiringItems.slice(0, 5).map((item) => (
                      <TableRow
                        key={item.id}
                        sx={{
                          backgroundColor:
                            item.days_until_expiration <= 7
                              ? "rgba(211, 47, 47, 0.08)"
                              : item.days_until_expiration <= 14
                              ? "rgba(237, 108, 2, 0.08)"
                              : "inherit",
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.item_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {item.location_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(
                              item.expiration_date
                            ).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${item.days_until_expiration} days`}
                            color={
                              item.days_until_expiration <= 7
                                ? "error"
                                : item.days_until_expiration <= 14
                                ? "warning"
                                : "info"
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Expired Items */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Expired Items
            </Typography>
            {expiredItems.length === 0 ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No expired items found.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Expiration</TableCell>
                      <TableCell>Days Ago</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expiredItems.slice(0, 5).map((item) => (
                      <TableRow
                        key={item.id}
                        sx={{
                          backgroundColor: "rgba(211, 47, 47, 0.08)",
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.item_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {item.location_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(
                              item.expiration_date
                            ).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${Math.abs(
                              item.days_until_expiration
                            )} days ago`}
                            color="error"
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
