import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
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
  MenuItem,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  itemsApi,
  categoriesApi,
  Category,
  csvImportApi,
  CSVImportPreviewResponse,
  CSVImportConflict,
} from "../services/apiService";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ItemManagementPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] =
    useState<CSVImportPreviewResponse | null>(null);
  const [importCacheKey, setImportCacheKey] = useState<string>("");
  const [conflictResolution, setConflictResolution] = useState<
    "skip" | "replace"
  >("skip");
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(
    new Set()
  );
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    category_id: "",
    supplier_name: "",
    supplier_contact: "",
    supplier_email: "",
    is_active: "",
  });
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    item_code: "",
    description: "",
    category_id: "",
    unit_of_measure: "EA",

    // Product Details
    manufacturer: "",
    manufacturer_part_number: "",
    cost_per_unit: "",
    barcode: "",

    // Supplier Information
    supplier_name: "",
    supplier_contact: "",
    supplier_email: "",
    supplier_phone: "",
    supplier_website: "",
    supplier_account_number: "",

    // Ordering Information
    minimum_order_quantity: "",
    order_unit: "",
    lead_time_days: "",
    preferred_vendor: "",
    alternate_vendor: "",

    // Flags
    is_controlled_substance: false,
    requires_prescription: false,
    requires_expiration_tracking: false,
    is_active: true,
  });

  useEffect(() => {
    loadItems();
    loadCategories();
  }, []);

  const loadItems = async () => {
    try {
      const response = await itemsApi.list({ limit: 500 });
      setItems(response.data);
    } catch (error) {
      console.error("Failed to load items:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.list({ active_only: true });
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || "",
        item_code: item.sku || "",
        description: item.description || "",
        category_id: item.category_id || "",
        unit_of_measure: item.unit_of_measure || "EA",
        manufacturer: item.manufacturer || "",
        manufacturer_part_number: item.manufacturer_part_number || "",
        cost_per_unit: item.unit_cost?.toString() || "",
        barcode: item.barcode || "",
        supplier_name: item.supplier_name || "",
        supplier_contact: item.supplier_contact || "",
        supplier_email: item.supplier_email || "",
        supplier_phone: item.supplier_phone || "",
        supplier_website: item.supplier_website || "",
        supplier_account_number: item.supplier_account_number || "",
        minimum_order_quantity: item.minimum_order_quantity?.toString() || "",
        order_unit: item.order_unit || "",
        lead_time_days: item.lead_time_days?.toString() || "",
        preferred_vendor: item.preferred_vendor || "",
        alternate_vendor: item.alternate_vendor || "",
        is_controlled_substance: item.is_controlled_substance || false,
        requires_prescription: item.requires_prescription || false,
        requires_expiration_tracking:
          item.requires_expiration_tracking || false,
        is_active: item.is_active ?? true,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        item_code: "",
        description: "",
        category_id: "",
        unit_of_measure: "EA",
        manufacturer: "",
        manufacturer_part_number: "",
        cost_per_unit: "",
        barcode: "",
        supplier_name: "",
        supplier_contact: "",
        supplier_email: "",
        supplier_phone: "",
        supplier_website: "",
        supplier_account_number: "",
        minimum_order_quantity: "",
        order_unit: "",
        lead_time_days: "",
        preferred_vendor: "",
        alternate_vendor: "",
        is_controlled_substance: false,
        requires_prescription: false,
        requires_expiration_tracking: false,
        is_active: true,
      });
    }
    setDialogOpen(true);
    setCurrentTab(0);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        name: formData.name,
        sku: formData.item_code,
        description: formData.description || undefined,
        category_id: formData.category_id || undefined,
        unit_of_measure: formData.unit_of_measure,
        unit_cost: formData.cost_per_unit
          ? parseFloat(formData.cost_per_unit)
          : undefined,
        barcode: formData.barcode || formData.item_code,
        manufacturer: formData.manufacturer || undefined,
        manufacturer_part_number:
          formData.manufacturer_part_number || undefined,
        is_controlled_substance: formData.is_controlled_substance,
        requires_prescription: formData.requires_prescription,
        requires_expiration_tracking: formData.requires_expiration_tracking,
        is_active: formData.is_active,
        // Extended fields
        supplier_name: formData.supplier_name || undefined,
        supplier_contact: formData.supplier_contact || undefined,
        supplier_email: formData.supplier_email || undefined,
        supplier_phone: formData.supplier_phone || undefined,
        supplier_website: formData.supplier_website || undefined,
        supplier_account_number: formData.supplier_account_number || undefined,
        minimum_order_quantity: formData.minimum_order_quantity
          ? parseInt(formData.minimum_order_quantity)
          : undefined,
        order_unit: formData.order_unit || undefined,
        lead_time_days: formData.lead_time_days
          ? parseInt(formData.lead_time_days)
          : undefined,
        preferred_vendor: formData.preferred_vendor || undefined,
        alternate_vendor: formData.alternate_vendor || undefined,
      };

      if (editingItem) {
        await itemsApi.update(editingItem.id, dataToSave);
      } else {
        await itemsApi.create(dataToSave);
      }

      handleCloseDialog();
      loadItems();
    } catch (error) {
      console.error("Failed to save item:", error);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await itemsApi.delete(itemId);
        loadItems();
      } catch (error) {
        console.error("Failed to delete item:", error);
      }
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Item Code",
      "Name",
      "Description",
      "Category ID",
      "Unit of Measure",
      "Unit Cost",
      "Barcode",
      "Manufacturer",
      "Manufacturer Part Number",
      "Supplier Name",
      "Supplier Contact",
      "Supplier Email",
      "Supplier Phone",
      "Supplier Website",
      "Supplier Account Number",
      "Minimum Order Quantity",
      "Order Unit",
      "Lead Time Days",
      "Preferred Vendor",
      "Alternate Vendor",
      "Controlled Substance",
      "Requires Prescription",
      "Requires Expiration Tracking",
      "Active",
    ];

    const csvRows = [
      headers.join(","),
      ...items.map((item) =>
        [
          item.id || "",
          `"${(item.sku || "").replace(/"/g, '""')}"`,
          `"${(item.name || "").replace(/"/g, '""')}"`,
          `"${(item.description || "").replace(/"/g, '""')}"`,
          item.category_id || "",
          item.unit_of_measure || "",
          item.unit_cost || "",
          item.barcode || "",
          `"${(item.manufacturer || "").replace(/"/g, '""')}"`,
          `"${(item.manufacturer_part_number || "").replace(/"/g, '""')}"`,
          `"${(item.supplier_name || "").replace(/"/g, '""')}"`,
          `"${(item.supplier_contact || "").replace(/"/g, '""')}"`,
          `"${(item.supplier_email || "").replace(/"/g, '""')}"`,
          `"${(item.supplier_phone || "").replace(/"/g, '""')}"`,
          `"${(item.supplier_website || "").replace(/"/g, '""')}"`,
          `"${(item.supplier_account_number || "").replace(/"/g, '""')}"`,
          item.minimum_order_quantity || "",
          `"${(item.order_unit || "").replace(/"/g, '""')}"`,
          item.lead_time_days || "",
          `"${(item.preferred_vendor || "").replace(/"/g, '""')}"`,
          `"${(item.alternate_vendor || "").replace(/"/g, '""')}"`,
          item.is_controlled_substance ? "TRUE" : "FALSE",
          item.requires_prescription ? "TRUE" : "FALSE",
          item.requires_expiration_tracking ? "TRUE" : "FALSE",
          item.is_active ? "TRUE" : "FALSE",
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `items_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import
  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target?.files?.[0];
    if (file) {
      setImportFile(file);
      try {
        const response = await csvImportApi.preview(file);
        setImportPreviewData(response.data);
        // Extract cache key from response headers or generate from timestamp
        const cacheKey = `${response.data.total_rows}_${Date.now()}`;
        setImportCacheKey(cacheKey);
        setConflictResolution("skip");
        setSelectedConflicts(new Set());
      } catch (error: any) {
        console.error("Failed to preview CSV:", error);
        alert(error.response?.data?.detail || "Failed to preview CSV file");
      }
    }
  };

  const handleImportCSV = async () => {
    if (!importFile || !importPreviewData) return;

    try {
      // Re-upload to get cache key
      const previewResponse = await csvImportApi.preview(importFile);
      const timestamp = Date.now();
      const userId = localStorage.getItem("userId") || "unknown";
      const cacheKey = `${userId}_${timestamp / 1000}`;

      // Determine which items to replace based on resolution strategy
      let itemCodesToReplace: string[] | undefined;
      if (conflictResolution === "skip" && selectedConflicts.size > 0) {
        itemCodesToReplace = Array.from(selectedConflicts);
      } else if (
        conflictResolution === "replace" &&
        selectedConflicts.size > 0
      ) {
        // If replace mode, exclude unselected items
        const allConflictCodes = new Set(
          previewResponse.data.conflicts.map((c) => c.item_code)
        );
        itemCodesToReplace = Array.from(allConflictCodes).filter(
          (code) => !selectedConflicts.has(code)
        );
      }

      const result = await csvImportApi.execute(cacheKey, {
        conflict_resolution: conflictResolution,
        item_codes_to_replace: itemCodesToReplace,
      });

      alert(
        `Import complete!\n` +
          `Created: ${result.data.created}\n` +
          `Updated: ${result.data.updated}\n` +
          `Skipped: ${result.data.skipped}\n` +
          `Errors: ${result.data.errors.length}`
      );

      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreviewData(null);
      setImportCacheKey("");
      loadItems();
    } catch (error: any) {
      console.error("Failed to import items:", error);
      alert(
        error.response?.data?.detail ||
          "Import failed. Check console for details."
      );
    }
  };

  const handleConflictToggle = (itemCode: string) => {
    const newSet = new Set(selectedConflicts);
    if (newSet.has(itemCode)) {
      newSet.delete(itemCode);
    } else {
      newSet.add(itemCode);
    }
    setSelectedConflicts(newSet);
  };

  const handleConflictSelectAll = () => {
    if (!importPreviewData) return;
    const allCodes = importPreviewData.conflicts.map((c) => c.item_code);
    setSelectedConflicts(new Set(allCodes));
  };

  const handleConflictDeselectAll = () => {
    setSelectedConflicts(new Set());
  };

  // Multi-select handlers
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkEdit = () => {
    setBulkEditDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedItems.size} items?`)) {
      try {
        for (const itemId of Array.from(selectedItems)) {
          await itemsApi.delete(itemId);
        }
        setSelectedItems(new Set());
        loadItems();
      } catch (error) {
        console.error("Failed to delete items:", error);
      }
    }
  };

  const handleApplyBulkEdit = async () => {
    try {
      const updates: any = {};
      if (bulkEditData.category_id)
        updates.category_id = bulkEditData.category_id;
      if (bulkEditData.supplier_name)
        updates.supplier_name = bulkEditData.supplier_name;
      if (bulkEditData.supplier_contact)
        updates.supplier_contact = bulkEditData.supplier_contact;
      if (bulkEditData.supplier_email)
        updates.supplier_email = bulkEditData.supplier_email;
      if (bulkEditData.is_active !== "")
        updates.is_active = bulkEditData.is_active === "true";

      for (const itemId of Array.from(selectedItems)) {
        await itemsApi.update(itemId, updates);
      }

      setBulkEditDialogOpen(false);
      setBulkEditData({
        category_id: "",
        supplier_name: "",
        supplier_contact: "",
        supplier_email: "",
        is_active: "",
      });
      setSelectedItems(new Set());
      loadItems();
    } catch (error) {
      console.error("Failed to apply bulk edit:", error);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Typography variant="h4">Item Management</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add New Item
          </Button>
        </Box>
      </Box>

      {selectedItems.size > 0 && (
        <Card sx={{ mb: 2, bgcolor: "primary.dark" }}>
          <CardContent sx={{ py: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body1">
                {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""}{" "}
                selected
              </Typography>
              <Button variant="contained" size="small" onClick={handleBulkEdit}>
                Bulk Edit
              </Button>
              <Button
                variant="contained"
                size="small"
                color="error"
                onClick={handleBulkDelete}
              >
                Delete Selected
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => setSelectedItems(new Set())}
              >
                Clear Selection
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search items by name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
              ),
            }}
          />
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#2a2a2a" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={
                    selectedItems.size === filteredItems.length &&
                    filteredItems.length > 0
                  }
                  indeterminate={
                    selectedItems.size > 0 &&
                    selectedItems.size < filteredItems.length
                  }
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>
                <strong>Item Code</strong>
              </TableCell>
              <TableCell>
                <strong>Name</strong>
              </TableCell>
              <TableCell>
                <strong>Description</strong>
              </TableCell>
              <TableCell>
                <strong>Manufacturer</strong>
              </TableCell>
              <TableCell>
                <strong>Unit Cost</strong>
              </TableCell>
              <TableCell>
                <strong>UOM</strong>
              </TableCell>
              <TableCell>
                <strong>Supplier</strong>
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
            {filteredItems.map((item) => (
              <TableRow
                key={item.id}
                hover
                sx={{
                  "&:nth-of-type(odd)": { backgroundColor: "#2a2a2a" },
                  "&:nth-of-type(even)": { backgroundColor: "#1e1e1e" },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {item.sku || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {item.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ maxWidth: 300 }}
                  >
                    {item.description || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {item.manufacturer || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {item.unit_cost ? `$${item.unit_cost.toFixed(2)}` : "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {item.unit_of_measure}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {item.supplier_name || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {item.is_active ? (
                      <Chip label="Active" color="success" size="small" />
                    ) : (
                      <Chip label="Inactive" color="default" size="small" />
                    )}
                    {item.is_controlled_substance && (
                      <Chip label="Controlled" color="error" size="small" />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(item)}
                    color="primary"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(item.id)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No items found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#1e1e1e",
          },
        }}
      >
        <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
        <DialogContent>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
          >
            <Tab label="Basic Info" />
            <Tab label="Product Details" />
            <Tab label="Supplier Info" />
            <Tab label="Ordering" />
          </Tabs>

          {/* Tab 0: Basic Info */}
          <TabPanel value={currentTab} index={0}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Item Name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Item Code/SKU"
                  required
                  value={formData.item_code}
                  onChange={(e) =>
                    setFormData({ ...formData, item_code: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            backgroundColor: category.color || "#757575",
                            borderRadius: "50%",
                          }}
                        />
                        {category.name}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Unit of Measure"
                  select
                  value={formData.unit_of_measure}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit_of_measure: e.target.value,
                    })
                  }
                >
                  <MenuItem value="EA">Each (EA)</MenuItem>
                  <MenuItem value="Box">Box</MenuItem>
                  <MenuItem value="Case">Case</MenuItem>
                  <MenuItem value="Roll">Roll</MenuItem>
                  <MenuItem value="Pack">Pack</MenuItem>
                  <MenuItem value="Bottle">Bottle</MenuItem>
                  <MenuItem value="Vial">Vial</MenuItem>
                  <MenuItem value="Bag">Bag</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Barcode"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Active"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_controlled_substance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_controlled_substance: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Controlled Substance"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.requires_prescription}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requires_prescription: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Requires Prescription"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.requires_expiration_tracking}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requires_expiration_tracking: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Requires Expiration Tracking"
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 1: Product Details */}
          <TabPanel value={currentTab} index={1}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) =>
                    setFormData({ ...formData, manufacturer: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Manufacturer Part Number"
                  value={formData.manufacturer_part_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      manufacturer_part_number: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cost Per Unit"
                  type="text"
                  inputMode="decimal"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  value={formData.cost_per_unit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    setFormData({ ...formData, cost_per_unit: val });
                  }}
                  inputProps={{ pattern: "[0-9.]*" }}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 2: Supplier Info */}
          <TabPanel value={currentTab} index={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Supplier Name"
                  value={formData.supplier_name}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Person"
                  value={formData.supplier_contact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplier_contact: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.supplier_email}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_email: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.supplier_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_phone: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={formData.supplier_website}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplier_website: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Account Number"
                  value={formData.supplier_account_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplier_account_number: e.target.value,
                    })
                  }
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 3: Ordering */}
          <TabPanel value={currentTab} index={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum Order Quantity"
                  type="text"
                  inputMode="numeric"
                  value={formData.minimum_order_quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({
                      ...formData,
                      minimum_order_quantity: val,
                    });
                  }}
                  inputProps={{ pattern: "[0-9]*" }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Order Unit"
                  placeholder="e.g., Case of 12"
                  value={formData.order_unit}
                  onChange={(e) =>
                    setFormData({ ...formData, order_unit: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Lead Time (Days)"
                  type="text"
                  inputMode="numeric"
                  value={formData.lead_time_days}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, lead_time_days: val });
                  }}
                  inputProps={{ pattern: "[0-9]*" }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Preferred Vendor"
                  value={formData.preferred_vendor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferred_vendor: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Alternate Vendor"
                  value={formData.alternate_vendor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      alternate_vendor: e.target.value,
                    })
                  }
                />
              </Grid>
            </Grid>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formData.name || !formData.item_code}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Items from CSV</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <input
              accept=".csv"
              style={{ display: "none" }}
              id="csv-upload"
              type="file"
              onChange={handleImportFileChange}
            />
            <label htmlFor="csv-upload">
              <Button variant="outlined" component="span" fullWidth>
                {importFile ? importFile.name : "Choose CSV File"}
              </Button>
            </label>
          </Box>

          {importPreviewData && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Import Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Total rows: {importPreviewData.total_rows} | New items:{" "}
                {importPreviewData.new_items} | Conflicts:{" "}
                {importPreviewData.conflicts.length} | Errors:{" "}
                {importPreviewData.errors.length}
              </Typography>

              {importPreviewData.errors.length > 0 && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: "#ffebee" }}>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Validation Errors
                  </Typography>
                  {importPreviewData.errors.slice(0, 5).map((err, idx) => (
                    <Typography key={idx} variant="caption" display="block">
                      Row {err.row}: {err.field && `${err.field} - `}
                      {err.error}
                    </Typography>
                  ))}
                  {importPreviewData.errors.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      ...and {importPreviewData.errors.length - 5} more errors
                    </Typography>
                  )}
                </Paper>
              )}

              {importPreviewData.conflicts.length > 0 && (
                <>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Conflicts Detected ({importPreviewData.conflicts.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    The following item codes already exist. Choose how to handle
                    them:
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <TextField
                      select
                      fullWidth
                      label="Conflict Resolution"
                      value={conflictResolution}
                      onChange={(e) =>
                        setConflictResolution(
                          e.target.value as "skip" | "replace"
                        )
                      }
                      size="small"
                    >
                      <MenuItem value="skip">
                        Skip conflicting items (keep existing)
                      </MenuItem>
                      <MenuItem value="replace">
                        Replace conflicting items (update existing)
                      </MenuItem>
                    </TextField>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Button size="small" onClick={handleConflictSelectAll}>
                      Select All
                    </Button>
                    <Button size="small" onClick={handleConflictDeselectAll}>
                      Deselect All
                    </Button>
                  </Box>

                  <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            {conflictResolution === "skip"
                              ? "Replace?"
                              : "Skip?"}
                          </TableCell>
                          <TableCell>Item Code</TableCell>
                          <TableCell>Existing Item</TableCell>
                          <TableCell>New Item</TableCell>
                          <TableCell>Row</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {importPreviewData.conflicts.map((conflict) => (
                          <TableRow key={conflict.item_code}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedConflicts.has(
                                  conflict.item_code
                                )}
                                onChange={() =>
                                  handleConflictToggle(conflict.item_code)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <strong>{conflict.item_code}</strong>
                            </TableCell>
                            <TableCell>{conflict.existing_item_name}</TableCell>
                            <TableCell>{conflict.new_item_name}</TableCell>
                            <TableCell>{conflict.row_number}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImportDialogOpen(false);
              setImportFile(null);
              setImportPreviewData(null);
              setImportCacheKey("");
              setSelectedConflicts(new Set());
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImportCSV}
            variant="contained"
            disabled={!importPreviewData || importPreviewData.errors.length > 0}
          >
            Import{" "}
            {importPreviewData
              ? importPreviewData.new_items +
                (conflictResolution === "replace"
                  ? importPreviewData.conflicts.length
                  : 0)
              : 0}{" "}
            Items
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog
        open={bulkEditDialogOpen}
        onClose={() => setBulkEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Bulk Edit {selectedItems.size} Items</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Only filled fields will be updated across all selected items.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Category"
                value={bulkEditData.category_id}
                onChange={(e) =>
                  setBulkEditData({
                    ...bulkEditData,
                    category_id: e.target.value,
                  })
                }
              >
                <MenuItem value="">
                  <em>Leave Unchanged</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          backgroundColor: category.color || "#757575",
                          borderRadius: "50%",
                        }}
                      />
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Supplier Name"
                value={bulkEditData.supplier_name}
                onChange={(e) =>
                  setBulkEditData({
                    ...bulkEditData,
                    supplier_name: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Supplier Contact"
                value={bulkEditData.supplier_contact}
                onChange={(e) =>
                  setBulkEditData({
                    ...bulkEditData,
                    supplier_contact: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Supplier Email"
                type="email"
                value={bulkEditData.supplier_email}
                onChange={(e) =>
                  setBulkEditData({
                    ...bulkEditData,
                    supplier_email: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Active Status"
                value={bulkEditData.is_active}
                onChange={(e) =>
                  setBulkEditData({
                    ...bulkEditData,
                    is_active: e.target.value,
                  })
                }
              >
                <MenuItem value="">Leave Unchanged</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleApplyBulkEdit} variant="contained">
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
