/**
 * Restock Orders Page (Internal Orders)
 * Displays logistics orders for restocking stations/trucks
 */
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Checkbox,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import {
  internalOrdersApi,
  InternalOrder,
  InternalOrderDetail,
} from "../services/apiService";

export default function RestockOrdersPage() {
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<InternalOrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await internalOrdersApi.list({ limit: 1000 });
      setOrders(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load restock orders");
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId: string) => {
    try {
      setLoadingDetail(true);
      setError(null);
      const response = await internalOrdersApi.get(orderId);
      setSelectedOrder(response.data);
      setDetailDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load order details");
      console.error("Error fetching order details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      setError(null);
      await internalOrdersApi.updateStatus(orderId, status);
      setSuccess(`Order status updated to ${status}`);
      fetchOrders();
      setDetailDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update order status");
      console.error("Error updating status:", err);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      setError(null);
      await internalOrdersApi.delete(orderId);
      setSuccess("Order deleted successfully");
      fetchOrders();
      setDetailDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete order");
      console.error("Error deleting order:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "warning";
      case "order_received":
        return "info";
      case "out_for_delivery":
        return "primary";
      case "completed":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStationNames = (order: InternalOrderDetail | null): string => {
    if (!order || !order.items) return "";
    const stations = new Set<string>();
    order.items.forEach((item) => {
      item.locations.forEach((loc) => {
        stations.add(loc.location_name);
      });
    });
    return stations.size > 0 ? ` (${Array.from(stations).join(", ")})` : "";
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const pendingOrderIds = orders
        .filter((order) => order.status === "pending")
        .map((order) => order.id);
      setSelectedOrderIds(pendingOrderIds);
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBulkMarkAsReceived = async () => {
    if (selectedOrderIds.length === 0) return;

    try {
      setError(null);
      await internalOrdersApi.bulkUpdateStatus(
        selectedOrderIds,
        "order_received"
      );
      setSuccess(
        `Marked ${selectedOrderIds.length} order(s) as Order Received`
      );
      setSelectedOrderIds([]);
      fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update orders");
      console.error("Error bulk updating:", err);
    }
  };

  const handlePrintOrder = () => {
    if (!selectedOrder) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Restock Order - ${selectedOrder.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { border-bottom: 3px solid #333; padding-bottom: 10px; }
            .header { margin-bottom: 30px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            .info-item { margin-bottom: 10px; }
            .label { font-weight: bold; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #333; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .quantity { font-weight: bold; font-size: 1.1em; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Restock Order Fulfillment Sheet</h1>
            <div class="info-grid">
              <div class="info-item"><span class="label">Order Number:</span> ${
                selectedOrder.order_number
              }</div>
              <div class="info-item"><span class="label">Status:</span> ${formatStatus(
                selectedOrder.status
              )}</div>
              <div class="info-item"><span class="label">Date:</span> ${new Date(
                selectedOrder.order_date
              ).toLocaleString()}</div>
              <div class="info-item"><span class="label">Created By:</span> ${
                selectedOrder.created_by_name || "N/A"
              }</div>
            </div>
            ${
              selectedOrder.notes
                ? `<div class="info-item"><span class="label">Notes:</span> ${selectedOrder.notes}</div>`
                : ""
            }
          </div>
          
          <h2>Items to Deliver</h2>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Item Code</th>
                <th>Station</th>
                <th>Quantity Needed</th>
                <th>Current Stock</th>
                <th>Par Level</th>
                <th>✓</th>
              </tr>
            </thead>
            <tbody>
              ${selectedOrder.items
                .map((item) =>
                  item.locations
                    .map(
                      (loc) => `
                  <tr>
                    <td>${item.item_name}</td>
                    <td>${item.item_code}</td>
                    <td>${loc.location_name}</td>
                    <td class="quantity">${loc.quantity_needed}</td>
                    <td>${loc.current_stock}</td>
                    <td>${loc.par_level}</td>
                    <td style="width: 30px;">☐</td>
                  </tr>
                `
                    )
                    .join("")
                )
                .join("")}
            </tbody>
          </table>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd;">
            <p><strong>Prepared By:</strong> ___________________________ <strong>Date:</strong> _______________</p>
            <p><strong>Delivered By:</strong> ___________________________ <strong>Date:</strong> _______________</p>
          </div>
          
          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #333; color: white; border: none; cursor: pointer; font-size: 16px;">Print This Sheet</button>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const pendingOrdersCount = orders.filter(
    (order) => order.status === "pending"
  ).length;
  const allPendingSelected =
    pendingOrdersCount > 0 && selectedOrderIds.length === pendingOrdersCount;

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Restock Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Internal logistics orders for restocking stations and trucks
          </Typography>
        </Box>
        <IconButton onClick={fetchOrders} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedOrderIds.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: "primary.dark" }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body1" sx={{ color: "white" }}>
              {selectedOrderIds.length} order(s) selected
            </Typography>
            <Button
              variant="contained"
              color="info"
              startIcon={<InventoryIcon />}
              onClick={handleBulkMarkAsReceived}
              size="large"
            >
              Mark All as Order Received
            </Button>
          </Box>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allPendingSelected}
                  indeterminate={
                    selectedOrderIds.length > 0 && !allPendingSelected
                  }
                  onChange={handleSelectAll}
                  disabled={pendingOrdersCount === 0}
                />
              </TableCell>
              <TableCell>
                <strong>Order #</strong>
              </TableCell>
              <TableCell>
                <strong>Locations</strong>
              </TableCell>
              <TableCell>
                <strong>Status</strong>
              </TableCell>
              <TableCell>
                <strong>Order Date</strong>
              </TableCell>
              <TableCell>
                <strong>Total Items</strong>
              </TableCell>
              <TableCell>
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 4 }}
                  >
                    No restock orders found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      disabled={order.status !== "pending"}
                    />
                  </TableCell>
                  <TableCell>#{order.order_number}</TableCell>
                  <TableCell>{order.location_summary}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatStatus(order.status)}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(order.order_date).toLocaleDateString("en-US", {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>{order.total_items}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleViewDetails(order.id)}
                      title="View Details"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(order.id)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Order Details Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedOrder
            ? `Order Details - ${selectedOrder.order_number}${getStationNames(
                selectedOrder
              )}`
            : "Loading..."}
        </DialogTitle>
        <DialogContent>
          {loadingDetail ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : selectedOrder ? (
            <Box sx={{ pb: 2 }}>
              {/* Order Information Section */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  bgcolor: "rgba(255, 255, 255, 0.02)",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ mb: 2, fontWeight: 600 }}
                >
                  Order Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Status
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={formatStatus(selectedOrder.status)}
                          color={getStatusColor(selectedOrder.status)}
                          sx={{ fontWeight: 600, fontSize: "0.875rem" }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Order Date
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ mt: 1, fontWeight: 500 }}
                      >
                        {new Date(selectedOrder.order_date).toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                  {selectedOrder.created_by_name && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Created By
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ mt: 1, fontWeight: 500 }}
                        >
                          {selectedOrder.created_by_name}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {selectedOrder.completed_date && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Completed Date
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ mt: 1, fontWeight: 500 }}
                        >
                          {new Date(
                            selectedOrder.completed_date
                          ).toLocaleString()}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {selectedOrder.notes && (
                    <Grid item xs={12}>
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Notes
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          {selectedOrder.notes}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Items Section */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: "rgba(255, 255, 255, 0.02)",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ mb: 3, fontWeight: 600 }}
                >
                  Items to Deliver
                </Typography>

                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.05)" }}>
                        <TableCell
                          sx={{ fontWeight: 700, fontSize: "0.875rem", py: 2 }}
                        >
                          Item Name
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 700, fontSize: "0.875rem", py: 2 }}
                        >
                          Item Code
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 700, fontSize: "0.875rem", py: 2 }}
                        >
                          Station
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, fontSize: "0.875rem", py: 2 }}
                        >
                          Quantity Needed
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, fontSize: "0.875rem", py: 2 }}
                        >
                          Current Stock
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, fontSize: "0.875rem", py: 2 }}
                        >
                          Par Level
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items.map((item) =>
                        item.locations.map((loc, idx) => (
                          <TableRow
                            key={`${item.item_id}-${idx}`}
                            sx={{
                              "&:hover": { bgcolor: "action.hover" },
                              borderBottom:
                                idx === item.locations.length - 1
                                  ? "2px solid"
                                  : "1px solid",
                              borderColor:
                                idx === item.locations.length - 1
                                  ? "divider"
                                  : "rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            {idx === 0 && (
                              <>
                                <TableCell
                                  rowSpan={item.locations.length}
                                  sx={{ py: 2.5 }}
                                >
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 600, fontSize: "1rem" }}
                                  >
                                    {item.item_name}
                                  </Typography>
                                </TableCell>
                                <TableCell
                                  rowSpan={item.locations.length}
                                  sx={{ py: 2.5 }}
                                >
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      fontSize: "0.875rem",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {item.item_code}
                                  </Typography>
                                </TableCell>
                              </>
                            )}
                            <TableCell sx={{ py: 2.5 }}>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 500, fontSize: "1rem" }}
                              >
                                {loc.location_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 2.5 }}>
                              <Chip
                                label={loc.quantity_needed}
                                color="primary"
                                size="medium"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: "1rem",
                                  minWidth: 60,
                                }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 2.5 }}>
                              <Typography
                                variant="body1"
                                color="text.secondary"
                                sx={{ fontSize: "0.95rem" }}
                              >
                                {loc.current_stock}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 2.5 }}>
                              <Typography
                                variant="body1"
                                color="text.secondary"
                                sx={{ fontSize: "0.95rem" }}
                              >
                                {loc.par_level}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: "rgba(255, 255, 255, 0.02)",
            borderTop: "1px solid",
            borderColor: "divider",
            justifyContent: "space-between",
          }}
        >
          <Button
            onClick={handlePrintOrder}
            variant="outlined"
            startIcon={<PrintIcon />}
            size="large"
            sx={{ px: 3 }}
          >
            Print Fulfillment Sheet
          </Button>
          <Box>
            {selectedOrder && selectedOrder.status === "pending" && (
              <Button
                onClick={() =>
                  handleUpdateStatus(selectedOrder.id, "order_received")
                }
                color="info"
                variant="contained"
                size="large"
                sx={{ px: 4, fontWeight: 600, mr: 1 }}
              >
                Mark as Order Received
              </Button>
            )}
            {selectedOrder && selectedOrder.status === "order_received" && (
              <Button
                onClick={() =>
                  handleUpdateStatus(selectedOrder.id, "out_for_delivery")
                }
                color="primary"
                variant="contained"
                size="large"
                sx={{ px: 4, fontWeight: 600, mr: 1 }}
              >
                Mark as Out for Delivery
              </Button>
            )}
            {selectedOrder && selectedOrder.status === "out_for_delivery" && (
              <Button
                onClick={() =>
                  handleUpdateStatus(selectedOrder.id, "completed")
                }
                color="success"
                variant="contained"
                size="large"
                sx={{ px: 4, fontWeight: 600, mr: 1 }}
              >
                Mark as Completed
              </Button>
            )}
            <Button
              onClick={() => setDetailDialogOpen(false)}
              size="large"
              sx={{ px: 3 }}
            >
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
