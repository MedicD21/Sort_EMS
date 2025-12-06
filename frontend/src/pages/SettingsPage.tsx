/**
 * Settings Page
 */
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Alert,
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
  Chip,
  CircularProgress,
} from "@mui/material";
import { Edit, Delete, Add, Save } from "@mui/icons-material";
import {
  usersApi,
  User,
  authApi,
  configApi,
  SystemConfig,
  AutoOrderConfig,
  StationRequestConfig,
  StockAlertConfig,
  TransferRestrictionsConfig,
} from "../services/apiService";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // System config state
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // New user dialog
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    is_active: true,
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
    fetchSystemConfig();
  }, []);

  const fetchSystemConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await configApi.get();
      setSystemConfig(response.data);
    } catch (err: any) {
      console.error("Error fetching system config:", err);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await usersApi.me.profile();
      setCurrentUser(response.data);
      setProfileForm({
        full_name: response.data.full_name || "",
        email: response.data.email || "",
      });
    } catch (err: any) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.list();
      setUsers(response.data);
    } catch (err: any) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setError(null);
      setSuccess(null);
      await usersApi.updateProfile(profileForm);
      setSuccess("Profile updated successfully");
      fetchCurrentUser();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update profile");
      console.error("Error updating profile:", err);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await usersApi.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setSuccess("Password changed successfully");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to change password");
      console.error("Error changing password:", err);
    }
  };

  const handleCreateUser = async () => {
    try {
      setError(null);
      await usersApi.create(newUser);
      setSuccess("User created successfully");
      setOpenUserDialog(false);
      setNewUser({
        username: "",
        email: "",
        password: "",
        full_name: "",
        is_active: true,
      });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create user");
      console.error("Error creating user:", err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      setError(null);
      await usersApi.delete(userId.toString());
      setSuccess("User deleted successfully");
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete user");
      console.error("Error deleting user:", err);
    }
  };

  const handleSaveSystemConfig = async () => {
    if (!systemConfig) return;

    try {
      setError(null);
      await configApi.update(systemConfig);
      setSuccess("System configuration saved successfully");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save configuration");
      console.error("Error saving config:", err);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Settings
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        Manage your profile and system settings.
      </Typography>

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

      <Paper elevation={2}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Profile" />
          <Tab label="Password" />
          <Tab label="Users" />
          <Tab label="System Configuration" />
        </Tabs>

        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                value={currentUser?.username || ""}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Full Name"
                value={profileForm.full_name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, full_name: e.target.value })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, email: e.target.value })
                }
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleUpdateProfile}
              >
                Update Profile
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Account Information
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Role: {currentUser?.is_admin ? "Administrator" : "User"}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Status:{" "}
                  <Chip
                    label={currentUser?.is_active ? "Active" : "Inactive"}
                    color={currentUser?.is_active ? "success" : "default"}
                    size="small"
                  />
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Password Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    current_password: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    new_password: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirm_password: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleChangePassword}
              >
                Change Password
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={2}>
          {currentUser?.is_admin ? (
            <>
              <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setOpenUserDialog(true)}
                >
                  Add User
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Full Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.full_name || "—"}</TableCell>
                          <TableCell>{user.email || "—"}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.is_admin ? "Admin" : "User"}
                              color={user.is_admin ? "primary" : "default"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.is_active ? "Active" : "Inactive"}
                              color={user.is_active ? "success" : "default"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          ) : (
            <Alert severity="info">Only administrators can manage users.</Alert>
          )}
        </TabPanel>

        {/* System Configuration Tab */}
        <TabPanel value={tabValue} index={3}>
          {currentUser?.is_admin ? (
            <>
              {configLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : systemConfig ? (
                <Grid container spacing={4}>
                  {/* Auto Order Configuration */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Automatic Ordering
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          type="text"
                          inputMode="numeric"
                          label="Min Order Quantity"
                          value={systemConfig.auto_order.min_order_quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setSystemConfig({
                              ...systemConfig,
                              auto_order: {
                                ...systemConfig.auto_order,
                                min_order_quantity: parseInt(val) || 1,
                              },
                            });
                          }}
                          inputProps={{ pattern: "[0-9]*" }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          type="text"
                          inputMode="numeric"
                          label="Max Order Quantity"
                          value={systemConfig.auto_order.max_order_quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setSystemConfig({
                              ...systemConfig,
                              auto_order: {
                                ...systemConfig.auto_order,
                                max_order_quantity: parseInt(val) || 1000,
                              },
                            });
                          }}
                          inputProps={{ pattern: "[0-9]*" }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Station Requests */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Station Requests
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          type="text"
                          inputMode="numeric"
                          label="Max Request Quantity per Station"
                          value={
                            systemConfig.station_requests.max_request_quantity
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setSystemConfig({
                              ...systemConfig,
                              station_requests: {
                                ...systemConfig.station_requests,
                                max_request_quantity: parseInt(val) || 100,
                              },
                            });
                          }}
                          inputProps={{ pattern: "[0-9]*" }}
                          helperText="Maximum items a station can request at once"
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Stock Alerts */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Stock Level Alerts
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          type="text"
                          inputMode="numeric"
                          label="Critical Stock Percentage"
                          value={
                            systemConfig.stock_alerts.alert_critical_percent
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setSystemConfig({
                              ...systemConfig,
                              stock_alerts: {
                                ...systemConfig.stock_alerts,
                                alert_critical_percent: parseInt(val) || 25,
                              },
                            });
                          }}
                          helperText="Alert when stock falls below this % of par level"
                          inputProps={{ pattern: "[0-9]*", min: 0, max: 100 }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Transfer Restrictions */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Transfer Restrictions
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          type="text"
                          inputMode="numeric"
                          label="Max Transfer Quantity"
                          value={
                            systemConfig.transfer_restrictions
                              .max_transfer_quantity
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setSystemConfig({
                              ...systemConfig,
                              transfer_restrictions: {
                                ...systemConfig.transfer_restrictions,
                                max_transfer_quantity: parseInt(val) || 1000,
                              },
                            });
                          }}
                          inputProps={{ pattern: "[0-9]*" }}
                          helperText="Maximum items that can be transferred at once"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          type="text"
                          inputMode="numeric"
                          label="Require Notes Above Quantity"
                          value={
                            systemConfig.transfer_restrictions
                              .require_notes_above_quantity || ""
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setSystemConfig({
                              ...systemConfig,
                              transfer_restrictions: {
                                ...systemConfig.transfer_restrictions,
                                require_notes_above_quantity: val
                                  ? parseInt(val)
                                  : null,
                              },
                            });
                          }}
                          inputProps={{ pattern: "[0-9]*" }}
                          helperText="Require notes for large transfers"
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSaveSystemConfig}
                      size="large"
                    >
                      Save Configuration
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">Loading configuration...</Alert>
              )}
            </>
          ) : (
            <Alert severity="info">
              Only administrators can modify system configuration.
            </Alert>
          )}
        </TabPanel>
      </Paper>

      {/* Create User Dialog */}
      <Dialog
        open={openUserDialog}
        onClose={() => setOpenUserDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={newUser.full_name}
                onChange={(e) =>
                  setNewUser({ ...newUser, full_name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
