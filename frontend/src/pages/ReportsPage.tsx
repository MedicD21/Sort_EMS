/**
 * Reports Page
 */
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { Assessment, Timeline, History, SwapHoriz } from "@mui/icons-material";
import {
  reportsApi,
  InventorySummary,
  LowStockItem,
  UsageStatistics,
  AuditLog,
  OrderHistory,
  MovementHistory,
} from "../services/apiService";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ReportsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Report data
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [usage, setUsage] = useState<UsageStatistics[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [movements, setMovements] = useState<MovementHistory[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        summaryRes,
        lowStockRes,
        usageRes,
        auditRes,
        orderRes,
        movementRes,
      ] = await Promise.all([
        reportsApi.inventorySummary(),
        reportsApi.lowStock(),
        reportsApi.usageStatistics(),
        reportsApi.auditLogs(),
        reportsApi.orderHistory(),
        reportsApi.movementHistory(),
      ]);

      setSummary(summaryRes.data);
      setLowStock(lowStockRes.data);
      setUsage(usageRes.data);
      setAuditLogs(auditRes.data);
      setOrderHistory(orderRes.data);
      setMovements(movementRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reports");
      console.error("Error fetching reports:", err);
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Reports & Analytics
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        Comprehensive inventory reports and analytics.
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Assessment sx={{ color: "primary.main", mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  {summary?.total_items || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Assessment sx={{ color: "warning.main", mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  {summary?.items_below_par || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Below Par Level
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Assessment sx={{ color: "info.main", mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  {summary?.total_locations || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Locations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Assessment sx={{ color: "success.main", mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  ${summary?.total_value.toLocaleString() || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Report Tabs */}
      <Paper elevation={2}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Low Stock" icon={<Assessment />} iconPosition="start" />
          <Tab
            label="Usage Statistics"
            icon={<Timeline />}
            iconPosition="start"
          />
          <Tab label="Audit Logs" icon={<History />} iconPosition="start" />
          <Tab label="Order History" icon={<History />} iconPosition="start" />
          <Tab label="Movements" icon={<SwapHoriz />} iconPosition="start" />
        </Tabs>

        {/* Low Stock Tab */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Current Qty</TableCell>
                  <TableCell align="right">Par Level</TableCell>
                  <TableCell align="right">Reorder Level</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowStock.map((item) => {
                  const percent = item.par_level
                    ? (item.current_quantity / item.par_level) * 100
                    : 0;
                  return (
                    <TableRow key={item.item_id}>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.location_name}</TableCell>
                      <TableCell align="right">
                        {item.current_quantity}
                      </TableCell>
                      <TableCell align="right">{item.par_level}</TableCell>
                      <TableCell align="right">{item.reorder_level}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${percent.toFixed(0)}%`}
                          color={percent < 25 ? "error" : "warning"}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Usage Statistics Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Total Used</TableCell>
                  <TableCell align="right">Times Used</TableCell>
                  <TableCell align="right">Avg Per Use</TableCell>
                  <TableCell>Last Used</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usage.map((stat) => (
                  <TableRow key={stat.item_id}>
                    <TableCell>{stat.item_name}</TableCell>
                    <TableCell align="right">
                      {stat.total_quantity_used}
                    </TableCell>
                    <TableCell align="right">{stat.usage_count}</TableCell>
                    <TableCell align="right">
                      {stat.average_quantity_per_use.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(stat.last_used).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Audit Logs Tab */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.username}</TableCell>
                    <TableCell>
                      <Chip label={log.action} size="small" />
                    </TableCell>
                    <TableCell>{log.item_name || "—"}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {log.details || "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Order History Tab */}
        <TabPanel value={tabValue} index={3}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Items</TableCell>
                  <TableCell align="right">Total Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderHistory.map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell>#{order.order_id}</TableCell>
                    <TableCell>{order.supplier}</TableCell>
                    <TableCell>
                      {new Date(order.order_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip label={order.status} size="small" />
                    </TableCell>
                    <TableCell align="right">{order.total_items}</TableCell>
                    <TableCell align="right">
                      ${order.total_cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Movements Tab */}
        <TabPanel value={tabValue} index={4}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>From Location</TableCell>
                  <TableCell>To Location</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>User</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {new Date(movement.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{movement.item_name}</TableCell>
                    <TableCell>{movement.from_location || "—"}</TableCell>
                    <TableCell>{movement.to_location || "—"}</TableCell>
                    <TableCell align="right">{movement.quantity}</TableCell>
                    <TableCell>{movement.username}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>
    </Box>
  );
}
