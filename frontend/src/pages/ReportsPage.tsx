/**
 * Reports Page - Comprehensive EMS Supply Reports & Analytics
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
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
} from "@mui/material";
import {
  Assessment,
  Timeline,
  History,
  Download,
  Print,
  Refresh,
  AttachMoney,
  Warning,
  TrendingUp,
  Schedule,
  Inventory,
  CalendarMonth,
} from "@mui/icons-material";
import {
  reportsApi,
  InventorySummary,
  LowStockItem,
  UsageStatistic,
  CostAnalysisResponse,
  ProductLifeProjection,
  COGReport,
  DetailedUsageReport,
  ExpirationReport,
  TurnoverReport,
  ReorderForecast,
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

// Status color helper
function getStatusColor(status: string) {
  switch (status) {
    case "Critical":
    case "Expired":
    case "High":
      return "error";
    case "Low":
    case "Warning":
    case "Medium":
      return "warning";
    case "Normal":
    case "OK":
    case "Good":
      return "success";
    case "Overstocked":
    case "Excellent":
      return "info";
    default:
      return "default";
  }
}

export default function ReportsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [periodDays, setPeriodDays] = useState(30);

  // Report data - existing
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [usage, setUsage] = useState<UsageStatistic[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any>(null);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysisResponse | null>(
    null
  );

  // New report data
  const [productLife, setProductLife] = useState<ProductLifeProjection[]>([]);
  const [cogReport, setCogReport] = useState<COGReport | null>(null);
  const [detailedUsage, setDetailedUsage] = useState<DetailedUsageReport[]>([]);
  const [expirationReport, setExpirationReport] =
    useState<ExpirationReport | null>(null);
  const [turnoverReport, setTurnoverReport] = useState<TurnoverReport | null>(
    null
  );
  const [reorderForecast, setReorderForecast] =
    useState<ReorderForecast | null>(null);

  useEffect(() => {
    fetchReports();
  }, [periodDays]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all reports in parallel
      const [
        summaryRes,
        lowStockRes,
        usageRes,
        auditRes,
        orderRes,
        costRes,
        productLifeRes,
        cogRes,
        detailedUsageRes,
        expirationRes,
        turnoverRes,
        forecastRes,
      ] = await Promise.all([
        reportsApi.inventorySummary(),
        reportsApi.lowStock(),
        reportsApi.usage({ days: periodDays, limit: 50 }),
        reportsApi.audit({ limit: 100 }),
        reportsApi.orderHistory({ days: 90 }),
        reportsApi.costAnalysis(),
        reportsApi.productLifeProjection({ days_history: periodDays }),
        reportsApi.costOfGoods({ days: periodDays }),
        reportsApi.usageHistoryDetail({ days: periodDays, limit: 50 }),
        reportsApi.expirationTracking({ days_ahead: 90 }),
        reportsApi.inventoryTurnover({ days: periodDays }),
        reportsApi.reorderForecast({ days_ahead: 30 }),
      ]);

      setSummary(summaryRes.data);
      setLowStock(lowStockRes.data);
      setUsage(usageRes.data);
      setAuditLogs(auditRes.data);
      setOrderHistory(orderRes.data);
      setCostAnalysis(costRes.data);
      setProductLife(productLifeRes.data);
      setCogReport(cogRes.data);
      setDetailedUsage(detailedUsageRes.data);
      setExpirationReport(expirationRes.data);
      setTurnoverReport(turnoverRes.data);
      setReorderForecast(forecastRes.data);
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
      case 0: // Product Life
        return {
          data: productLife,
          title: "Product Life Projection Report",
          filename: "product-life-projection",
          columns: [
            { key: "item_name", header: "Item" },
            { key: "category", header: "Category" },
            { key: "current_stock", header: "Current Stock" },
            { key: "average_daily_usage", header: "Avg Daily Usage" },
            { key: "projected_days_remaining", header: "Days Remaining" },
            { key: "recommended_reorder_date", header: "Reorder By" },
            { key: "status", header: "Status" },
          ],
        };
      case 1: // COG
        return {
          data: cogReport?.top_cost_items || [],
          title: "Cost of Goods Report",
          filename: "cost-of-goods",
          columns: [
            { key: "item_name", header: "Item" },
            { key: "category", header: "Category" },
            { key: "unit_cost", header: "Unit Cost" },
            { key: "total_used", header: "Qty Used" },
            { key: "total_cost_used", header: "Total Cost" },
            { key: "monthly_cost_rate", header: "Monthly Rate" },
          ],
        };
      case 2: // Usage History
        return {
          data: detailedUsage,
          title: "Detailed Usage Report",
          filename: "usage-history",
          columns: [
            { key: "item_name", header: "Item" },
            { key: "category", header: "Category" },
            { key: "total_used", header: "Total Used" },
            { key: "total_received", header: "Total Received" },
            { key: "average_daily_usage", header: "Avg Daily Usage" },
            { key: "trend", header: "Trend" },
          ],
        };
      case 3: // Expiration
        return {
          data: expirationReport?.items || [],
          title: "Expiration Tracking Report",
          filename: "expiration-tracking",
          columns: [
            { key: "item_name", header: "Item" },
            { key: "location_name", header: "Location" },
            { key: "expiration_date", header: "Expiration Date" },
            { key: "days_until_expiration", header: "Days Until" },
            { key: "quantity", header: "Qty" },
            { key: "status", header: "Status" },
          ],
        };
      case 4: // Low Stock
        const lowStockConfig = exportLowStockReport(lowStock);
        return {
          data: lowStock as any[],
          title: "Low Stock Report",
          ...lowStockConfig,
        };
      case 5: // Turnover
        return {
          data: turnoverReport?.items || [],
          title: "Inventory Turnover Report",
          filename: "inventory-turnover",
          columns: [
            { key: "item_name", header: "Item" },
            { key: "category", header: "Category" },
            { key: "current_stock", header: "Stock" },
            { key: "total_used", header: "Used" },
            { key: "turnover_ratio", header: "Turnover Ratio" },
            { key: "efficiency", header: "Efficiency" },
          ],
        };
      case 6: // Reorder Forecast
        return {
          data: reorderForecast?.items || [],
          title: "Reorder Forecast Report",
          filename: "reorder-forecast",
          columns: [
            { key: "item_name", header: "Item" },
            { key: "current_stock", header: "Current" },
            { key: "projected_usage", header: "Projected Use" },
            { key: "quantity_to_order", header: "Order Qty" },
            { key: "suggested_reorder_date", header: "Reorder Date" },
            { key: "projected_order_cost", header: "Cost" },
          ],
        };
      case 7: // Usage Statistics
        const usageConfig = exportUsageReport(usage);
        return {
          data: usage as any[],
          title: "Usage Statistics Report",
          ...usageConfig,
        };
      case 8: // Audit
        const auditConfig = exportAuditLog(auditLogs);
        return {
          data: auditLogs,
          title: "Audit Log Report",
          ...auditConfig,
        };
      case 9: // Orders
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
      case 10: // Cost Analysis
        return {
          data: costAnalysis?.highest_value_items || [],
          title: "Cost Analysis Report",
          filename: "cost-analysis",
          columns: [
            { key: "item_name", header: "Item Name" },
            { key: "category", header: "Category" },
            { key: "unit_cost", header: "Unit Cost" },
            { key: "total_quantity", header: "Quantity" },
            { key: "total_value", header: "Total Value" },
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
        Comprehensive inventory reports, usage analytics, and cost projections.
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Inventory sx={{ color: "primary.main", mr: 1 }} />
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
          <Card
            sx={{
              bgcolor:
                productLife.filter((p) => p.status === "Critical").length > 0
                  ? "error.light"
                  : undefined,
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Warning sx={{ color: "warning.main", mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  {productLife.filter((p) => p.status === "Critical").length}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Critical (≤7 days supply)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <AttachMoney sx={{ color: "success.main", mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  ${cogReport?.projected_monthly_cog?.toLocaleString() || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Monthly COG (Projected)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CalendarMonth sx={{ color: "error.main", mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  {expirationReport?.total_expired || 0} /{" "}
                  {expirationReport?.total_warning || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Expired / Expiring Soon
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
            <Tab
              label="Product Life"
              icon={<Schedule />}
              iconPosition="start"
            />
            <Tab
              label="Cost of Goods"
              icon={<AttachMoney />}
              iconPosition="start"
            />
            <Tab
              label="Usage History"
              icon={<Timeline />}
              iconPosition="start"
            />
            <Tab
              label="Expiration"
              icon={<CalendarMonth />}
              iconPosition="start"
            />
            <Tab label="Low Stock" icon={<Warning />} iconPosition="start" />
            <Tab label="Turnover" icon={<TrendingUp />} iconPosition="start" />
            <Tab label="Forecast" icon={<Assessment />} iconPosition="start" />
            <Tab label="Usage Stats" icon={<Timeline />} iconPosition="start" />
            <Tab label="Audit Logs" icon={<History />} iconPosition="start" />
            <Tab label="Orders" icon={<History />} iconPosition="start" />
            <Tab
              label="Cost Analysis"
              icon={<AttachMoney />}
              iconPosition="start"
            />
          </Tabs>
          <Box sx={{ pr: 2, display: "flex", gap: 1, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={periodDays}
                label="Period"
                onChange={(e) => setPeriodDays(e.target.value as number)}
              >
                <MenuItem value={7}>7 Days</MenuItem>
                <MenuItem value={14}>14 Days</MenuItem>
                <MenuItem value={30}>30 Days</MenuItem>
                <MenuItem value={60}>60 Days</MenuItem>
                <MenuItem value={90}>90 Days</MenuItem>
              </Select>
            </FormControl>
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

        {/* Tab 0: Product Life Projection */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Product Life Projection
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Projected days of stock remaining based on historical usage
            patterns.
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Current Stock</TableCell>
                  <TableCell align="right">Avg Daily Usage</TableCell>
                  <TableCell align="right">Days Remaining</TableCell>
                  <TableCell>Reorder By</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productLife.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No product life data available
                    </TableCell>
                  </TableRow>
                ) : (
                  productLife.map((item) => (
                    <TableRow key={item.item_id}>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {item.item_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell align="right">{item.current_stock}</TableCell>
                      <TableCell align="right">
                        {item.average_daily_usage}
                      </TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {item.projected_days_remaining < 999
                            ? item.projected_days_remaining
                            : "∞"}
                          {item.projected_days_remaining < 999 && (
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(
                                (item.projected_days_remaining / 30) * 100,
                                100
                              )}
                              color={
                                item.status === "Critical"
                                  ? "error"
                                  : item.status === "Low"
                                  ? "warning"
                                  : "success"
                              }
                              sx={{ width: 50, height: 6, borderRadius: 1 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {item.recommended_reorder_date || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          size="small"
                          color={getStatusColor(item.status) as any}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 1: Cost of Goods */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Cost of Goods (COG) Report
          </Typography>
          {cogReport && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Total COG ({periodDays} days)
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="primary"
                      >
                        ${cogReport.total_cost_of_goods_used.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Daily Average
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        ${cogReport.average_daily_cog.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Monthly Projection
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="warning.main"
                      >
                        ${cogReport.projected_monthly_cog.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Yearly Projection
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="error.main"
                      >
                        ${cogReport.projected_yearly_cog.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Cost by Category
              </Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Items Used</TableCell>
                      <TableCell align="right">Total Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cogReport.by_category.map((cat) => (
                      <TableRow key={cat.category_id}>
                        <TableCell>{cat.category_name}</TableCell>
                        <TableCell align="right">
                          {cat.total_items_used}
                        </TableCell>
                        <TableCell align="right">
                          ${cat.total_cost.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Top Cost Items
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Unit Cost</TableCell>
                      <TableCell align="right">Qty Used</TableCell>
                      <TableCell align="right">Total Cost</TableCell>
                      <TableCell align="right">Monthly Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cogReport.top_cost_items.map((item) => (
                      <TableRow key={item.item_id}>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {item.item_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.item_code}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell align="right">
                          ${item.unit_cost.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">{item.total_used}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: "bold", color: "primary.main" }}
                        >
                          ${item.total_cost_used.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          ${item.monthly_cost_rate.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Tab 2: Detailed Usage History */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Detailed Usage History
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Comprehensive usage analysis with trends and daily breakdowns.
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Total Used</TableCell>
                  <TableCell align="right">Total Received</TableCell>
                  <TableCell align="right">Avg Daily</TableCell>
                  <TableCell>Peak Day</TableCell>
                  <TableCell>Trend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailedUsage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No usage history available
                    </TableCell>
                  </TableRow>
                ) : (
                  detailedUsage.map((item) => (
                    <TableRow key={item.item_id}>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {item.item_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell align="right">
                        <Typography color="error.main">
                          {item.total_used}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color="success.main">
                          {item.total_received}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.average_daily_usage}
                      </TableCell>
                      <TableCell>
                        {item.peak_usage_day && (
                          <>
                            {new Date(item.peak_usage_day).toLocaleDateString()}
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              ({item.peak_usage_amount} units)
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.trend}
                          size="small"
                          color={
                            item.trend === "Increasing"
                              ? "warning"
                              : item.trend === "Decreasing"
                              ? "success"
                              : "default"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 3: Expiration Tracking */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Expiration Tracking
          </Typography>
          {expirationReport && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      bgcolor:
                        expirationReport.total_expired > 0
                          ? "error.light"
                          : undefined,
                    }}
                  >
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Expired
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="error.main"
                      >
                        {expirationReport.total_expired}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      bgcolor:
                        expirationReport.total_critical > 0
                          ? "warning.light"
                          : undefined,
                    }}
                  >
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Critical (&lt;7 days)
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="warning.main"
                      >
                        {expirationReport.total_critical}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Warning (&lt;30 days)
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {expirationReport.total_warning}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Value at Risk
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="error.main"
                      >
                        ${expirationReport.total_at_risk_value.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Expiration Date</TableCell>
                      <TableCell align="right">Days Until</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Est. Value</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expirationReport.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No expiring items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      expirationReport.items.map((item, idx) => (
                        <TableRow key={`${item.item_id}-${idx}`}>
                          <TableCell>
                            <Typography fontWeight="medium">
                              {item.item_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.item_code}
                            </Typography>
                          </TableCell>
                          <TableCell>{item.location_name}</TableCell>
                          <TableCell>{item.expiration_date}</TableCell>
                          <TableCell align="right">
                            {item.days_until_expiration}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            ${item.estimated_value.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.status}
                              size="small"
                              color={getStatusColor(item.status) as any}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Tab 4: Low Stock */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            Low Stock Report
          </Typography>
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
                {lowStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No low stock items - All items are at par level
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStock.map((item) => {
                    const percent = item.par_quantity
                      ? (item.current_quantity / item.par_quantity) * 100
                      : 0;
                    return (
                      <TableRow key={`${item.item_id}-${item.location_id}`}>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {item.item_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.item_code}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.location_name}</TableCell>
                        <TableCell align="right">
                          {item.current_quantity}
                        </TableCell>
                        <TableCell align="right">{item.par_quantity}</TableCell>
                        <TableCell align="right">
                          {item.reorder_quantity}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${percent.toFixed(0)}%`}
                            color={percent < 25 ? "error" : "warning"}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 5: Inventory Turnover */}
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" gutterBottom>
            Inventory Turnover Analysis
          </Typography>
          {turnoverReport && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Items Analyzed
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {turnoverReport.total_items_analyzed}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Avg Turnover Ratio
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="primary.main"
                      >
                        {turnoverReport.average_turnover_ratio}x
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        High Turnover Items
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="success.main"
                      >
                        {turnoverReport.high_turnover_items}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Slow Moving Items
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="warning.main"
                      >
                        {turnoverReport.slow_moving_items}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell align="right">Used</TableCell>
                      <TableCell align="right">Turnover Ratio</TableCell>
                      <TableCell align="right">Days Supply</TableCell>
                      <TableCell>Efficiency</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {turnoverReport.items.map((item) => (
                      <TableRow key={item.item_id}>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {item.item_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.item_code}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell align="right">
                          {item.current_stock}
                        </TableCell>
                        <TableCell align="right">{item.total_used}</TableCell>
                        <TableCell align="right">
                          {item.turnover_ratio}x
                        </TableCell>
                        <TableCell align="right">
                          {item.days_of_supply < 999
                            ? item.days_of_supply
                            : "∞"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.efficiency}
                            size="small"
                            color={getStatusColor(item.efficiency) as any}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Tab 6: Reorder Forecast */}
        <TabPanel value={tabValue} index={6}>
          <Typography variant="h6" gutterBottom>
            Reorder Forecast (Next 30 Days)
          </Typography>
          {reorderForecast && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Items Needing Reorder
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="warning.main"
                      >
                        {reorderForecast.total_items_needing_reorder}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Projected Total Cost
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="primary.main"
                      >
                        ${reorderForecast.total_projected_cost.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Forecast Period
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {reorderForecast.forecast_period_days} Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Current</TableCell>
                      <TableCell align="right">Projected Use</TableCell>
                      <TableCell align="right">End Stock</TableCell>
                      <TableCell align="right">Order Qty</TableCell>
                      <TableCell>Reorder Date</TableCell>
                      <TableCell align="right">Est. Cost</TableCell>
                      <TableCell>Urgency</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reorderForecast.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No reorders projected in the next 30 days
                        </TableCell>
                      </TableRow>
                    ) : (
                      reorderForecast.items.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell>
                            <Typography fontWeight="medium">
                              {item.item_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.item_code}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {item.current_stock}
                          </TableCell>
                          <TableCell align="right">
                            {item.projected_usage.toFixed(0)}
                          </TableCell>
                          <TableCell align="right">
                            {item.projected_stock_at_end.toFixed(0)}
                          </TableCell>
                          <TableCell align="right">
                            {item.quantity_to_order}
                          </TableCell>
                          <TableCell>{item.suggested_reorder_date}</TableCell>
                          <TableCell align="right">
                            ${item.projected_order_cost.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.urgency}
                              size="small"
                              color={getStatusColor(item.urgency) as any}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Tab 7: Usage Statistics */}
        <TabPanel value={tabValue} index={7}>
          <Typography variant="h6" gutterBottom>
            Usage Statistics
          </Typography>
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
                        <Typography fontWeight="medium">
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

        {/* Tab 8: Audit Logs */}
        <TabPanel value={tabValue} index={8}>
          <Typography variant="h6" gutterBottom>
            Audit Logs
          </Typography>
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
                          {log.changes
                            ? typeof log.changes === "object"
                              ? JSON.stringify(log.changes).substring(0, 100) +
                                (JSON.stringify(log.changes).length > 100
                                  ? "..."
                                  : "")
                              : String(log.changes)
                            : "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 9: Order History */}
        <TabPanel value={tabValue} index={9}>
          <Typography variant="h6" gutterBottom>
            Order History
          </Typography>
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

        {/* Tab 10: Cost Analysis */}
        <TabPanel value={tabValue} index={10}>
          <Typography variant="h6" gutterBottom>
            Inventory Cost Analysis
          </Typography>
          {costAnalysis && (
            <>
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

              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                sx={{ mt: 3 }}
              >
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
                        <TableCell>{cat.category_name}</TableCell>
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

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Highest Value Items
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Unit Cost</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {costAnalysis.highest_value_items.map((item) => (
                      <TableRow key={item.item_id}>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {item.item_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.item_code}
                          </Typography>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
