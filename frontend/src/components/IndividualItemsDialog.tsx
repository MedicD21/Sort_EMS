/**
 * Individual Items Dialog Component
 * Shows all individual items (with RFID tags and expiration dates) for a specific item at a location
 */
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  IconButton,
  TextField,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { inventoryItemsApi } from "../services/inventoryItemsService";
import { InventoryItemListResponse } from "../types";

interface IndividualItemsDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  locationId: string;
  locationName: string;
  onUpdate?: () => void;
}

export const IndividualItemsDialog: React.FC<IndividualItemsDialogProps> = ({
  open,
  onClose,
  itemId,
  itemName,
  locationId,
  locationName,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InventoryItemListResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  // Single item add form
  const [newItem, setNewItem] = useState({
    rfid_tag: "",
    expiration_date: "",
    lot_number: "",
  });

  // Bulk add form
  const [bulkAdd, setBulkAdd] = useState({
    quantity: 5,
    expiration_date: "",
    lot_number: "",
    rfid_tag_prefix: "",
  });

  const loadIndividualItems = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await inventoryItemsApi.getIndividualItems(
        itemId,
        locationId
      );
      setData(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load individual items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadIndividualItems();
      setShowAddForm(false);
      setShowBulkAdd(false);
    }
  }, [open, itemId, locationId]);

  const handleDelete = async (individualItemId: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await inventoryItemsApi.deleteIndividualItem(individualItemId);
      loadIndividualItems();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete item");
    }
  };

  const handleAddSingle = async () => {
    if (!newItem.rfid_tag) {
      setError("RFID tag is required");
      return;
    }

    try {
      await inventoryItemsApi.createIndividualItem({
        item_id: itemId,
        location_id: locationId,
        rfid_tag: newItem.rfid_tag,
        expiration_date: newItem.expiration_date || undefined,
        lot_number: newItem.lot_number || undefined,
      });

      setNewItem({ rfid_tag: "", expiration_date: "", lot_number: "" });
      setShowAddForm(false);
      loadIndividualItems();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add item");
    }
  };

  const handleBulkAdd = async () => {
    if (bulkAdd.quantity < 1 || bulkAdd.quantity > 1000) {
      setError("Quantity must be between 1 and 1000");
      return;
    }

    try {
      await inventoryItemsApi.createBulkItems({
        item_id: itemId,
        location_id: locationId,
        quantity: bulkAdd.quantity,
        expiration_date: bulkAdd.expiration_date || undefined,
        lot_number: bulkAdd.lot_number || undefined,
        rfid_tag_prefix: bulkAdd.rfid_tag_prefix || undefined,
      });

      setBulkAdd({
        quantity: 5,
        expiration_date: "",
        lot_number: "",
        rfid_tag_prefix: "",
      });
      setShowBulkAdd(false);
      loadIndividualItems();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add items");
    }
  };

  const getExpirationColor = (expirationDate?: string) => {
    if (!expirationDate) return "default";

    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) return "error";
    if (daysUntilExpiration <= 30) return "warning";
    return "success";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="h6">{itemName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {locationName}
            </Typography>
          </div>
          {data && (
            <Box display="flex" gap={2}>
              <Chip label={`Total: ${data.total_count}`} color="primary" />
              {data.expiring_soon_count > 0 && (
                <Chip
                  label={`Expiring Soon: ${data.expiring_soon_count}`}
                  color="warning"
                />
              )}
            </Box>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!showAddForm && !showBulkAdd && (
          <Box display="flex" gap={1} mb={2}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowAddForm(true)}
              size="small"
            >
              Add Single Item
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setShowBulkAdd(true)}
              size="small"
            >
              Add Multiple (Bag/Box)
            </Button>
          </Box>
        )}

        {showAddForm && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: "#2a2a2a" }}>
            <Typography variant="subtitle2" gutterBottom>
              Add Single Item
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="RFID Tag"
                value={newItem.rfid_tag}
                onChange={(e) =>
                  setNewItem({ ...newItem, rfid_tag: e.target.value })
                }
                size="small"
                required
                fullWidth
              />
              <TextField
                label="Expiration Date"
                type="date"
                value={newItem.expiration_date}
                onChange={(e) =>
                  setNewItem({ ...newItem, expiration_date: e.target.value })
                }
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Lot Number"
                value={newItem.lot_number}
                onChange={(e) =>
                  setNewItem({ ...newItem, lot_number: e.target.value })
                }
                size="small"
                fullWidth
              />
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  onClick={handleAddSingle}
                  size="small"
                >
                  Add Item
                </Button>
                <Button onClick={() => setShowAddForm(false)} size="small">
                  Cancel
                </Button>
              </Box>
            </Stack>
          </Paper>
        )}

        {showBulkAdd && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: "#2a2a2a" }}>
            <Typography variant="subtitle2" gutterBottom>
              Add Multiple Items (e.g., Bag of 5)
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Quantity"
                type="number"
                value={bulkAdd.quantity}
                onChange={(e) =>
                  setBulkAdd({ ...bulkAdd, quantity: parseInt(e.target.value) })
                }
                size="small"
                inputProps={{ min: 1, max: 1000 }}
                fullWidth
              />
              <TextField
                label="Expiration Date (for all items)"
                type="date"
                value={bulkAdd.expiration_date}
                onChange={(e) =>
                  setBulkAdd({ ...bulkAdd, expiration_date: e.target.value })
                }
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Lot Number"
                value={bulkAdd.lot_number}
                onChange={(e) =>
                  setBulkAdd({ ...bulkAdd, lot_number: e.target.value })
                }
                size="small"
                fullWidth
              />
              <TextField
                label="RFID Tag Prefix (optional)"
                value={bulkAdd.rfid_tag_prefix}
                onChange={(e) =>
                  setBulkAdd({ ...bulkAdd, rfid_tag_prefix: e.target.value })
                }
                size="small"
                helperText="If provided, generates tags like PREFIX-001, PREFIX-002, etc."
                fullWidth
              />
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  onClick={handleBulkAdd}
                  size="small"
                >
                  Add {bulkAdd.quantity} Items
                </Button>
                <Button onClick={() => setShowBulkAdd(false)} size="small">
                  Cancel
                </Button>
              </Box>
            </Stack>
          </Paper>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>RFID Tag</TableCell>
                  <TableCell>Expiration Date</TableCell>
                  <TableCell>Lot Number</TableCell>
                  <TableCell>Received Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((item) => (
                  <TableRow
                    key={item.id}
                    sx={{
                      "&:nth-of-type(odd)": {
                        backgroundColor: "#2a2a2a",
                      },
                      "&:nth-of-type(even)": {
                        backgroundColor: "#1e1e1e",
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {item.rfid_tag}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {item.expiration_date ? (
                        <Chip
                          label={formatDate(item.expiration_date)}
                          color={getExpirationColor(item.expiration_date)}
                          size="small"
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{item.lot_number || "—"}</TableCell>
                    <TableCell>{formatDate(item.received_date)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(item.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" py={4}>
                        No individual items found. Click "Add Single Item" or
                        "Add Multiple" to add items.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
