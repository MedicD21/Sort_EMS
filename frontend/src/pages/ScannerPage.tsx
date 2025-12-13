/**
 * Scanner Page - RFID/Barcode Scanner with Bulk Inventory Scan for Restock Orders
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  CircularProgress,
  // removed unused list components to satisfy noUnusedLocals
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  Stepper,
  Step,
  StepLabel,
  Tabs,
  Tab,
  Snackbar,
} from "@mui/material";
import {
  QrCodeScanner,
  CheckCircle,
  Error as ErrorIcon,
  PlayArrow,
  Stop,
  Delete,
  ShoppingCart,
  Inventory,
  LocalShipping,
  Add,
  Remove,
  Send,
  Close,
  // removed unused icon imports
} from "@mui/icons-material";
import { RFIDScanResult } from "../services/apiService";
import { rfidApi, locationsApi, Location } from "../services/apiService";
import { apiClient } from "../services/api";
import { API_BASE_URL } from "../services/config";

// Types
interface ScannedItem {
  tag_id: string;
  item_id?: string;
  item_name: string;
  item_code: string;
  quantity: number;
  current_stock?: number;
  par_level?: number;
  needs_restock: boolean;
  restock_quantity: number;
  scanned_at: Date;
}

interface ScanSession {
  location_id: string;
  location_name: string;
  started_at: Date;
  items: Map<string, ScannedItem>;
  total_scans: number;
}

// Tab panel component
function TabPanel(props: {
  children?: React.ReactNode;
  value: number;
  index: number;
}) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function ScannerPage() {
  // Debug: Show API base URL and loaded locations (set to false for production)
  const [showDebug, setShowDebug] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [locationsRaw, setLocationsRaw] = useState<any>(null);
  // Import config for API base URL
  // @ts-ignore
  const apiBaseUrl =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    "unknown";
  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Single scan state
  const [rfidTag, setRfidTag] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Bulk scan state
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [bulkScanning, setBulkScanning] = useState(false);
  const [scanSession, setScanSession] = useState<ScanSession | null>(null);
  const [bulkScanInput, setBulkScanInput] = useState("");
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");

  // Success/error notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Load locations on mount
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLocationsError(null);
      setLocationsRaw(null);
      const response = await locationsApi.list({ limit: 100 });
      setLocations(response.data);
      setLocationsRaw(response.data);
      // Set default location to 'Station 4 Cabinet' if present
      const defaultLoc = response.data.find((loc: Location) =>
        loc.name.toLowerCase().includes("station 4 cabinet")
      );
      if (defaultLoc) {
        setSelectedLocationId(defaultLoc.id);
      }
    } catch (err: any) {
      // Log axios error and attempt a direct fetch fallback to surface details
      console.error("Failed to load locations (axios):", err);
      let fallbackMsg = "";
      try {
        const fetchResp = await fetch(
          `${API_BASE_URL}/api/v1/locations/?limit=100`
        );
        fallbackMsg = `fetch status ${fetchResp.status}`;
        if (fetchResp.ok) {
          const data = await fetchResp.json();
          setLocations(data);
          setLocationsRaw(data);
          const defaultLoc = data.find((loc: Location) =>
            loc.name.toLowerCase().includes("station 4 cabinet")
          );
          if (defaultLoc) {
            setSelectedLocationId(defaultLoc.id);
          }
          setLocationsError(
            `Axios failed (${err?.message || "unknown"}); fetch succeeded`
          );
          return;
        }
      } catch (fetchErr: any) {
        fallbackMsg += `; fetch error ${fetchErr?.message || fetchErr}`;
        console.error("Fallback fetch failed:", fetchErr);
      }

      setLocationsError(
        `Network error: ${err?.message || JSON.stringify(err)} ${fallbackMsg}`
      );
      setLocationsRaw(err?.response?.data || null);
    }
  };

  // ==================== SINGLE SCAN ====================
  const handleSingleScan = async () => {
    if (!rfidTag.trim()) {
      setError("Please enter an RFID tag or barcode");
      return;
    }

    try {
      setScanning(true);
      setError(null);
      const response = await rfidApi.scan({ tag_id: rfidTag.trim() });
      setScanResult(response.data);
      setRfidTag("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to scan");
      setScanResult(null);
    } finally {
      setScanning(false);
    }
  };

  const handleSingleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSingleScan();
    }
  };

  // ==================== BULK SCAN ====================
  const startBulkScan = () => {
    if (!selectedLocationId) {
      setError("Please select a location first");
      return;
    }

    const location = locations.find((l) => l.id === selectedLocationId);
    if (!location) return;

    setScanSession({
      location_id: selectedLocationId,
      location_name: location.name,
      started_at: new Date(),
      items: new Map(),
      total_scans: 0,
    });
    setBulkScanning(true);
    setError(null);

    // Focus on input
    setTimeout(() => {
      bulkInputRef.current?.focus();
    }, 100);
  };

  const stopBulkScan = () => {
    setBulkScanning(false);
  };

  const handleBulkScanInput = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter" || !bulkScanInput.trim() || !scanSession) return;

      const tagId = bulkScanInput.trim();
      setBulkScanInput("");
      await addScannedTag(tagId);

      // Keep focus on input
      bulkInputRef.current?.focus();
    },
    [bulkScanInput, scanSession]
  );

  // Reusable function to add a scanned tag (used by both keyboard input and DataWedge events)
  const addScannedTag = useCallback(
    async (tagId: string) => {
      if (!scanSession) return;

      try {
        const response = await rfidApi.scan({ tag_id: tagId });
        const result = response.data as RFIDScanResult;

        if (result.success && (result.item_info || result.tag_info)) {
          const itemInfo =
            result.item_info ?? ({} as RFIDScanResult["item_info"]);
          const tagInfo = result.tag_info ?? ({} as RFIDScanResult["tag_info"]);

          const itemKey = itemInfo?.code || tagInfo?.item_code || tagId;

          // Get current inventory for this item at this location
          let currentStock = 0;
          let parLevel = 0;
          try {
            const invResponse = await locationsApi.inventory(
              scanSession.location_id
            );
            const locationInv = invResponse.data.find(
              (inv: any) =>
                inv.item_code === itemKey || inv.item_id === tagInfo?.item_id
            );
            if (locationInv) {
              currentStock = locationInv.quantity_on_hand || 0;
              parLevel = locationInv.par_level || 0;
            }
          } catch {
            // ignore
          }

          const scannedItem: ScannedItem = {
            tag_id: tagId,
            item_id: tagInfo?.item_id || undefined,
            item_name: itemInfo?.name || tagInfo?.item_name || "Unknown Item",
            item_code: itemKey,
            quantity: 1,
            current_stock: currentStock,
            par_level: parLevel,
            needs_restock: parLevel > 0 && currentStock < parLevel,
            restock_quantity:
              parLevel > currentStock ? parLevel - currentStock : 0,
            scanned_at: new Date(),
          };

          setScanSession((prev) => {
            if (!prev) return prev;
            const newItems = new Map(prev.items);
            const existing = newItems.get(scannedItem.item_code);
            if (existing) {
              scannedItem.quantity = existing.quantity + 1;
            }
            newItems.set(scannedItem.item_code, scannedItem);
            return {
              ...prev,
              items: newItems,
              total_scans: prev.total_scans + 1,
            };
          });
        } else {
          setScanSession((prev) => {
            if (!prev) return prev;
            const newItems = new Map(prev.items);
            const existing = newItems.get(tagId);
            const entry = existing
              ? { ...existing, quantity: existing.quantity + 1 }
              : {
                  tag_id: tagId,
                  item_name: "Unknown Item",
                  item_code: tagId,
                  quantity: 1,
                  needs_restock: false,
                  restock_quantity: 0,
                  scanned_at: new Date(),
                };
            newItems.set(tagId, entry as ScannedItem);
            return {
              ...prev,
              items: newItems,
              total_scans: prev.total_scans + 1,
            };
          });
        }
      } catch (err) {
        console.error("Bulk scan error:", err);
      }
    },
    [scanSession]
  );

  // Listen for DataWedge/Cordova events (when running inside the Cordova wrapper)
  useEffect(() => {
    const handler = async (e: any) => {
      const detail = e.detail || {};
      const tag =
        detail.tag ||
        detail.data_string ||
        detail.data ||
        detail.raw_data ||
        null;
      if (!tag) return;

      // Ensure a session is started and input focused
      if (!scanSession) {
        if (!selectedLocationId && locations.length > 0) {
          setSelectedLocationId(locations[0].id);
        }
        // start session for current selected location
        startBulkScan();
      }

      // Small delay to ensure session created
      setTimeout(() => addScannedTag(String(tag)), 50);
    };

    window.addEventListener("datawedge", handler as EventListener);
    window.addEventListener("datawedge-scan", handler as EventListener);

    return () => {
      window.removeEventListener("datawedge", handler as EventListener);
      window.removeEventListener("datawedge-scan", handler as EventListener);
    };
  }, [locations, scanSession, selectedLocationId, addScannedTag]);

  const removeScannedItem = (itemCode: string) => {
    setScanSession((prev) => {
      if (!prev) return prev;
      const newItems = new Map(prev.items);
      newItems.delete(itemCode);
      return { ...prev, items: newItems };
    });
  };

  const adjustQuantity = (itemCode: string, delta: number) => {
    setScanSession((prev) => {
      if (!prev) return prev;
      const newItems = new Map(prev.items);
      const item = newItems.get(itemCode);
      if (item) {
        const newQty = Math.max(0, item.quantity + delta);
        if (newQty === 0) {
          newItems.delete(itemCode);
        } else {
          newItems.set(itemCode, { ...item, quantity: newQty });
        }
      }
      return { ...prev, items: newItems };
    });
  };

  const adjustRestockQuantity = (itemCode: string, delta: number) => {
    setScanSession((prev) => {
      if (!prev) return prev;
      const newItems = new Map(prev.items);
      const item = newItems.get(itemCode);
      if (item) {
        newItems.set(itemCode, {
          ...item,
          restock_quantity: Math.max(0, item.restock_quantity + delta),
          needs_restock: item.restock_quantity + delta > 0,
        });
      }
      return { ...prev, items: newItems };
    });
  };

  const clearSession = () => {
    setScanSession(null);
    setBulkScanning(false);
    setBulkScanInput("");
  };

  // ==================== SUBMIT ORDER ====================
  const openReviewDialog = () => {
    setBulkScanning(false);
    setReviewDialogOpen(true);
  };

  const submitRestockOrder = async () => {
    if (!scanSession) return;

    // Get items that need restock
    const itemsToRestock = Array.from(scanSession.items.values()).filter(
      (item) => item.needs_restock && item.restock_quantity > 0
    );

    if (itemsToRestock.length === 0) {
      setSnackbar({
        open: true,
        message: "No items need restocking",
        severity: "error",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create restock order
      const response = await apiClient.post(
        "/api/v1/inventory/create-restock-order",
        {
          location_ids: [scanSession.location_id],
          notes:
            orderNotes ||
            `Bulk scan restock order for ${scanSession.location_name}`,
        }
      );

      setSnackbar({
        open: true,
        message: `Restock order created successfully! Order #: ${
          response.data.orders?.[0]?.order_number || "Created"
        }`,
        severity: "success",
      });

      setReviewDialogOpen(false);
      clearSession();
      setOrderNotes("");
    } catch (err: any) {
      console.error("Failed to create restock order:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || "Failed to create restock order",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate summary stats
  const getSessionStats = () => {
    if (!scanSession) return { total: 0, needsRestock: 0, totalRestockQty: 0 };
    const items = Array.from(scanSession.items.values());
    return {
      total: items.length,
      needsRestock: items.filter((i) => i.needs_restock).length,
      totalRestockQty: items.reduce((sum, i) => sum + i.restock_quantity, 0),
    };
  };

  const stats = getSessionStats();

  return (
    <Box>
      {/* Debug Info - visible at top of page */}
      {showDebug && (
        <Paper
          sx={{ p: 2, mb: 2, bgcolor: "#fffbe6", border: "1px solid #ffe58f" }}
        >
          {showDebug && (
            <Paper
              sx={{
                p: 2,
                mb: 2,
                bgcolor: "#fffbe6",
                border: "1px solid #ffe58f",
              }}
            >
              <Typography
                variant="body2"
                color="warning.main"
                fontWeight="bold"
              >
                [Debug] API Base URL: {apiBaseUrl}
              </Typography>
              <Typography variant="body2" color="warning.main">
                [Debug] Locations loaded: {locations.length}
              </Typography>
              {locationsError && (
                <Typography variant="body2" color="error.main">
                  [Debug] Locations error: {locationsError}
                </Typography>
              )}
              {locationsRaw && (
                <Typography
                  variant="body2"
                  color="info.main"
                  sx={{ wordBreak: "break-all" }}
                >
                  [Debug] Locations raw: {JSON.stringify(locationsRaw)}
                </Typography>
              )}
              <Button
                size="small"
                onClick={() => setShowDebug(false)}
                sx={{ mt: 1 }}
              >
                Hide Debug Info
              </Button>
            </Paper>
          )}
        </Paper>
      )}
      <Typography variant="h4" gutterBottom fontWeight="bold">
        RFID / Barcode Scanner
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Scan items individually or perform bulk inventory scans for restock
        orders.
      </Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
        >
          <Tab
            icon={<QrCodeScanner />}
            label="Single Scan"
            iconPosition="start"
          />
          <Tab
            icon={<Inventory />}
            label="Bulk Inventory Scan"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* ==================== SINGLE SCAN TAB ==================== */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <QrCodeScanner
                  sx={{ fontSize: 80, color: "primary.main", mb: 2 }}
                />
                <Typography variant="h6" gutterBottom>
                  Zebra TC22/TC27 Scanner
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Scan RFID tag or barcode
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="RFID Tag / Barcode"
                value={rfidTag}
                onChange={(e) => setRfidTag(e.target.value)}
                onKeyPress={handleSingleKeyPress}
                placeholder="Scan or enter tag..."
                disabled={scanning}
                autoFocus
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={
                  scanning ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <QrCodeScanner />
                  )
                }
                onClick={handleSingleScan}
                disabled={scanning || !rfidTag.trim()}
              >
                {scanning ? "Scanning..." : "Scan Item"}
              </Button>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, minHeight: 350 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Scan Result
              </Typography>

              {scanResult ? (
                <Box sx={{ mt: 2 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      bgcolor: scanResult.success
                        ? "success.dark"
                        : "error.dark",
                      borderColor: scanResult.success
                        ? "success.main"
                        : "error.main",
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 2 }}
                      >
                        {scanResult.success ? (
                          <CheckCircle sx={{ mr: 1, fontSize: 32 }} />
                        ) : (
                          <ErrorIcon sx={{ mr: 1, fontSize: 32 }} />
                        )}
                        <Typography variant="h6">
                          {scanResult.success ? "Item Found" : "Not Found"}
                        </Typography>
                      </Box>

                      {scanResult.item_info && (
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {scanResult.item_info.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Code: {scanResult.item_info.code}
                          </Typography>
                          {scanResult.item_info.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1 }}
                            >
                              {scanResult.item_info.description}
                            </Typography>
                          )}
                        </Box>
                      )}

                      <Typography variant="body2" sx={{ mt: 2 }}>
                        {scanResult.message}
                      </Typography>

                      {scanResult.suggested_action && (
                        <Chip
                          label={scanResult.suggested_action.replace("_", " ")}
                          color="warning"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 250,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Scan a tag to view details
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ==================== BULK SCAN TAB ==================== */}
      <TabPanel value={tabValue} index={1}>
        {/* Stepper */}
        <Stepper
          activeStep={
            !scanSession ? 0 : reviewDialogOpen ? 2 : bulkScanning ? 1 : 1
          }
          sx={{ mb: 3 }}
        >
          <Step>
            <StepLabel>Select Location</StepLabel>
          </Step>
          <Step>
            <StepLabel>Scan Items</StepLabel>
          </Step>
          <Step>
            <StepLabel>Review & Submit Order</StepLabel>
          </Step>
        </Stepper>

        <Grid container spacing={3}>
          {/* Left Panel - Controls */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Scan Setup
              </Typography>

              {/* Location selector */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Location</InputLabel>
                <Select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  label="Select Location"
                  disabled={bulkScanning}
                >
                  {locations.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.name}
                      <Chip
                        label={loc.type.replace("_", " ")}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Scan controls */}
              {!scanSession ? (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<PlayArrow />}
                  onClick={startBulkScan}
                  disabled={!selectedLocationId}
                >
                  Start Scanning
                </Button>
              ) : (
                <Box>
                  {/* Active scan input */}
                  {bulkScanning && (
                    <TextField
                      fullWidth
                      inputRef={bulkInputRef}
                      label="Scan RFID/Barcode"
                      value={bulkScanInput}
                      onChange={(e) => setBulkScanInput(e.target.value)}
                      onKeyDown={handleBulkScanInput}
                      placeholder="Pull trigger to scan..."
                      autoFocus
                      sx={{ mb: 2 }}
                      InputProps={{
                        endAdornment: (
                          <CircularProgress size={20} color="primary" />
                        ),
                      }}
                    />
                  )}

                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    {bulkScanning ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        color="warning"
                        startIcon={<Stop />}
                        onClick={stopBulkScan}
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="outlined"
                        color="primary"
                        startIcon={<PlayArrow />}
                        onClick={() => {
                          setBulkScanning(true);
                          setTimeout(() => bulkInputRef.current?.focus(), 100);
                        }}
                      >
                        Continue
                      </Button>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<ShoppingCart />}
                    onClick={openReviewDialog}
                    disabled={scanSession.items.size === 0}
                  >
                    Review & Create Order
                  </Button>

                  <Button
                    fullWidth
                    variant="text"
                    color="error"
                    startIcon={<Delete />}
                    onClick={clearSession}
                    sx={{ mt: 1 }}
                  >
                    Clear & Start Over
                  </Button>
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Paper>

            {/* Session Stats */}
            {scanSession && (
              <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Session Stats
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography color="text.secondary">Location:</Typography>
                    <Typography fontWeight="bold">
                      {scanSession.location_name}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography color="text.secondary">Total Scans:</Typography>
                    <Typography fontWeight="bold">
                      {scanSession.total_scans}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography color="text.secondary">
                      Unique Items:
                    </Typography>
                    <Typography fontWeight="bold">{stats.total}</Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography color="text.secondary">
                      Need Restock:
                    </Typography>
                    <Badge badgeContent={stats.needsRestock} color="warning">
                      <Chip
                        label={stats.needsRestock}
                        color={stats.needsRestock > 0 ? "warning" : "default"}
                        size="small"
                      />
                    </Badge>
                  </Box>
                </Box>
              </Paper>
            )}
          </Grid>

          {/* Right Panel - Scanned Items */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3, minHeight: 500 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Scanned Items
                </Typography>
                {scanSession && (
                  <Chip
                    label={`${scanSession.items.size} items`}
                    color="primary"
                  />
                )}
              </Box>

              {scanSession && scanSession.items.size > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="center">Scanned</TableCell>
                        <TableCell align="center">Current</TableCell>
                        <TableCell align="center">PAR</TableCell>
                        <TableCell align="center">Restock Qty</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.from(scanSession.items.values()).map((item) => (
                        <TableRow
                          key={item.item_code}
                          sx={{
                            bgcolor: item.needs_restock
                              ? "warning.dark"
                              : "transparent",
                          }}
                        >
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {item.item_name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {item.item_code}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 0.5,
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() =>
                                  adjustQuantity(item.item_code, -1)
                                }
                              >
                                <Remove fontSize="small" />
                              </IconButton>
                              <Typography fontWeight="bold">
                                {item.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  adjustQuantity(item.item_code, 1)
                                }
                              >
                                <Add fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {item.current_stock ?? "-"}
                          </TableCell>
                          <TableCell align="center">
                            {item.par_level ?? "-"}
                          </TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 0.5,
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() =>
                                  adjustRestockQuantity(item.item_code, -1)
                                }
                              >
                                <Remove fontSize="small" />
                              </IconButton>
                              <Chip
                                label={item.restock_quantity}
                                color={
                                  item.restock_quantity > 0
                                    ? "warning"
                                    : "default"
                                }
                                size="small"
                              />
                              <IconButton
                                size="small"
                                onClick={() =>
                                  adjustRestockQuantity(item.item_code, 1)
                                }
                              >
                                <Add fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeScannedItem(item.item_code)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 400,
                    color: "text.secondary",
                  }}
                >
                  <Inventory sx={{ fontSize: 80, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6">
                    {scanSession
                      ? "Pull trigger to start scanning"
                      : "Select a location and start scanning"}
                  </Typography>
                  <Typography variant="body2">
                    Scanned items will appear here
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ==================== REVIEW DIALOG ==================== */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LocalShipping color="primary" />
              <Typography variant="h6">Review Restock Order</Typography>
            </Box>
            <IconButton onClick={() => setReviewDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {scanSession && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Creating restock order for{" "}
                  <strong>{scanSession.location_name}</strong>
                </Typography>
              </Alert>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ mb: 2 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "primary.dark" }}>
                      <TableCell>Item</TableCell>
                      <TableCell align="center">Current Stock</TableCell>
                      <TableCell align="center">PAR Level</TableCell>
                      <TableCell align="center">Restock Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.from(scanSession.items.values())
                      .filter(
                        (item) =>
                          item.needs_restock && item.restock_quantity > 0
                      )
                      .map((item) => (
                        <TableRow key={item.item_code}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {item.item_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.item_code}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {item.current_stock ?? "-"}
                          </TableCell>
                          <TableCell align="center">
                            {item.par_level ?? "-"}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={item.restock_quantity}
                              color="warning"
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  p: 2,
                  bgcolor: "background.default",
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography color="text.secondary" variant="caption">
                      Total Items
                    </Typography>
                    <Typography variant="h6">{stats.needsRestock}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography color="text.secondary" variant="caption">
                      Total Quantity
                    </Typography>
                    <Typography variant="h6">
                      {stats.totalRestockQty}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography color="text.secondary" variant="caption">
                      Location
                    </Typography>
                    <Typography variant="h6">
                      {scanSession.location_name}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <TextField
                fullWidth
                label="Order Notes (Optional)"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                multiline
                rows={2}
                placeholder="Add any special instructions for logistics..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setReviewDialogOpen(false);
              setBulkScanning(true);
              setTimeout(() => bulkInputRef.current?.focus(), 100);
            }}
            startIcon={<QrCodeScanner />}
          >
            Continue Scanning
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={submitRestockOrder}
            disabled={submitting || stats.needsRestock === 0}
            startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
          >
            {submitting ? "Submitting..." : "Submit Restock Order"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
