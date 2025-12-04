/**
 * Inventory Page
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
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import apiClient from "../services/api";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category_name: string | null;
  location_name: string | null;
  current_stock: number;
  par_level: number | null;
  unit_of_measure: string;
  unit_cost: number | null;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/api/v1/items/", {
        params: {
          limit: 500,
        },
      });
      setItems(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load inventory");
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search) ||
      item.sku?.toLowerCase().includes(search) ||
      item.category_name?.toLowerCase().includes(search)
    );
  });

  const getStockStatus = (current: number, par: number | null) => {
    if (!par) return null;
    const percentage = (current / par) * 100;
    if (percentage === 0) return { label: "Out", color: "error" as const };
    if (percentage < 25) return { label: "Critical", color: "error" as const };
    if (percentage < 50) return { label: "Low", color: "warning" as const };
    if (percentage < 100) return { label: "OK", color: "info" as const };
    return { label: "Good", color: "success" as const };
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Inventory Management
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        View and manage your inventory across all locations.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search items by name, description, SKU, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {filteredItems.length} of {items.length} items
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Item Name</strong>
                    </TableCell>
                    <TableCell>
                      <strong>SKU</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Category</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Location</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Stock</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Par Level</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Status</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Unit Cost</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => {
                    const status = getStockStatus(
                      item.current_stock,
                      item.par_level
                    );
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.name}
                          </Typography>
                          {item.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.sku || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.category_name || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.location_name || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.current_stock} {item.unit_of_measure}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.par_level || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {status && (
                            <Chip
                              label={status.label}
                              color={status.color}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.unit_cost
                              ? `$${item.unit_cost.toFixed(2)}`
                              : "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No items found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>
    </Box>
  );
}
