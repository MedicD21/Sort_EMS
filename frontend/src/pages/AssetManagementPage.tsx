/**
 * Asset Management Page
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  PersonAdd as AssignIcon,
  PersonOff as UnassignIcon,
} from "@mui/icons-material";
import {
  assetsApi,
  Asset,
  employeesApi,
  Employee,
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
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AssetManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Asset dialog state
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState({
    asset_tag: "",
    name: "",
    description: "",
    category: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_price: "",
    warranty_expiration: "",
    condition: "Good",
    location: "",
    status: "Available",
    notes: "",
    employee_id: "",
  });

  // Employee dialog state
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    hire_date: "",
  });

  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningAsset, setAssigningAsset] = useState<Asset | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assetsApi.list({ limit: 500 });
      setAssets(response.data);
    } catch (err: any) {
      console.error("Error fetching assets:", err);
      setError(err.response?.data?.detail || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesApi.list({ limit: 500, is_active: true });
      setEmployees(response.data);
    } catch (err: any) {
      console.error("Error fetching employees:", err);
    }
  };

  const handleAddAsset = () => {
    setEditingAsset(null);
    setAssetForm({
      asset_tag: "",
      name: "",
      description: "",
      category: "",
      manufacturer: "",
      model: "",
      serial_number: "",
      purchase_date: "",
      purchase_price: "",
      warranty_expiration: "",
      condition: "Good",
      location: "",
      status: "Available",
      notes: "",
      employee_id: "",
    });
    setAssetDialogOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetForm({
      asset_tag: asset.asset_tag,
      name: asset.name,
      description: asset.description || "",
      category: asset.category,
      manufacturer: asset.manufacturer || "",
      model: asset.model || "",
      serial_number: asset.serial_number || "",
      purchase_date: asset.purchase_date?.split("T")[0] || "",
      purchase_price: asset.purchase_price?.toString() || "",
      warranty_expiration: asset.warranty_expiration?.split("T")[0] || "",
      condition: asset.condition,
      location: asset.location || "",
      status: asset.status,
      notes: asset.notes || "",
      employee_id: asset.employee_id || "",
    });
    setAssetDialogOpen(true);
  };

  const handleSaveAsset = async () => {
    try {
      const data: any = {
        asset_tag: assetForm.asset_tag,
        name: assetForm.name,
        description: assetForm.description || undefined,
        category: assetForm.category,
        manufacturer: assetForm.manufacturer || undefined,
        model: assetForm.model || undefined,
        serial_number: assetForm.serial_number || undefined,
        purchase_date: assetForm.purchase_date || undefined,
        purchase_price: assetForm.purchase_price
          ? parseFloat(assetForm.purchase_price)
          : undefined,
        warranty_expiration: assetForm.warranty_expiration || undefined,
        condition: assetForm.condition,
        location: assetForm.location || undefined,
        status: assetForm.status,
        notes: assetForm.notes || undefined,
        employee_id: assetForm.employee_id || undefined,
      };

      if (editingAsset) {
        await assetsApi.update(editingAsset.id, data);
      } else {
        await assetsApi.create(data);
      }

      setAssetDialogOpen(false);
      fetchAssets();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save asset");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      await assetsApi.delete(id);
      fetchAssets();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete asset");
    }
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      employee_id: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      hire_date: "",
    });
    setEmployeeDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      employee_id: employee.employee_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      position: employee.position || "",
      hire_date: employee.hire_date?.split("T")[0] || "",
    });
    setEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = async () => {
    try {
      const data: any = {
        employee_id: employeeForm.employee_id,
        first_name: employeeForm.first_name,
        last_name: employeeForm.last_name,
        email: employeeForm.email || undefined,
        phone: employeeForm.phone || undefined,
        department: employeeForm.department || undefined,
        position: employeeForm.position || undefined,
        hire_date: employeeForm.hire_date || undefined,
      };

      if (editingEmployee) {
        await employeesApi.update(editingEmployee.id, data);
      } else {
        await employeesApi.create(data);
      }

      setEmployeeDialogOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save employee");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) return;

    try {
      await employeesApi.delete(id);
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete employee");
    }
  };

  const handleAssignAsset = (asset: Asset) => {
    setAssigningAsset(asset);
    setSelectedEmployeeId(asset.employee_id || "");
    setAssignDialogOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!assigningAsset) return;

    try {
      if (selectedEmployeeId) {
        await assetsApi.assignToEmployee(assigningAsset.id, selectedEmployeeId);
      } else {
        await assetsApi.unassign(assigningAsset.id);
      }
      setAssignDialogOpen(false);
      fetchAssets();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to assign asset");
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || asset.status === statusFilter;

    const matchesCategory =
      categoryFilter === "all" || asset.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = Array.from(new Set(assets.map((a) => a.category)));

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Good":
        return "success";
      case "Fair":
        return "info";
      case "Poor":
        return "warning";
      case "Needs Repair":
        return "error";
      case "Out of Service":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "success";
      case "Assigned":
        return "info";
      case "In Use":
        return "primary";
      case "In Maintenance":
        return "warning";
      case "Disposed":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          Asset Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAssets}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Assets" />
          <Tab label="Employees" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search assets..."
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
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="Available">Available</MenuItem>
                    <MenuItem value="Assigned">Assigned</MenuItem>
                    <MenuItem value="In Use">In Use</MenuItem>
                    <MenuItem value="In Maintenance">In Maintenance</MenuItem>
                    <MenuItem value="Disposed">Disposed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddAsset}
              >
                Add Asset
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Asset Tag</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Name</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Category</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Serial Number</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Assigned To</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Status</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Condition</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Actions</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {asset.asset_tag}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{asset.name}</Typography>
                          {asset.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {asset.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{asset.category}</TableCell>
                        <TableCell>{asset.serial_number || "—"}</TableCell>
                        <TableCell>
                          {asset.employee_name ? (
                            <Typography variant="body2">
                              {asset.employee_name}
                            </Typography>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={asset.status}
                            color={getStatusColor(asset.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={asset.condition}
                            color={getConditionColor(asset.condition) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleAssignAsset(asset)}
                            title="Assign/Unassign"
                          >
                            {asset.employee_id ? (
                              <UnassignIcon />
                            ) : (
                              <AssignIcon />
                            )}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEditAsset(asset)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAsset(asset.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddEmployee}
              >
                Add Employee
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Employee ID</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Name</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Email</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Department</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Position</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>{employee.employee_id}</TableCell>
                      <TableCell>
                        {employee.first_name} {employee.last_name}
                      </TableCell>
                      <TableCell>{employee.email || "—"}</TableCell>
                      <TableCell>{employee.department || "—"}</TableCell>
                      <TableCell>{employee.position || "—"}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEditEmployee(employee)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteEmployee(employee.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
      </Paper>

      {/* Asset Dialog */}
      <Dialog
        open={assetDialogOpen}
        onClose={() => setAssetDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAsset ? "Edit Asset" : "Add New Asset"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Asset Tag"
                value={assetForm.asset_tag}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, asset_tag: e.target.value })
                }
                helperText="Unique identifier"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Name"
                value={assetForm.name}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={assetForm.description}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, description: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={assetForm.category}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, category: e.target.value })
                  }
                  label="Category"
                >
                  <MenuItem value="Electronics">Electronics</MenuItem>
                  <MenuItem value="Furniture">Furniture</MenuItem>
                  <MenuItem value="Medical Equipment">
                    Medical Equipment
                  </MenuItem>
                  <MenuItem value="Vehicle">Vehicle</MenuItem>
                  <MenuItem value="Tools">Tools</MenuItem>
                  <MenuItem value="Computer">Computer</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Manufacturer"
                value={assetForm.manufacturer}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, manufacturer: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Model"
                value={assetForm.model}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, model: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Serial Number"
                value={assetForm.serial_number}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, serial_number: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Purchase Date"
                value={assetForm.purchase_date}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, purchase_date: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Purchase Price"
                value={assetForm.purchase_price}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, purchase_price: e.target.value })
                }
                inputProps={{ step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Warranty Expiration"
                value={assetForm.warranty_expiration}
                onChange={(e) =>
                  setAssetForm({
                    ...assetForm,
                    warranty_expiration: e.target.value,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Condition</InputLabel>
                <Select
                  value={assetForm.condition}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, condition: e.target.value })
                  }
                  label="Condition"
                >
                  <MenuItem value="Good">Good</MenuItem>
                  <MenuItem value="Fair">Fair</MenuItem>
                  <MenuItem value="Poor">Poor</MenuItem>
                  <MenuItem value="Needs Repair">Needs Repair</MenuItem>
                  <MenuItem value="Out of Service">Out of Service</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                value={assetForm.location}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, location: e.target.value })
                }
                helperText="Physical location of asset"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={assetForm.status}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, status: e.target.value })
                  }
                  label="Status"
                >
                  <MenuItem value="Available">Available</MenuItem>
                  <MenuItem value="Assigned">Assigned</MenuItem>
                  <MenuItem value="In Use">In Use</MenuItem>
                  <MenuItem value="In Maintenance">In Maintenance</MenuItem>
                  <MenuItem value="Disposed">Disposed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={assetForm.notes}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, notes: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveAsset} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog
        open={employeeDialogOpen}
        onClose={() => setEmployeeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingEmployee ? "Edit Employee" : "Add New Employee"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Employee ID"
                value={employeeForm.employee_id}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    employee_id: e.target.value,
                  })
                }
                helperText="Badge or employee number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="First Name"
                value={employeeForm.first_name}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    first_name: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Last Name"
                value={employeeForm.last_name}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    last_name: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={employeeForm.email}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, email: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={employeeForm.phone}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, phone: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                value={employeeForm.department}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    department: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Position"
                value={employeeForm.position}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, position: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Hire Date"
                value={employeeForm.hire_date}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    hire_date: e.target.value,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEmployee} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Assign Asset</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Asset: {assigningAsset?.name} ({assigningAsset?.asset_tag})
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Employee</InputLabel>
              <Select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                label="Employee"
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveAssignment} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
