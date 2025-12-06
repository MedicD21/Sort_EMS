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
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
  LinearProgress,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  ShoppingCart as CartIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ordersApi,
  ReorderSuggestion,
  Vendor,
  categoriesApi,
  Category,
} from "../services/apiService";

const urgencyConfig = {
  critical: {
    color: "error" as const,
    icon: <ErrorIcon fontSize="small" />,
    label: "Critical",
  },
  high: {
    color: "warning" as const,
    icon: <WarningIcon fontSize="small" />,
    label: "High",
  },
  medium: {
    color: "info" as const,
    icon: <InfoIcon fontSize="small" />,
    label: "Medium",
  },
  low: { color: "default" as const, icon: null, label: "Low" },
};

const ReorderSuggestionsPage = () => {
  const queryClient = useQueryClient();
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [createPODialog, setCreatePODialog] = useState(false);
  const [selectedVendorForPO, setSelectedVendorForPO] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  // Queries
  const {
    data: suggestions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "reorderSuggestions",
      filterVendor,
      filterCategory,
      filterUrgency,
    ],
    queryFn: async () => {
      const params: Record<string, string | undefined> = {};
      if (filterVendor !== "all") params.vendor_id = filterVendor;
      if (filterCategory !== "all") params.category_id = filterCategory;
      if (filterUrgency !== "all") params.urgency = filterUrgency;
      const response = await ordersApi.suggestions.getReorderSuggestions(
        params
      );
      return response.data;
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const response = await ordersApi.vendors.list(true);
      return response.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await categoriesApi.list({ active_only: true });
      return response.data;
    },
  });

  // Mutation
  const createPOMutation = useMutation({
    mutationFn: (data: { item_ids: string[]; vendor_id: string }) =>
      ordersApi.suggestions.createPOFromSuggestions(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["reorderSuggestions"] });
      setSnackbar({
        open: true,
        message: `Created ${response.data.po_number} with ${response.data.items_count} items`,
        severity: "success",
      });
      setSelectedItems([]);
      setCreatePODialog(false);
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: error.message || "Failed to create PO",
        severity: "error",
      });
    },
  });

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(suggestions.map((s) => s.item_id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCreatePO = () => {
    if (selectedItems.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select items to order",
        severity: "error",
      });
      return;
    }
    setCreatePODialog(true);
  };

  const handleConfirmCreatePO = () => {
    if (!selectedVendorForPO) {
      setSnackbar({
        open: true,
        message: "Please select a vendor",
        severity: "error",
      });
      return;
    }
    createPOMutation.mutate({
      item_ids: selectedItems,
      vendor_id: selectedVendorForPO,
    });
  };

  // Calculate summary stats
  const totalSuggestions = suggestions.length;
  const criticalCount = suggestions.filter(
    (s) => s.urgency === "critical"
  ).length;
  const highCount = suggestions.filter((s) => s.urgency === "high").length;
  const totalEstimatedCost = suggestions.reduce(
    (sum, s) => sum + (s.estimated_cost || 0),
    0
  );
  const selectedEstimatedCost = suggestions
    .filter((s) => selectedItems.includes(s.item_id))
    .reduce((sum, s) => sum + (s.estimated_cost || 0), 0);

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "-";
    return `$${value.toFixed(2)}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reorder Suggestions
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Suggestions
              </Typography>
              <Typography variant="h4">{totalSuggestions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: "error.main" }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Critical Items
              </Typography>
              <Typography variant="h4" color="error.main">
                {criticalCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: "warning.main" }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                High Priority
              </Typography>
              <Typography variant="h4" color="warning.main">
                {highCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Est. Total Cost
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalEstimatedCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Urgency</InputLabel>
              <Select
                value={filterUrgency}
                label="Urgency"
                onChange={(e) => setFilterUrgency(e.target.value)}
              >
                <MenuItem value="all">All Urgencies</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={filterCategory}
                label="Category"
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
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
                {vendors.map((v) => (
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
            sm={3}
            sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
          >
            <Tooltip title="Refresh">
              <IconButton onClick={() => refetch()}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<CartIcon />}
              onClick={handleCreatePO}
              disabled={selectedItems.length === 0}
            >
              Create PO ({selectedItems.length})
            </Button>
          </Grid>
        </Grid>

        {selectedItems.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {selectedItems.length} items selected - Estimated cost:{" "}
            {formatCurrency(selectedEstimatedCost)}
          </Alert>
        )}
      </Paper>

      {/* Suggestions Table */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedItems.length > 0 &&
                    selectedItems.length < suggestions.length
                  }
                  checked={
                    suggestions.length > 0 &&
                    selectedItems.length === suggestions.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>Urgency</TableCell>
              <TableCell>Item Code</TableCell>
              <TableCell>Item Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Current Stock</TableCell>
              <TableCell align="right">Reorder Level</TableCell>
              <TableCell align="right">Par Level</TableCell>
              <TableCell align="right">Shortage</TableCell>
              <TableCell align="right">Suggested Qty</TableCell>
              <TableCell>Preferred Vendor</TableCell>
              <TableCell align="right">Est. Cost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suggestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  {isLoading
                    ? "Loading..."
                    : "No reorder suggestions - all stock levels are OK!"}
                </TableCell>
              </TableRow>
            ) : (
              suggestions.map((suggestion) => {
                const config = urgencyConfig[suggestion.urgency];
                const stockPercent =
                  suggestion.total_reorder_level > 0
                    ? (suggestion.current_total_stock /
                        suggestion.total_reorder_level) *
                      100
                    : 0;

                return (
                  <TableRow
                    key={suggestion.item_id}
                    hover
                    selected={selectedItems.includes(suggestion.item_id)}
                    sx={{
                      bgcolor:
                        suggestion.urgency === "critical"
                          ? "rgba(244, 67, 54, 0.08)"
                          : suggestion.urgency === "high"
                          ? "rgba(255, 152, 0, 0.08)"
                          : "inherit",
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedItems.includes(suggestion.item_id)}
                        onChange={() => handleSelectItem(suggestion.item_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={config.icon || undefined}
                        label={config.label}
                        color={config.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {suggestion.item_code}
                      </Typography>
                    </TableCell>
                    <TableCell>{suggestion.item_name}</TableCell>
                    <TableCell>{suggestion.category_name || "-"}</TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Typography
                          color={
                            stockPercent < 25
                              ? "error"
                              : stockPercent < 50
                              ? "warning.main"
                              : "inherit"
                          }
                        >
                          {suggestion.current_total_stock}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {suggestion.total_reorder_level}
                    </TableCell>
                    <TableCell align="right">
                      {suggestion.total_par_level}
                    </TableCell>
                    <TableCell align="right">
                      <Typography color="error.main" fontWeight="medium">
                        {suggestion.shortage}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium" color="primary">
                        {suggestion.suggested_order_qty}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {suggestion.preferred_vendor_name || "-"}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(suggestion.estimated_cost)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create PO Dialog */}
      <Dialog
        open={createPODialog}
        onClose={() => setCreatePODialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Create a purchase order for {selectedItems.length} selected items.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Estimated total: {formatCurrency(selectedEstimatedCost)}
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Vendor</InputLabel>
            <Select
              value={selectedVendorForPO}
              label="Select Vendor"
              onChange={(e) => setSelectedVendorForPO(e.target.value)}
            >
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ mt: 2 }}>
            A new purchase order will be created with the suggested quantities.
            You can edit it before marking as ordered.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePODialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmCreatePO}
            disabled={!selectedVendorForPO || createPOMutation.isPending}
          >
            {createPOMutation.isPending ? "Creating..." : "Create PO"}
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

export default ReorderSuggestionsPage;
