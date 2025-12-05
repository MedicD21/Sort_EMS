import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { categoriesApi, Category } from "../services/apiService";

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    color: "#2196F3",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.list();
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        id: category.id,
        name: category.name,
        description: category.description || "",
        color: category.color || "#2196F3",
        sort_order: category.sort_order,
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        id: "",
        name: "",
        description: "",
        color: "#2196F3",
        sort_order: categories.length + 1,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSave = async () => {
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, {
          name: formData.name,
          description: formData.description || undefined,
          color: formData.color,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        });
      } else {
        await categoriesApi.create({
          id: formData.id.toUpperCase().replace(/\s+/g, "_"),
          name: formData.name,
          description: formData.description || undefined,
          color: formData.color,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        });
      }
      handleCloseDialog();
      loadCategories();
    } catch (error: any) {
      console.error("Failed to save category:", error);
      alert(error.response?.data?.detail || "Failed to save category");
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await categoriesApi.delete(categoryId);
        loadCategories();
      } catch (error: any) {
        console.error("Failed to delete category:", error);
        alert(error.response?.data?.detail || "Failed to delete category");
      }
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4">Category Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Category
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#2a2a2a" }}>
              <TableCell>
                <strong>Color</strong>
              </TableCell>
              <TableCell>
                <strong>ID</strong>
              </TableCell>
              <TableCell>
                <strong>Name</strong>
              </TableCell>
              <TableCell>
                <strong>Description</strong>
              </TableCell>
              <TableCell>
                <strong>Sort Order</strong>
              </TableCell>
              <TableCell>
                <strong>Status</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow
                key={category.id}
                hover
                sx={{
                  "&:nth-of-type(odd)": { backgroundColor: "#2a2a2a" },
                  "&:nth-of-type(even)": { backgroundColor: "#1e1e1e" },
                }}
              >
                <TableCell>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: category.color || "#757575",
                      borderRadius: 1,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {category.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {category.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {category.description || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{category.sort_order}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={category.is_active ? "Active" : "Inactive"}
                    color={category.is_active ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(category)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(category.id)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No categories found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCategory ? "Edit Category" : "Add New Category"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Category ID"
                value={formData.id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    id: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                  })
                }
                disabled={!!editingCategory}
                helperText="Uppercase letters, numbers, and underscores only (e.g., TRAUMA, IV_FLUIDS)"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Color"
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Sort Order"
                type="number"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sort_order: parseInt(e.target.value) || 0,
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formData.id || !formData.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
