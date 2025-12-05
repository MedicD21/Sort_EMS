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
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  SwapHoriz as TransferIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  itemsApi,
  Item,
  locationsApi,
  Location,
  inventoryApi,
} from "../services/apiService";
import { IndividualItemsDialog } from "../components/IndividualItemsDialog";

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [selectedSubLocation, setSelectedSubLocation] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    rfid_tag: "",
    supply_station_location: "",
    current_stock: 0,
    par_level: 0,
    reorder_level: 0,
    unit_cost: 0,
    expiration_date: "",
  });

  // Number pad dialog state
  const [numPadOpen, setNumPadOpen] = useState(false);
  const [numPadValue, setNumPadValue] = useState("");
  const [numPadField, setNumPadField] = useState<
    "current_stock" | "par_level" | "reorder_level" | "transfer_quantity" | null
  >(null);

  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<Item | null>(null);
  const [transferForm, setTransferForm] = useState({
    to_location_id: "",
    quantity: 0,
    notes: "",
  });
  const [scanInput, setScanInput] = useState("");
  const [availableTransferLocations, setAvailableTransferLocations] = useState<
    Location[]
  >([]);

  // RFID Inventory Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<Map<string, number>>(
    new Map()
  );
  const [scanResultsOpen, setScanResultsOpen] = useState(false);
  const [scanResults, setScanResults] = useState<{
    toBeOrdered: Item[];
    ok: Item[];
    par: Item[];
  }>({ toBeOrdered: [], ok: [], par: [] });

  // Individual Items dialog state
  const [individualItemsDialogOpen, setIndividualItemsDialogOpen] =
    useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<{
    itemId: string;
    itemName: string;
    locationId: string;
    locationName: string;
  } | null>(null);

  useEffect(() => {
    fetchLocations();
    fetchItems();
  }, [selectedStation, selectedSubLocation]);

  const fetchLocations = async () => {
    try {
      const response = await locationsApi.list();
      setLocations(response.data);
    } catch (err: any) {
      console.error("Error fetching locations:", err);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { limit: 500 };

      // Build location filter based on station and sub-location selection
      if (selectedStation !== "all") {
        if (selectedStation === "supply_station") {
          // Supply Station has no sub-locations
          const matchingLoc = locations.find(
            (loc) => loc.name === "Supply Station"
          );
          if (matchingLoc) {
            params.location_id = matchingLoc.id;
          }
        } else {
          // Station 1-11
          const stationNum = selectedStation.replace("station_", "");

          if (selectedSubLocation === "all") {
            // Show combined cabinet + truck for this station
            params.station = selectedStation;
            console.log(
              `Filtering by station: ${selectedStation} (will sum cabinet + truck)`
            );
          } else if (selectedSubLocation === "cabinet") {
            const locationName = `Station ${stationNum} Cabinet`;
            const matchingLoc = locations.find(
              (loc) => loc.name === locationName
            );
            if (matchingLoc) {
              params.location_id = matchingLoc.id;
              console.log(
                `Filtering by location: ${locationName} (${matchingLoc.id})`
              );
            } else {
              console.warn(`Location not found: ${locationName}`);
            }
          } else if (selectedSubLocation === "truck") {
            const locationName = `Station ${stationNum} Truck`;
            const matchingLoc = locations.find(
              (loc) => loc.name === locationName
            );
            if (matchingLoc) {
              params.location_id = matchingLoc.id;
              console.log(
                `Filtering by location: ${locationName} (${matchingLoc.id})`
              );
            } else {
              console.warn(`Location not found: ${locationName}`);
            }
          }
        }
      }

      const response = await itemsApi.list(params);
      console.log("Fetched items with params:", params);
      console.log("First item location_id:", response.data[0]?.location_id);
      setItems(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load inventory");
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  const openNumPad = (
    field: "current_stock" | "par_level" | "reorder_level" | "transfer_quantity"
  ) => {
    setNumPadField(field);
    if (field === "transfer_quantity") {
      setNumPadValue(transferForm.quantity.toString());
    } else {
      setNumPadValue(editForm[field].toString());
    }
    setNumPadOpen(true);
  };

  const handleNumPadInput = (digit: string) => {
    if (digit === "C") {
      setNumPadValue("");
    } else if (digit === "DEL") {
      setNumPadValue(numPadValue.slice(0, -1));
    } else {
      setNumPadValue(numPadValue + digit);
    }
  };

  const handleNumPadAdjust = (amount: number) => {
    const currentVal = parseInt(numPadValue) || 0;
    const newVal = Math.max(0, currentVal + amount);
    setNumPadValue(newVal.toString());
  };

  const handleNumPadConfirm = () => {
    if (numPadField) {
      if (numPadField === "transfer_quantity") {
        setTransferForm({
          ...transferForm,
          quantity: parseInt(numPadValue) || 0,
        });
      } else {
        setEditForm({
          ...editForm,
          [numPadField]: parseInt(numPadValue) || 0,
        });
      }
    }
    setNumPadOpen(false);
  };

  const handleEditClick = (item: Item) => {
    // Don't allow editing when viewing Cabinet + Truck combined (can't update two locations at once)
    if (
      selectedStation !== "all" &&
      selectedStation !== "supply_station" &&
      selectedSubLocation === "all"
    ) {
      setError(
        "Cannot edit items in combined Cabinet + Truck view. Please select a specific location (Cabinet or Truck)."
      );
      return;
    }

    setEditingItem(item);
    setEditForm({
      name: item.name,
      rfid_tag: item.rfid_tag || "",
      supply_station_location: item.sku || "",
      current_stock: item.current_stock,
      par_level: item.par_level || 0,
      reorder_level: item.reorder_level || 0,
      unit_cost: item.unit_cost || 0,
      expiration_date: item.expiration_date
        ? item.expiration_date.split("T")[0]
        : "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    try {
      setError(null);

      // Determine the location_id to update:
      // If item has location_id, use it. Otherwise, must have a specific location selected.
      let locationIdToUpdate = editingItem.location_id;

      if (!locationIdToUpdate && selectedStation !== "all") {
        // Find the current selected location
        let locationName = "";
        if (selectedStation === "supply_station") {
          locationName = "Supply Station";
        } else {
          const stationNum = selectedStation.replace("station_", "");
          if (selectedSubLocation === "cabinet") {
            locationName = `Station ${stationNum} Cabinet`;
          } else if (selectedSubLocation === "truck") {
            locationName = `Station ${stationNum} Truck`;
          }
        }

        if (locationName) {
          const matchingLoc = locations.find(
            (loc) => loc.name === locationName
          );
          if (matchingLoc) {
            locationIdToUpdate = matchingLoc.id;
          }
        }
      }

      if (!locationIdToUpdate) {
        setError("Please select a specific location to update stock");
        return;
      }

      console.log("Updating item with location_id:", locationIdToUpdate);
      console.log("Current stock value:", editForm.current_stock);

      // Build update object - only include current_stock if it actually changed
      const updateData: any = {
        name: editForm.name,
        rfid_tag: editForm.rfid_tag,
        sku: editForm.supply_station_location,
        par_level: editForm.par_level,
        reorder_level: editForm.reorder_level,
        unit_cost: editForm.unit_cost,
        location_id: locationIdToUpdate,
        expiration_date: editForm.expiration_date || undefined,
      };

      // Only include current_stock if it was modified
      if (editForm.current_stock !== editingItem.current_stock) {
        updateData.current_stock = editForm.current_stock;
      }

      await itemsApi.update(editingItem.id.toString(), updateData);
      setSuccess("Item updated successfully");
      setEditDialogOpen(false);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update item");
      console.error("Error updating item:", err);
    }
  };

  const handleTransferClick = (item: Item) => {
    // Determine current location
    let currentLocationName = item.location_name;
    if (!currentLocationName && selectedStation !== "all") {
      if (selectedStation === "supply_station") {
        currentLocationName = "Supply Station";
      } else {
        const stationNum = selectedStation.replace("station_", "");
        if (selectedSubLocation === "cabinet") {
          currentLocationName = `Station ${stationNum} Cabinet`;
        } else if (selectedSubLocation === "truck") {
          currentLocationName = `Station ${stationNum} Truck`;
        }
      }
    }

    // Determine valid transfer destinations based on location rules:
    // - Supply Station can only transfer to station cabinets
    // - Station cabinets can only transfer to their truck
    // - Station trucks can only transfer to their cabinet
    const validLocations: Location[] = [];

    if (currentLocationName === "Supply Station") {
      // Supply station can transfer to any station cabinet
      validLocations.push(
        ...locations.filter(
          (loc) =>
            loc.name.includes("Cabinet") && loc.name.startsWith("Station")
        )
      );
    } else if (currentLocationName?.includes("Cabinet")) {
      // Cabinet can only transfer to its truck
      const stationMatch = currentLocationName.match(/Station (\d+)/);
      if (stationMatch) {
        const stationNum = stationMatch[1];
        const truck = locations.find(
          (loc) => loc.name === `Station ${stationNum} Truck`
        );
        if (truck) validLocations.push(truck);
      }
    } else if (currentLocationName?.includes("Truck")) {
      // Truck can only transfer to its cabinet
      const stationMatch = currentLocationName.match(/Station (\d+)/);
      if (stationMatch) {
        const stationNum = stationMatch[1];
        const cabinet = locations.find(
          (loc) => loc.name === `Station ${stationNum} Cabinet`
        );
        if (cabinet) validLocations.push(cabinet);
      }
    }

    setAvailableTransferLocations(validLocations);
    setTransferItem(item);
    setTransferForm({
      to_location_id: "",
      quantity: 1,
      notes: "",
    });
    setScanInput("");
    setTransferDialogOpen(true);
  };

  const handleScanSubmit = async () => {
    if (!scanInput.trim()) return;

    try {
      setError(null);
      // Search for item by RFID tag or SKU
      const allItems = await itemsApi.list({ limit: 500 });
      const foundItem = allItems.data.find(
        (item) =>
          item.rfid_tag?.toLowerCase() === scanInput.toLowerCase() ||
          item.sku?.toLowerCase() === scanInput.toLowerCase()
      );

      if (foundItem) {
        // Close transfer dialog and open with scanned item
        setTransferDialogOpen(false);
        setTimeout(() => handleTransferClick(foundItem), 100);
      } else {
        setError(`No item found with RFID/QR code: ${scanInput}`);
      }
      setScanInput("");
    } catch (err: any) {
      setError("Failed to search for item");
      console.error("Error searching item:", err);
    }
  };

  const handleTransferSave = async () => {
    if (!transferItem) return;

    // Use the location from the item, or determine from selected filters
    let fromLocationId = transferItem.location_id;

    if (!fromLocationId && selectedStation !== "all") {
      // Build location name from selection
      let locationName = "";
      if (selectedStation === "supply_station") {
        locationName = "Supply Station";
      } else {
        const stationNum = selectedStation.replace("station_", "");
        if (selectedSubLocation === "cabinet") {
          locationName = `Station ${stationNum}`;
        } else if (selectedSubLocation === "truck") {
          locationName = `Station ${stationNum} Truck`;
        }
      }

      const matchingLoc = locations.find(
        (loc) => loc.name.toLowerCase() === locationName.toLowerCase()
      );
      if (matchingLoc) {
        fromLocationId = matchingLoc.id;
      }
    }

    if (!fromLocationId) {
      setError("Please select a specific location to transfer from");
      return;
    }

    try {
      setError(null);
      await inventoryApi.transfer({
        item_id: transferItem.id.toString(),
        from_location_id: fromLocationId,
        to_location_id: transferForm.to_location_id,
        quantity: transferForm.quantity,
        notes: transferForm.notes,
      });
      setSuccess(
        `Transferred ${transferForm.quantity} ${transferItem.unit_of_measure} to new location`
      );
      setTransferDialogOpen(false);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to transfer item");
      console.error("Error transferring item:", err);
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

  const getStockStatus = (
    current: number,
    par: number | null,
    reorder: number | null
  ) => {
    // To Be Ordered: current stock at or below reorder level (reorder can be 0)
    if (reorder !== null && reorder !== undefined && current <= reorder) {
      return { label: "To Be Ordered", color: "error" as const };
    }

    // Par: current stock matches par level (only if par is set and not 0)
    if (par !== null && par !== undefined && par !== 0 && current === par) {
      return { label: "Par", color: "success" as const };
    }

    // OK: current stock between reorder and par
    if (
      par !== null &&
      par !== undefined &&
      current > (reorder !== null && reorder !== undefined ? reorder : 0) &&
      current < par
    ) {
      return { label: "OK", color: "info" as const };
    }

    // Above par
    if (par !== null && par !== undefined && current > par) {
      return { label: "OK", color: "info" as const };
    }

    return null;
  };

  const getExpirationStatus = (expirationDate: string | null | undefined) => {
    if (!expirationDate) return null;

    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) {
      return {
        daysLeft: daysUntilExpiration,
        color: "error",
        text: `Expired ${Math.abs(daysUntilExpiration)} days ago`,
      };
    } else if (daysUntilExpiration <= 30) {
      return {
        daysLeft: daysUntilExpiration,
        color: "warning",
        text: `Expiring in ${daysUntilExpiration} day${
          daysUntilExpiration !== 1 ? "s" : ""
        }`,
      };
    }

    return {
      daysLeft: daysUntilExpiration,
      color: "success",
      text: `Expires in ${daysUntilExpiration} days`,
    };
  };

  const handleStartScanning = () => {
    setIsScanning(true);
    setScannedItems(new Map());
    setError(null);
    setSuccess("Scanning mode active - scan items with RFID gun");
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    // Calculate results
    const toBeOrdered: Item[] = [];
    const ok: Item[] = [];
    const par: Item[] = [];

    items.forEach((item) => {
      const scannedQty = scannedItems.get(item.rfid_tag || item.sku) || 0;
      const status = getStockStatus(
        scannedQty,
        item.par_level !== null && item.par_level !== undefined
          ? item.par_level
          : null,
        item.reorder_level !== null && item.reorder_level !== undefined
          ? item.reorder_level
          : null
      );

      if (status) {
        if (status.label === "Par") {
          par.push({ ...item, current_stock: scannedQty });
        } else if (status.label === "To Be Ordered") {
          toBeOrdered.push({ ...item, current_stock: scannedQty });
        } else {
          ok.push({ ...item, current_stock: scannedQty });
        }
      }
    });

    setScanResults({ toBeOrdered, ok, par });
    setScanResultsOpen(true);
  };

  const handleScanItem = (rfidCode: string) => {
    if (!isScanning) return;

    const newScannedItems = new Map(scannedItems);
    const currentCount = newScannedItems.get(rfidCode) || 0;
    newScannedItems.set(rfidCode, currentCount + 1);
    setScannedItems(newScannedItems);
    setSuccess(`Scanned: ${rfidCode} (Count: ${currentCount + 1})`);
  };

  const getLocationDescription = () => {
    if (selectedStation === "all") {
      return "Master View - Showing total stock across all locations";
    } else if (selectedStation === "supply_station") {
      return "Supply Station - Central inventory location";
    } else {
      const stationNum = selectedStation.replace("station_", "");
      if (selectedSubLocation === "all") {
        return `Station ${stationNum} - Cabinet and Truck inventory combined`;
      } else if (selectedSubLocation === "cabinet") {
        return `Station ${stationNum} - Station Cabinet inventory only`;
      } else {
        return `Station ${stationNum} - Truck inventory only`;
      }
    }
  };

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
            Inventory Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {getLocationDescription()}
          </Typography>
        </Box>
        <IconButton onClick={fetchItems} color="primary" title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Box>

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

      <Paper elevation={2} sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Station</InputLabel>
              <Select
                value={selectedStation}
                onChange={(e) => {
                  setSelectedStation(e.target.value);
                  setSelectedSubLocation("all");
                }}
                label="Station"
              >
                <MenuItem value="all">All Stations (Master View)</MenuItem>
                <MenuItem value="supply_station">Supply Station</MenuItem>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
                  <MenuItem key={`station-${num}`} value={`station_${num}`}>
                    Station {num}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {selectedStation !== "all" &&
            selectedStation !== "supply_station" && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Location Type</InputLabel>
                  <Select
                    value={selectedSubLocation}
                    onChange={(e) => setSelectedSubLocation(e.target.value)}
                    label="Location Type"
                  >
                    <MenuItem value="all">All (Cabinet + Truck)</MenuItem>
                    <MenuItem value="cabinet">Station Cabinet</MenuItem>
                    <MenuItem value="truck">Truck</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

          <Grid
            item
            xs={12}
            md={
              selectedStation !== "all" && selectedStation !== "supply_station"
                ? 4
                : 8
            }
          >
            <TextField
              fullWidth
              placeholder="Search by name, RFID tag, or supply location..."
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
        </Grid>

        {/* RFID Scanning Controls */}
        <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center" }}>
          {!isScanning ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartScanning}
              startIcon={<SearchIcon />}
            >
              Check Inventory (RFID Scan)
            </Button>
          ) : (
            <>
              <Chip
                label="SCANNING MODE ACTIVE"
                color="success"
                icon={<SearchIcon />}
                sx={{ fontWeight: "bold" }}
              />
              <Typography variant="body2">
                Scanned {scannedItems.size} unique items (
                {Array.from(scannedItems.values()).reduce((a, b) => a + b, 0)}{" "}
                total)
              </Typography>
              <Button
                variant="contained"
                color="error"
                onClick={handleStopScanning}
              >
                Stop Scanning & View Results
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            onClick={fetchItems}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
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
                      <strong>RFID Tag</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Supply Station Loc</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Category</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Current Location</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Current Stock</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Par Level</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Reorder Level</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Status</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Expiration</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item, index) => {
                    const status = getStockStatus(
                      item.current_stock,
                      item.par_level !== null && item.par_level !== undefined
                        ? item.par_level
                        : null,
                      item.reorder_level !== null &&
                        item.reorder_level !== undefined
                        ? item.reorder_level
                        : null
                    );

                    // Build expiration chips array - show both expired and expiring soon if applicable
                    const expirationChips = [];
                    if (item.expired_count && item.expired_count > 0) {
                      expirationChips.push({
                        color: "error",
                        text: `${item.expired_count} expired`,
                        daysLeft: -1,
                      });
                    }
                    if (
                      item.expiring_soon_count &&
                      item.expiring_soon_count > 0
                    ) {
                      expirationChips.push({
                        color: "warning",
                        text: `${item.expiring_soon_count} expiring`,
                        daysLeft: 15,
                      });
                    }

                    // If no counts, fall back to single expiration date
                    if (expirationChips.length === 0) {
                      const singleExpiration = getExpirationStatus(
                        item.expiration_date
                      );
                      if (singleExpiration) {
                        expirationChips.push(singleExpiration);
                      }
                    }

                    return (
                      <TableRow
                        key={item.id}
                        hover
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
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{
                              cursor: "pointer",
                              color: "#64b5f6",
                              "&:hover": {
                                textDecoration: "underline",
                              },
                            }}
                            onClick={() => {
                              setSelectedItemForDetails({
                                itemId: item.id,
                                itemName: item.name,
                                locationId: item.location_id || "",
                                locationName: item.location_name || "",
                              });
                              setIndividualItemsDialogOpen(true);
                            }}
                          >
                            {item.name}
                          </Typography>
                          {item.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              {item.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {item.rfid_tag || "—"}
                          </Typography>
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
                          <Typography variant="body2" fontWeight="medium">
                            {item.current_stock} {item.unit_of_measure}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.par_level !== null &&
                            item.par_level !== undefined
                              ? item.par_level
                              : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.reorder_level !== null &&
                            item.reorder_level !== undefined
                              ? item.reorder_level
                              : "—"}
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
                        <TableCell>
                          {expirationChips.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                flexWrap: "wrap",
                              }}
                            >
                              {expirationChips.map((chip, idx) => (
                                <Chip
                                  key={idx}
                                  label={chip.text}
                                  color={chip.color as any}
                                  size="small"
                                  variant="filled"
                                  sx={{
                                    fontWeight: "bold",
                                    ...(chip.color === "error" && {
                                      backgroundColor: "#ef5350",
                                      color: "#fff",
                                    }),
                                    ...(chip.color === "warning" && {
                                      backgroundColor: "#ffa726",
                                      color: "#000",
                                    }),
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditClick(item)}
                            title="Edit Item"
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleTransferClick(item)}
                            title="Transfer to Another Location"
                            color="secondary"
                          >
                            <TransferIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
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

      {/* Edit Item Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Item: {editingItem?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Item Name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="RFID Tag"
                value={editForm.rfid_tag}
                onChange={(e) =>
                  setEditForm({ ...editForm, rfid_tag: e.target.value })
                }
                helperText="Unique RFID identifier for scanning"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supply Station Location"
                value={editForm.supply_station_location}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    supply_station_location: e.target.value,
                  })
                }
                helperText="Location reference at supply station"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Stock"
                value={editForm.current_stock}
                onClick={() => openNumPad("current_stock")}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ cursor: "pointer" }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Par Level"
                value={editForm.par_level}
                onClick={() => openNumPad("par_level")}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ cursor: "pointer" }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Reorder Level"
                value={editForm.reorder_level}
                onClick={() => openNumPad("reorder_level")}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ cursor: "pointer" }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Unit Cost ($)"
                value={editForm.unit_cost}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    unit_cost: parseFloat(e.target.value) || 0,
                  })
                }
                inputProps={{ step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Expiration Date"
                value={editForm.expiration_date}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    expiration_date: e.target.value,
                  })
                }
                InputLabelProps={{ shrink: true }}
                helperText="Optional - Leave blank if no expiration"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Item Dialog */}
      <Dialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Transfer Item</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* RFID/QR Scan Section */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
                <Typography variant="subtitle2" gutterBottom>
                  Scan RFID or QR Code
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Scan or enter RFID/QR code..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleScanSubmit();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    variant="contained"
                    onClick={handleScanSubmit}
                    disabled={!scanInput.trim()}
                  >
                    Scan
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Item Details (shown when item selected) */}
            {transferItem && (
              <>
                <Grid item xs={12}>
                  <Paper
                    elevation={1}
                    sx={{ p: 2, backgroundColor: "#e3f2fd" }}
                  >
                    <Typography variant="h6" gutterBottom>
                      {transferItem.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current Location:{" "}
                      {transferItem.location_name || "Unknown"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available: {transferItem.current_stock}{" "}
                      {transferItem.unit_of_measure}
                    </Typography>
                    {transferItem.rfid_tag && (
                      <Typography variant="body2" color="text.secondary">
                        RFID: {transferItem.rfid_tag}
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Transfer To Location</InputLabel>
                    <Select
                      value={transferForm.to_location_id}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          to_location_id: e.target.value,
                        })
                      }
                      label="Transfer To Location"
                    >
                      {availableTransferLocations.length === 0 ? (
                        <MenuItem disabled>
                          No valid transfer destinations
                        </MenuItem>
                      ) : (
                        availableTransferLocations.map((loc) => (
                          <MenuItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                  {availableTransferLocations.length === 0 && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ mt: 1, display: "block" }}
                    >
                      Transfer restrictions: Supply Station → Station Cabinets
                      only. Stations → Cabinet ↔ Truck only.
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Quantity to Transfer"
                    value={transferForm.quantity}
                    onClick={() => openNumPad("transfer_quantity")}
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{ cursor: "pointer" }}
                    helperText={`Max: ${transferItem.current_stock}`}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Notes (optional)"
                    value={transferForm.notes}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleTransferSave}
            variant="contained"
            disabled={
              !transferItem ||
              !transferForm.to_location_id ||
              transferForm.quantity <= 0 ||
              transferForm.quantity > (transferItem?.current_stock || 0)
            }
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Number Pad Dialog */}
      <Dialog
        open={numPadOpen}
        onClose={() => setNumPadOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#1e1e1e",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle>
          Enter{" "}
          {numPadField === "current_stock"
            ? "Current Stock"
            : numPadField === "par_level"
            ? "Par Level"
            : numPadField === "reorder_level"
            ? "Reorder Level"
            : "Transfer Quantity"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            {/* Display */}
            <Paper
              elevation={1}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: "#2a2a2a",
                textAlign: "right",
                minHeight: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <Typography
                variant="h4"
                sx={{ fontFamily: "monospace", color: "#fff" }}
              >
                {numPadValue || "0"}
              </Typography>
            </Paper>

            {/* Quick Adjust Buttons */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={() => handleNumPadAdjust(-10)}
                  sx={{ height: 50 }}
                >
                  -10
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={() => handleNumPadAdjust(-1)}
                  sx={{ height: 50 }}
                >
                  -1
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="success"
                  onClick={() => handleNumPadAdjust(1)}
                  sx={{ height: 50 }}
                >
                  +1
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="success"
                  onClick={() => handleNumPadAdjust(10)}
                  sx={{ height: 50 }}
                >
                  +10
                </Button>
              </Grid>
            </Grid>

            {/* Number Pad */}
            <Grid container spacing={1}>
              {["7", "8", "9"].map((num) => (
                <Grid item xs={4} key={num}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleNumPadInput(num)}
                    sx={{ height: 60, fontSize: "1.5rem" }}
                  >
                    {num}
                  </Button>
                </Grid>
              ))}
              {["4", "5", "6"].map((num) => (
                <Grid item xs={4} key={num}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleNumPadInput(num)}
                    sx={{ height: 60, fontSize: "1.5rem" }}
                  >
                    {num}
                  </Button>
                </Grid>
              ))}
              {["1", "2", "3"].map((num) => (
                <Grid item xs={4} key={num}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleNumPadInput(num)}
                    sx={{ height: 60, fontSize: "1.5rem" }}
                  >
                    {num}
                  </Button>
                </Grid>
              ))}
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={() => handleNumPadInput("C")}
                  sx={{ height: 60, fontSize: "1.2rem" }}
                >
                  Clear
                </Button>
              </Grid>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleNumPadInput("0")}
                  sx={{ height: 60, fontSize: "1.5rem" }}
                >
                  0
                </Button>
              </Grid>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => handleNumPadInput("DEL")}
                  sx={{ height: 60, fontSize: "1rem" }}
                >
                  ⌫
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNumPadOpen(false)}>Cancel</Button>
          <Button
            onClick={handleNumPadConfirm}
            variant="contained"
            size="large"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scan Results Dialog */}
      <Dialog
        open={scanResultsOpen}
        onClose={() => setScanResultsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Inventory Scan Results</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* To Be Ordered Items */}
            <Paper
              elevation={2}
              sx={{ p: 2, mb: 2, backgroundColor: "#ffebee" }}
            >
              <Typography variant="h6" color="error" gutterBottom>
                To Be Ordered ({scanResults.toBeOrdered.length} items)
              </Typography>
              {scanResults.toBeOrdered.map((item) => (
                <Box key={item.id} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{item.name}</strong> - Current: {item.current_stock}
                    , Par: {item.par_level}, Need:{" "}
                    {(item.par_level || 0) - item.current_stock}
                  </Typography>
                </Box>
              ))}
              {scanResults.toBeOrdered.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No items need to be ordered
                </Typography>
              )}
            </Paper>

            {/* OK Items */}
            <Paper
              elevation={2}
              sx={{ p: 2, mb: 2, backgroundColor: "#e3f2fd" }}
            >
              <Typography variant="h6" color="info" gutterBottom>
                OK ({scanResults.ok.length} items)
              </Typography>
              {scanResults.ok.map((item) => (
                <Box key={item.id} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{item.name}</strong> - Current: {item.current_stock}
                    , Par: {item.par_level}
                  </Typography>
                </Box>
              ))}
              {scanResults.ok.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No items in OK status
                </Typography>
              )}
            </Paper>

            {/* Par Items */}
            <Paper elevation={2} sx={{ p: 2, backgroundColor: "#e8f5e9" }}>
              <Typography variant="h6" color="success" gutterBottom>
                At Par ({scanResults.par.length} items)
              </Typography>
              {scanResults.par.map((item) => (
                <Box key={item.id} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{item.name}</strong> - Current: {item.current_stock}
                    , Par: {item.par_level}
                  </Typography>
                </Box>
              ))}
              {scanResults.par.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No items at par level
                </Typography>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanResultsOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Individual Items Dialog */}
      {selectedItemForDetails && (
        <IndividualItemsDialog
          open={individualItemsDialogOpen}
          onClose={() => {
            setIndividualItemsDialogOpen(false);
            setSelectedItemForDetails(null);
          }}
          itemId={selectedItemForDetails.itemId}
          itemName={selectedItemForDetails.itemName}
          locationId={selectedItemForDetails.locationId}
          locationName={selectedItemForDetails.locationName}
          onUpdate={fetchItems}
        />
      )}
    </Box>
  );
}
