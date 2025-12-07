import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip,
  Grid,
  Autocomplete,
  Divider,
  List,
  Card,
  CardContent,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  LocalShipping as ShipIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ordersApi,
  type PurchaseOrder,
  type Vendor,
  type CreateOrder,
  itemsApi,
  type Item,
  locationsApi,
  type Location as LocationType,
  type ReceiveOrderItem,
} from "../services/apiService";

type OrderStatus = "pending" | "ordered" | "partial" | "received" | "cancelled";

const statusColors: Record<
  OrderStatus,
  "warning" | "info" | "success" | "error" | "default"
> = {
  pending: "warning",
  ordered: "info",
  partial: "default",
  received: "success",
  cancelled: "error",
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  ordered: "Ordered",
  partial: "Partial",
  received: "Received",
  cancelled: "Cancelled",
};

interface OrderItemEntry {
  item: Item | null;
  quantity: number;
  unitCost: number | null;
}

const PurchaseOrdersPage = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null
  );

  // Create form state
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([
    { item: null, quantity: 1, unitCost: null },
  ]);

  // Receive form state
  const [receiveItems, setReceiveItems] = useState<
    Array<{
      itemId: string;
      itemName: string;
      maxQty: number;
      quantity: number;
      locationId: string;
    }>
  >([]);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  // Queries
  const {
    data: orders = [],
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchaseOrders", filterStatus, filterVendor],
    queryFn: async () => {
      const params: Record<string, string | undefined> = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterVendor !== "all") params.vendor_id = filterVendor;
      const response = await ordersApi.list(params);
      return response.data;
    },
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      const response = await ordersApi.vendors.list(true);
      return response.data;
    },
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["items"],
    queryFn: async () => {
      const response = await itemsApi.list({ limit: 1000 });
      return response.data;
    },
  });

  const { data: locations = [] } = useQuery<LocationType[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await locationsApi.list();
      return response.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateOrder) => ordersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      setSnackbar({
        open: true,
        message: "Purchase order created",
        severity: "success",
      });
      handleCloseCreate();
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: error.message || "Failed to create order",
        severity: "error",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      setSnackbar({
        open: true,
        message: "Order status updated",
        severity: "success",
      });
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: error.message || "Failed to update",
        severity: "error",
      });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: ReceiveOrderItem[] }) =>
      ordersApi.receive(id, { items }),
    onSuccess: (response: {
      data: { message: string; order_status: string; fully_received: boolean };
    }) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      const msg = response.data.fully_received
        ? "Order fully received!"
        : "Items received. Order partially complete.";
      setSnackbar({ open: true, message: msg, severity: "success" });
      setReceiveDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: error.message || "Failed to receive items",
        severity: "error",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      setSnackbar({
        open: true,
        message: "Order cancelled",
        severity: "success",
      });
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: error.message || "Failed to cancel",
        severity: "error",
      });
    },
  });

  // Handlers
  const handleCloseCreate = () => {
    setCreateDialogOpen(false);
    setSelectedVendor(null);
    setPoNumber("");
    setExpectedDelivery("");
    setOrderItems([{ item: null, quantity: 1, unitCost: null }]);
  };

  const handleAddOrderItem = () => {
    setOrderItems([...orderItems, { item: null, quantity: 1, unitCost: null }]);
  };

  const handleRemoveOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleOrderItemChange = (
    index: number,
    field: keyof OrderItemEntry,
    value: Item | null | number
  ) => {
    const updated = [...orderItems];
    if (field === "item") {
      updated[index].item = value as Item | null;
      // Auto-fill unit cost from item if available
      if (value && (value as Item).unit_cost) {
        updated[index].unitCost = (value as Item).unit_cost ?? null;
      }
    } else if (field === "quantity") {
      updated[index].quantity = value as number;
    } else if (field === "unitCost") {
      updated[index].unitCost = value as number | null;
    }
    setOrderItems(updated);
  };

  const generatePONumber = () => {
    const date = new Date();
    const prefix = "PO";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    setPoNumber(`${prefix}-${year}${month}${day}-${random}`);
  };

  const handleCreateOrder = () => {
    if (!selectedVendor || !poNumber) {
      setSnackbar({
        open: true,
        message: "Please select vendor and enter PO number",
        severity: "error",
      });
      return;
    }

    const validItems = orderItems.filter((oi) => oi.item && oi.quantity > 0);
    if (validItems.length === 0) {
      setSnackbar({
        open: true,
        message: "Please add at least one item",
        severity: "error",
      });
      return;
    }

    const orderData: CreateOrder = {
      vendor_id: selectedVendor.id,
      po_number: poNumber,
      items: validItems.map((oi) => ({
        item_id: oi.item!.id,
        quantity_ordered: oi.quantity,
        unit_cost: oi.unitCost ?? undefined,
      })),
      expected_delivery_date: expectedDelivery
        ? new Date(expectedDelivery).toISOString()
        : undefined,
    };

    createMutation.mutate(orderData);
  };

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleOpenReceive = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    // Initialize receive items from order items that aren't fully received
    const itemsToReceive = order.items
      .filter((item) => item.quantity_received < item.quantity_ordered)
      .map((item) => ({
        itemId: item.item_id,
        itemName: item.item_name || "Unknown",
        maxQty: item.quantity_ordered - item.quantity_received,
        quantity: item.quantity_ordered - item.quantity_received,
        locationId: "",
      }));
    setReceiveItems(itemsToReceive);
    setReceiveDialogOpen(true);
  };

  const handleReceiveSubmit = () => {
    if (!selectedOrder) return;

    const validItems = receiveItems.filter(
      (ri) => ri.quantity > 0 && ri.locationId
    );
    if (validItems.length === 0) {
      setSnackbar({
        open: true,
        message: "Please specify quantities and locations",
        severity: "error",
      });
      return;
    }

    const items: ReceiveOrderItem[] = validItems.map((ri) => ({
      item_id: ri.itemId,
      quantity_received: ri.quantity,
      location_id: ri.locationId,
    }));

    receiveMutation.mutate({ id: selectedOrder.id, items });
  };

  const handleMarkOrdered = (order: PurchaseOrder) => {
    updateStatusMutation.mutate({ id: order.id, status: "ordered" });
  };

  const handleCancelOrder = (order: PurchaseOrder) => {
    if (window.confirm(`Cancel order ${order.po_number}?`)) {
      cancelMutation.mutate(order.id);
    }
  };

  // Filter orders by search term
  const filteredOrders = orders.filter((order: PurchaseOrder) => {
    const matchesSearch =
      searchTerm === "" ||
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.vendor_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      );
    return matchesSearch;
  });

  // Calculate totals
  const calculateOrderTotal = () => {
    return orderItems.reduce((sum, item) => {
      if (item.item && item.quantity && item.unitCost) {
        return sum + item.quantity * item.unitCost;
      }
      return sum;
    }, 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "-";
    return `$${value.toFixed(2)}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Purchase Orders
      </Typography>

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="PO number or vendor..."
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="ordered">Ordered</MenuItem>
                <MenuItem value="partial">Partial</MenuItem>
                <MenuItem value="received">Received</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Vendor</InputLabel>
              <Select
                value={filterVendor}
                label="Vendor"
                onChange={(e) => setFilterVendor(e.target.value)}
              >
                <MenuItem value="all">All Vendors</MenuItem>
                {vendors.map((v: Vendor) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid
            item
            xs={12}
            sm={4}
            sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
          >
            <IconButton onClick={() => refetchOrders()} title="Refresh">
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              New Order
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PO Number</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Order Date</TableCell>
              <TableCell>Expected Delivery</TableCell>
              <TableCell align="right">Items</TableCell>
              <TableCell align="right">Total Cost</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordersLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No purchase orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order: PurchaseOrder) => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {order.po_number}
                    </Typography>
                  </TableCell>
                  <TableCell>{order.vendor_name || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[order.status as OrderStatus]}
                      color={statusColors[order.status as OrderStatus]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(order.order_date)}</TableCell>
                  <TableCell>
                    {formatDate(order.expected_delivery_date)}
                  </TableCell>
                  <TableCell align="right">
                    {order.items?.length || 0}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(order.total_cost)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewOrder(order)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {order.status === "pending" && (
                      <Tooltip title="Mark as Ordered">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleMarkOrdered(order)}
                        >
                          <ShipIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(order.status === "ordered" ||
                      order.status === "partial") && (
                      <Tooltip title="Receive Items">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleOpenReceive(order)}
                        >
                          <ReceiptIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(order.status === "pending" ||
                      order.status === "ordered") && (
                      <Tooltip title="Cancel Order">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleCancelOrder(order)}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Order Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreate}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={vendors}
                getOptionLabel={(v) => v.name}
                value={selectedVendor}
                onChange={(_, v) => setSelectedVendor(v)}
                renderInput={(params) => (
                  <TextField {...params} label="Vendor" required fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="PO Number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                onClick={generatePONumber}
                fullWidth
                sx={{ height: "56px" }}
              >
                Generate
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Expected Delivery Date"
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Order Items
          </Typography>

          {orderItems.map((orderItem, index) => (
            <Grid
              container
              spacing={2}
              key={index}
              sx={{ mb: 2 }}
              alignItems="center"
            >
              <Grid item xs={12} sm={5}>
                <Autocomplete
                  options={items}
                  getOptionLabel={(item) => `${item.sku} - ${item.name}`}
                  value={orderItem.item}
                  onChange={(_, v) => handleOrderItemChange(index, "item", v)}
                  renderInput={(params) => (
                    <TextField {...params} label="Item" size="small" />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Quantity"
                  type="text"
                  inputMode="numeric"
                  inputProps={{ pattern: "[0-9]*" }}
                  value={orderItem.quantity}
                  onChange={(e) =>
                    handleOrderItemChange(
                      index,
                      "quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Unit Cost"
                  type="text"
                  inputMode="decimal"
                  inputProps={{ pattern: "[0-9.]*" }}
                  value={orderItem.unitCost ?? ""}
                  onChange={(e) =>
                    handleOrderItemChange(
                      index,
                      "unitCost",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal:{" "}
                  {orderItem.quantity && orderItem.unitCost
                    ? formatCurrency(orderItem.quantity * orderItem.unitCost)
                    : "-"}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={1}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveOrderItem(index)}
                  disabled={orderItems.length <= 1}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddOrderItem}
            sx={{ mb: 2 }}
          >
            Add Item
          </Button>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" align="right">
            Total: {formatCurrency(calculateOrderTotal())}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreate}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateOrder}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Order"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Purchase Order: {selectedOrder?.po_number}
          <Chip
            label={statusLabels[selectedOrder?.status || "pending"]}
            color={statusColors[selectedOrder?.status || "pending"]}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Vendor
                  </Typography>
                  <Typography>{selectedOrder.vendor_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Order Date
                  </Typography>
                  <Typography>
                    {formatDate(selectedOrder.order_date)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Expected Delivery
                  </Typography>
                  <Typography>
                    {formatDate(selectedOrder.expected_delivery_date)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Received Date
                  </Typography>
                  <Typography>
                    {formatDate(selectedOrder.received_date)}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                Items
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Ordered</TableCell>
                      <TableCell align="right">Received</TableCell>
                      <TableCell align="right">Unit Cost</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.item_name || item.item_id}</TableCell>
                        <TableCell align="right">
                          {item.quantity_ordered}
                        </TableCell>
                        <TableCell align="right">
                          {item.quantity_received}
                          {item.quantity_received < item.quantity_ordered && (
                            <Chip
                              label="Pending"
                              size="small"
                              color="warning"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.unit_cost)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.total_cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <strong>Total:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>
                          {formatCurrency(selectedOrder.total_cost)}
                        </strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {(selectedOrder?.status === "ordered" ||
            selectedOrder?.status === "partial") && (
            <Button
              variant="contained"
              color="success"
              startIcon={<ReceiptIcon />}
              onClick={() => {
                setViewDialogOpen(false);
                if (selectedOrder) handleOpenReceive(selectedOrder);
              }}
            >
              Receive Items
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Receive Items Dialog */}
      <Dialog
        open={receiveDialogOpen}
        onClose={() => setReceiveDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Receive Items - {selectedOrder?.po_number}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter quantities received and select the location where items will
            be stored.
          </Alert>

          <List>
            {receiveItems.map((item, index) => (
              <Card key={item.itemId} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {item.itemName}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Remaining to receive: {item.maxQty}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Quantity to Receive"
                        type="text"
                        inputMode="numeric"
                        inputProps={{ pattern: "[0-9]*", max: item.maxQty }}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const updated = [...receiveItems];
                          updated[index].quantity = Math.min(val, item.maxQty);
                          setReceiveItems(updated);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Receive to Location</InputLabel>
                        <Select
                          value={item.locationId}
                          label="Receive to Location"
                          onChange={(e) => {
                            const updated = [...receiveItems];
                            updated[index].locationId = e.target.value;
                            setReceiveItems(updated);
                          }}
                        >
                          {locations.map((loc: LocationType) => (
                            <MenuItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </List>

          {receiveItems.length === 0 && (
            <Typography color="text.secondary" align="center">
              All items have been received for this order.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleReceiveSubmit}
            disabled={receiveMutation.isPending || receiveItems.length === 0}
          >
            {receiveMutation.isPending ? "Processing..." : "Receive Items"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PurchaseOrdersPage;
