/**
 * Orders Page
 */
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Add,
  Visibility,
  CheckCircle,
  Cancel,
  Refresh,
} from "@mui/icons-material";
import {
  ordersApi,
  PurchaseOrder,
  CreatePurchaseOrderRequest,
} from "../services/apiService";

export default function OrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null
  );
  const [viewDialog, setViewDialog] = useState(false);

  // New order form state
  const [newOrder, setNewOrder] = useState<CreatePurchaseOrderRequest>({
    supplier: "",
    notes: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ordersApi.list();
      setOrders(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load orders");
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.supplier.trim()) {
      setError("Supplier is required");
      return;
    }

    try {
      await ordersApi.create(newOrder);
      setOpenDialog(false);
      setNewOrder({ supplier: "", notes: "" });
      fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create order");
      console.error("Error creating order:", err);
    }
  };

  const handleUpdateStatus = async (orderId: number, status: string) => {
    try {
      await ordersApi.updateStatus(orderId, status);
      fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update order status");
      console.error("Error updating order:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "warning";
      case "approved":
        return "info";
      case "ordered":
        return "primary";
      case "received":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "default";
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

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Purchase Orders
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage purchase orders and track shipments.
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchOrders}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            New Order
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Order Date</TableCell>
                <TableCell>Total Items</TableCell>
                <TableCell>Total Cost</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ py: 3 }}
                    >
                      No purchase orders found. Create your first order to get
                      started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        #{order.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{order.supplier}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        color={getStatusColor(order.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(order.order_date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {order.items?.length || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        ${order.total_cost?.toFixed(2) || "0.00"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedOrder(order);
                          setViewDialog(true);
                        }}
                        title="View Details"
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      {order.status.toLowerCase() === "pending" && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() =>
                              handleUpdateStatus(order.id, "approved")
                            }
                            title="Approve"
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              handleUpdateStatus(order.id, "cancelled")
                            }
                            title="Cancel"
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {order.status.toLowerCase() === "approved" && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() =>
                            handleUpdateStatus(order.id, "ordered")
                          }
                          title="Mark as Ordered"
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                      {order.status.toLowerCase() === "ordered" && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() =>
                            handleUpdateStatus(order.id, "received")
                          }
                          title="Mark as Received"
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Order Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Supplier"
                value={newOrder.supplier}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, supplier: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={newOrder.notes}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, notes: e.target.value })
                }
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateOrder} variant="contained">
            Create Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Order Details #{selectedOrder?.id}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Supplier
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedOrder.supplier}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box>
                    <Chip
                      label={selectedOrder.status}
                      color={getStatusColor(selectedOrder.status) as any}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Order Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedOrder.order_date).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Total Cost
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    ${selectedOrder.total_cost?.toFixed(2) || "0.00"}
                  </Typography>
                </Grid>
                {selectedOrder.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {selectedOrder.notes}
                    </Typography>
                  </Grid>
                )}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <Grid item xs={12}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      gutterBottom
                    >
                      Order Items
                    </Typography>
                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{ mt: 1 }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Unit Price</TableCell>
                            <TableCell align="right">Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedOrder.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {item.item_name || item.item_id}
                              </TableCell>
                              <TableCell align="right">
                                {item.quantity}
                              </TableCell>
                              <TableCell align="right">
                                ${item.unit_price?.toFixed(2) || "0.00"}
                              </TableCell>
                              <TableCell align="right">
                                $
                                {(
                                  (item.quantity || 0) * (item.unit_price || 0)
                                ).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
