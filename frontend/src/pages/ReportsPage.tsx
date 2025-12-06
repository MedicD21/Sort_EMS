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
  Button,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Assessment,
  Timeline,
  History,
  SwapHoriz,
  Download,
  Print,
  Refresh,
  AttachMoney,
} from "@mui/icons-material";
import {
  reportsApi,
  InventorySummary,
  LowStockItem,
  UsageStatistic,
  CostAnalysisResponse,
} from "../services/apiService";
import {
  exportToCSV,
  exportToPrintable,
  exportLowStockReport,
  exportUsageReport,
  exportAuditLog,
} from "../utils/exportUtils";

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
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);

  // Report data
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [usage, setUsage] = useState<UsageStatistic[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any>(null);
  const [movements, setMovements] = useState<any>(null);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysisResponse | null>(
    null
  );

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
        costRes,
      ] = await Promise.all([
        reportsApi.inventorySummary(),
        reportsApi.lowStock(),
        reportsApi.usage({ days: 30, limit: 50 }),
        reportsApi.audit({ limit: 100 }),
        reportsApi.orderHistory({ days: 90 }),
        reportsApi.movementHistory({ days: 30, limit: 100 }),
        reportsApi.costAnalysis(),
      ]);

      setSummary(summaryRes.data);
      setLowStock(lowStockRes.data);
      setUsage(usageRes.data);
      setAuditLogs(auditRes.data);
      setOrderHistory(orderRes.data);
      setMovements(movementRes.data);
      setCostAnalysis(costRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reports");
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    setExportAnchor(null);
    const currentData = getCurrentTabData();
    if (!currentData.data || currentData.data.length === 0) {
      alert("No data to export");
      return;
    }
    exportToCSV(currentData.data, currentData.filename, currentData.columns);
  };

  const handleExportPrint = () => {
    setExportAnchor(null);
    const currentData = getCurrentTabData();
    if (!currentData.data || currentData.data.length === 0) {
      alert("No data to export");
      return;
    }
    exportToPrintable(currentData.data, currentData.title, currentData.columns);
  };

  const getCurrentTabData = () => {
    switch (tabValue) {
      case 0:
        const lowStockConfig = exportLowStockReport(lowStock);
        return {
          data: lowStock as any[],
          title: "Low Stock Report",
          ...lowStockConfig,
        };
      case 1:
        const usageConfig = exportUsageReport(usage);
        return {
          data: usage as any[],
          title: "Usage Statistics Report",
          ...usageConfig,
        };
      case 2:
        const auditConfig = exportAuditLog(auditLogs);
        return {
          data: auditLogs,
          title: "Audit Log Report",
          ...auditConfig,
        };
      case 3:
        return {
          data: orderHistory?.orders || [],
          title: "Order History Report",
          filename: "order-history",
          columns: [
            { key: "order_number", header: "Order #" },
            { key: "vendor_name", header: "Vendor" },
            { key: "status", header: "Status" },
            { key: "order_date", header: "Order Date" },
            { key: "total_amount", header: "Total" },
          ],
        };
      case 4:
        return {
          data: movements?.movements || [],
          title: "Movement History Report",
          filename: "movement-history",
          columns: [
            { key: "created_at", header: "Timestamp" },
            { key: "item_id", header: "Item" },
            { key: "movement_type", header: "Type" },
            { key: "quantity", header: "Quantity" },
            { key: "user", header: "User" },
          ],
        };
      case 5:
        return {
          data: costAnalysis?.highest_value_items || [],
          title: "Cost Analysis Report",
          filename: "cost-analysis",
          columns: [
            { key: "item_name", header: "Item Name" },
            { key: "item_code", header: "Item Code" },
            { key: "category", header: "Category" },
            { key: "unit_cost", header: "Unit Cost" },
            { key: "total_quantity", header: "Quantity" },
            { key: "total_value", header: "Total Value" },
            { key: "percentage_of_total", header: "% of Total" },
          ],
        };
      default:
        return { data: [], title: "", filename: "", columns: [] };
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flexGrow: 1 }}
          >
            <Tab label="Low Stock" icon={<Assessment />} iconPosition="start" />
            <Tab
              label="Usage Statistics"
              icon={<Timeline />}
              iconPosition="start"
            />
            <Tab label="Audit Logs" icon={<History />} iconPosition="start" />
            <Tab
              label="Order History"
              icon={<History />}
              iconPosition="start"
            />
            <Tab label="Movements" icon={<SwapHoriz />} iconPosition="start" />
            <Tab
              label="Cost Analysis"
              icon={<AttachMoney />}
              iconPosition="start"
            />
          </Tabs>
          <Box sx={{ pr: 2, display: "flex", gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchReports} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
            >
              Export
            </Button>
          </Box>
        </Box>
        <Menu
          anchorEl={exportAnchor}
          open={Boolean(exportAnchor)}
          onClose={() => setExportAnchor(null)}
        >
          <MenuItem onClick={handleExportCSV}>
            <Download sx={{ mr: 1 }} fontSize="small" />
            Export to CSV (Excel)
          </MenuItem>
          <MenuItem onClick={handleExportPrint}>
            <Print sx={{ mr: 1 }} fontSize="small" />
            Print / Save as PDF
          </MenuItem>
        </Menu>

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
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Total Used</TableCell>
                  <TableCell align="right">Total Received</TableCell>
                  <TableCell align="right">Net Change</TableCell>
                  <TableCell align="right">Avg Daily Usage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No usage data available for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  usage.map((stat) => (
                    <TableRow key={stat.item_id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {stat.item_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stat.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell>{stat.category}</TableCell>
                      <TableCell align="right">
                        <Typography color="error.main">
                          {stat.total_used}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color="success.main">
                          {stat.total_received}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={
                            stat.net_change >= 0
                              ? `+${stat.net_change}`
                              : stat.net_change
                          }
                          color={stat.net_change >= 0 ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {stat.average_daily_usage}
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
                  <TableCell>Entity Type</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No audit logs available
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.user_name}</TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" />
                      </TableCell>
                      <TableCell>{log.entity_type}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {log.description || "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Order History Tab */}
        <TabPanel value={tabValue} index={3}>
          {orderHistory && (
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                  <Typography variant="h6">
                    {orderHistory.total_orders}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Value
                  </Typography>
                  <Typography variant="h6">
                    ${orderHistory.total_value?.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {orderHistory.pending_orders}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Received
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {orderHistory.received_orders}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!orderHistory?.orders || orderHistory.orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No orders in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  orderHistory.orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.order_number}</TableCell>
                      <TableCell>{order.vendor_name}</TableCell>
                      <TableCell>
                        {order.order_date
                          ? new Date(order.order_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status}
                          size="small"
                          color={
                            order.status === "received"
                              ? "success"
                              : order.status === "pending"
                              ? "warning"
                              : "default"
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        ${order.total_amount?.toFixed(2) || "0.00"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Movements Tab */}
        <TabPanel value={tabValue} index={4}>
          {movements && (
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Movements
                  </Typography>
                  <Typography variant="h6">
                    {movements.total_movements}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Quantity Moved
                  </Typography>
                  <Typography variant="h6">
                    {movements.total_quantity_moved}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Movement Types
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}
                  >
                    {Object.entries(movements.movement_types || {}).map(
                      ([type, count]) => (
                        <Chip
                          key={type}
                          label={`${type}: ${count}`}
                          size="small"
                        />
                      )
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!movements?.movements || movements.movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No movements in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.movements.map((movement: any) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {new Date(movement.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={movement.movement_type} size="small" />
                      </TableCell>
                      <TableCell>{movement.from_location_id || "—"}</TableCell>
                      <TableCell>{movement.to_location_id || "—"}</TableCell>
                      <TableCell align="right">{movement.quantity}</TableCell>
                      <TableCell>{movement.user}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {movement.notes || "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Cost Analysis Tab */}
        <TabPanel value={tabValue} index={5}>
          {costAnalysis && (
            <>
              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Total Inventory Value
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="primary"
                      >
                        ${costAnalysis.total_inventory_value.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Items with Stock
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {costAnalysis.total_items}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Total Quantity
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {costAnalysis.total_quantity.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Avg Value per Item
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        ${costAnalysis.average_item_cost.toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Cost by Category */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Cost by Category
              </Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                      <TableCell align="right">% of Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {costAnalysis.cost_by_category.map((cat) => (
                      <TableRow key={cat.category_id}>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {cat.category_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{cat.total_items}</TableCell>
                        <TableCell align="right">
                          {cat.total_quantity.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          ${cat.total_value.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${cat.percentage_of_total}%`}
                            size="small"
                            color={
                              cat.percentage_of_total > 20
                                ? "primary"
                                : "default"
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Highest Value Items */}
              <Typography variant="h6" gutterBottom>
                Highest Value Items
              </Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Unit Cost</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                      <TableCell align="right">% of Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {costAnalysis.highest_value_items.map((item) => (
                      <TableRow key={item.item_id}>
                        <TableCell>
                          <Box>
                            <Typography fontWeight="medium">
                              {item.item_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.item_code}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell align="right">
                          ${item.unit_cost.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {item.total_quantity}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: "bold", color: "primary.main" }}
                        >
                          ${item.total_value.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          {item.percentage_of_total}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Value Distribution */}
              <Typography variant="h6" gutterBottom>
                Value Distribution
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(costAnalysis.value_distribution).map(
                  ([range, count]) => (
                    <Grid item xs={6} sm={2.4} key={range}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: "center", py: 1 }}>
                          <Typography variant="h6" fontWeight="bold">
                            {count}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ${range}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                )}
              </Grid>
            </>
          )}
          {!costAnalysis && (
            <Typography
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              No cost data available
            </Typography>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
}
