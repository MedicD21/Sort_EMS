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
  Checkbox,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
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
  categoriesApi,
  Category,
} from "../services/apiService";
import { IndividualItemsDialog } from "../components/IndividualItemsDialog";

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    category_id: "",
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
    truck_location: "", // For when transferring TO a truck
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

  // Bulk Par Level Edit state
  const [bulkParDialogOpen, setBulkParDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkParForm, setBulkParForm] = useState({
    location_type: "cabinet" as "cabinet" | "truck",
    item_par_levels: {} as Record<string, { par_level: string; reorder_level: string }>,
  });
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
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const response = await categoriesApi.list();
      setCategories(response.data);
    } catch (err: any) {
      console.error("Error fetching categories:", err);
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
            const locationName = `Station ${stationNum}`; // Fixed: actual DB name
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
            const locationName = `Truck ${stationNum}`; // Fixed: actual DB name
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
    // Block editing in Master View (overview only)
    if (selectedStation === "all") {
      setError(
        "Cannot edit items in Master View. Please select a specific location (Supply Station, Station Cabinet, or Truck)."
      );
      return;
    }

    // Don't allow editing when viewing Cabinet + Truck combined (can't update two locations at once)
    if (selectedStation !== "supply_station" && selectedSubLocation === "all") {
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
      category_id: item.category_id || "",
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
      // Priority: 1) Item's existing location_id, 2) Currently selected location
      let locationIdToUpdate = editingItem.location_id;

      // If item doesn't have a location_id, try to get from current view
      if (!locationIdToUpdate && selectedStation !== "all") {
        let locationName = "";
        if (selectedStation === "supply_station") {
          locationName = "Supply Station";
        } else {
          const stationNum = selectedStation.replace("station_", "");
          if (selectedSubLocation === "cabinet") {
            locationName = `Station ${stationNum}`; // Fixed: removed " Cabinet"
          } else if (selectedSubLocation === "truck") {
            locationName = `Truck ${stationNum}`; // Fixed: format matches DB
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

      // In Master View, item should have location_id from API
      // If still no location_id, only update item details (not inventory)
      console.log("Updating item with location_id:", locationIdToUpdate);
      console.log("Current stock value:", editForm.current_stock);
      console.log("editingItem.location_id:", editingItem.location_id);

      // Build update object - ALWAYS include all fields
      const updateData: any = {
        name: editForm.name,
        sku: editForm.supply_station_location,
        unit_cost: editForm.unit_cost,
        category_id: editForm.category_id || undefined,
        current_stock: editForm.current_stock,
        par_level: editForm.par_level,
        reorder_level: editForm.reorder_level,
        expiration_date: editForm.expiration_date || undefined,
      };

      // Include location_id if available
      if (locationIdToUpdate) {
        updateData.location_id = locationIdToUpdate;
      }

      console.log("Sending update data:", updateData);

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
          currentLocationName = `Station ${stationNum}`; // Fixed: actual DB name
        } else if (selectedSubLocation === "truck") {
          currentLocationName = `Truck ${stationNum}`; // Fixed: actual DB name
        }
      }
    }

    // Determine valid transfer destinations based on location rules:
    // - ONLY allow transfers between Cabinet ↔ Truck (same station number)
    // - Supply Station and other transfers are NOT allowed
    const validLocations: Location[] = [];

    if (currentLocationName?.startsWith("Station ")) {
      // Station cabinet can only transfer to its truck
      const stationMatch = currentLocationName.match(/Station (\d+)/);
      if (stationMatch) {
        const stationNum = stationMatch[1];
        const truck = locations.find(
          (loc) => loc.name === `Truck ${stationNum}`
        );
        if (truck) validLocations.push(truck);
      }
    } else if (currentLocationName?.startsWith("Truck ")) {
      // Truck can only transfer back to its station cabinet
      const truckMatch = currentLocationName.match(/Truck (\d+)/);
      if (truckMatch) {
        const stationNum = truckMatch[1];
        const cabinet = locations.find(
          (loc) => loc.name === `Station ${stationNum}`
        );
        if (cabinet) validLocations.push(cabinet);
      }
    }
    // Supply Station transfers are disabled

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

  // Bulk Par Level handlers
  const handleToggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAllItems = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleOpenBulkParDialog = () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one item");
      return;
    }
    
    // Initialize par levels for each selected item
    const itemParLevels: Record<string, { par_level: string; reorder_level: string }> = {};
    selectedItems.forEach((itemId) => {
      itemParLevels[itemId] = { par_level: "", reorder_level: "" };
    });
    
    setBulkParForm({
      location_type: "cabinet",
      item_par_levels: itemParLevels,
    });
    setBulkParDialogOpen(true);
  };

  const handleBulkParSubmit = async () => {
    try {
      // Determine location IDs based on location type (cabinet or truck)
      const locationIds = locations
        .filter((loc) => {
          if (bulkParForm.location_type === "cabinet") {
            // Match "Station 1" through "Station 11" (cabinets)
            return /^Station \d+$/.test(loc.name);
          } else {
            // Match "Truck 1" through "Truck 11" (trucks)
            return /^Truck \d+$/.test(loc.name);
          }
        })
        .map((loc) => loc.id);

      if (locationIds.length === 0) {
        alert("No locations found for the selected type");
        return;
      }

      // Prepare updates for each item
      const updates = [];
      for (const itemId of selectedItems) {
        const itemValues = bulkParForm.item_par_levels[itemId];
        if (itemValues && (itemValues.par_level || itemValues.reorder_level)) {
          const data = {
            item_ids: [itemId],
            location_ids: locationIds,
            par_level: itemValues.par_level ? parseInt(itemValues.par_level) : undefined,
            reorder_level: itemValues.reorder_level ? parseInt(itemValues.reorder_level) : undefined,
          };
          updates.push(inventoryApi.bulkUpdateParLevels(data));
        }
      }

      if (updates.length === 0) {
        alert("Please enter at least one par or reorder level");
        return;
      }

      // Execute all updates
      const results = await Promise.all(updates);
      const totalCreated = results.reduce((sum, r) => sum + r.data.created, 0);
      const totalUpdated = results.reduce((sum, r) => sum + r.data.updated, 0);

      setSuccess(
        `Updated par levels for ${updates.length} items across all ${bulkParForm.location_type === "cabinet" ? "cabinets" : "trucks"}. ` +
          `Created: ${totalCreated}, Updated: ${totalUpdated}`
      );

      setBulkParDialogOpen(false);
      setBulkParForm({
        location_type: "cabinet",
        item_par_levels: {},
      });
      setSelectedItems(new Set());
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update par levels");
      console.error("Error updating par levels:", err);
    }
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
          locationName = `Station ${stationNum}`; // Fixed: actual DB name
        } else if (selectedSubLocation === "truck") {
          locationName = `Truck ${stationNum}`; // Fixed: actual DB name
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
        <Box
          sx={{
            mb: 3,
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
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

          {selectedItems.size > 0 && (
            <Chip
              label={`${selectedItems.size} items selected`}
              color="primary"
              onDelete={() => setSelectedItems(new Set())}
            />
          )}

          <Button
            variant="contained"
            color="secondary"
            onClick={handleOpenBulkParDialog}
            disabled={selectedItems.size === 0}
          >
            Bulk Edit Par Levels ({selectedItems.size})
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
                  <TableRow sx={{ backgroundColor: "#1a1a1a" }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={
                          selectedItems.size > 0 &&
                          selectedItems.size === filteredItems.length
                        }
                        indeterminate={
                          selectedItems.size > 0 &&
                          selectedItems.size < filteredItems.length
                        }
                        onChange={handleSelectAllItems}
                      />
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontSize: "1rem", fontWeight: 600 }}
                    >
                      Stock Location
                    </TableCell>
                    <TableCell sx={{ fontSize: "1rem", fontWeight: 600 }}>
                      Item Name
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontSize: "1rem", fontWeight: 600 }}
                    >
                      Category
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontSize: "1rem", fontWeight: 600 }}
                    >
                      Current Location
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontSize: "1rem", fontWeight: 600 }}
                    >
                      Current Stock
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontSize: "1rem", fontWeight: 600 }}
                    >
                      Par Level
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontSize: "1rem", fontWeight: 600 }}
                    >
                      Reorder Level
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontSize: "1rem", fontWeight: 600 }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontSize: "1rem", fontWeight: 600 }}
                    >
                      Expiration
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontSize: "1rem", fontWeight: 600 }}
                    >
                      Actions
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
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onChange={() => handleToggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body1"
                            fontWeight="medium"
                            sx={{ fontSize: "0.95rem" }}
                          >
                            {item.sku || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body1"
                            fontWeight="medium"
                            sx={{
                              cursor: "pointer",
                              color: "#64b5f6",
                              fontSize: "0.95rem",
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
                              sx={{ fontSize: "0.8rem" }}
                            >
                              {item.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body1"
                            sx={{ fontSize: "0.95rem" }}
                          >
                            {item.category_name || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body1"
                            sx={{ fontSize: "0.95rem" }}
                          >
                            {item.location_name || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body1"
                            fontWeight="medium"
                            sx={{ fontSize: "1rem" }}
                          >
                            {item.current_stock} {item.unit_of_measure}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body1"
                            sx={{ fontSize: "0.95rem" }}
                          >
                            {item.par_level !== null &&
                            item.par_level !== undefined
                              ? item.par_level
                              : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body1"
                            sx={{ fontSize: "0.95rem" }}
                          >
                            {item.reorder_level !== null &&
                            item.reorder_level !== undefined
                              ? item.reorder_level
                              : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {status && (
                            <Chip
                              label={status.label}
                              color={status.color}
                              size="medium"
                              sx={{ fontSize: "0.85rem", fontWeight: 500 }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {expirationChips.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                flexWrap: "wrap",
                                justifyContent: "center",
                              }}
                            >
                              {expirationChips.map((chip, idx) => (
                                <Chip
                                  key={idx}
                                  label={chip.text}
                                  color={chip.color as any}
                                  size="medium"
                                  variant="filled"
                                  sx={{
                                    fontWeight: "bold",
                                    fontSize: "0.85rem",
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
                            <Typography
                              variant="body1"
                              color="text.secondary"
                              sx={{ fontSize: "0.95rem" }}
                            >
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="medium"
                            onClick={() => handleEditClick(item)}
                            title="Edit Item"
                            color="primary"
                          >
                            <EditIcon fontSize="medium" />
                          </IconButton>
                          <IconButton
                            size="medium"
                            onClick={() => handleTransferClick(item)}
                            title="Transfer to Another Location"
                            color="secondary"
                          >
                            <TransferIcon fontSize="medium" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        <Typography
                          variant="body1"
                          color="text.secondary"
                          sx={{ py: 3, fontSize: "1rem" }}
                        >
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
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={editForm.category_id}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category_id: e.target.value })
                  }
                  label="Category"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
              <Paper elevation={2} sx={{ p: 2, backgroundColor: "#2a2a2a" }}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ color: "#b0bec5" }}
                >
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
                    sx={{
                      "& .MuiInputBase-root": {
                        backgroundColor: "#1e1e1e",
                        color: "#fff",
                      },
                      "& .MuiInputBase-input::placeholder": {
                        color: "#757575",
                        opacity: 1,
                      },
                    }}
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
                    sx={{
                      p: 2,
                      backgroundColor: "#1e3a5f",
                      borderLeft: "4px solid #2196f3",
                    }}
                  >
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ color: "#fff" }}
                    >
                      {transferItem.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#b0bec5" }}>
                      Current Location:{" "}
                      {transferItem.location_name || "Unknown"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#b0bec5" }}>
                      Available: {transferItem.current_stock}{" "}
                      {transferItem.unit_of_measure}
                    </Typography>
                    {transferItem.rfid_tag && (
                      <Typography variant="body2" sx={{ color: "#90caf9" }}>
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

                {/* Show truck location field when transferring TO a truck */}
                {transferForm.to_location_id &&
                  locations
                    .find((loc) => loc.id === transferForm.to_location_id)
                    ?.name.startsWith("Truck") && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Truck Location (Required)"
                        value={transferForm.truck_location}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            truck_location: e.target.value,
                          })
                        }
                        placeholder="e.g., Bag A, Shelf 1, Cabinet B"
                        helperText="Specify where on the truck these items will be stored"
                        required
                      />
                    </Grid>
                  )}

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

      {/* Bulk Par Level Edit Dialog */}
      <Dialog
        open={bulkParDialogOpen}
        onClose={() => setBulkParDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Bulk Edit Par Levels - {selectedItems.size} Items Selected
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              Set par and reorder levels for each item. Values will be applied to all{" "}
              {bulkParForm.location_type === "cabinet" ? "cabinets" : "trucks"}.
            </Typography>

            {/* Location Type Selector */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Apply To</InputLabel>
              <Select
                value={bulkParForm.location_type}
                label="Apply To"
                onChange={(e) =>
                  setBulkParForm({
                    ...bulkParForm,
                    location_type: e.target.value as "cabinet" | "truck",
                  })
                }
              >
                <MenuItem value="cabinet">All Cabinets (Station 1-11)</MenuItem>
                <MenuItem value="truck">All Trucks (Truck 1-11)</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ mb: 2 }} />

            {/* List each selected item with its own inputs */}
            <Paper sx={{ maxHeight: 400, overflow: "auto", p: 2 }}>
              {Array.from(selectedItems).map((itemId) => {
                const item = items.find((i) => i.id === itemId);
                if (!item) return null;

                return (
                  <Box key={itemId} sx={{ mb: 3, pb: 2, borderBottom: "1px solid #eee" }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: "bold" }}>
                      {item.name}
                      <Chip
                        label={item.category_name || "No Category"}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Par Level"
                          type="number"
                          value={bulkParForm.item_par_levels[itemId]?.par_level || ""}
                          onChange={(e) =>
                            setBulkParForm({
                              ...bulkParForm,
                              item_par_levels: {
                                ...bulkParForm.item_par_levels,
                                [itemId]: {
                                  ...bulkParForm.item_par_levels[itemId],
                                  par_level: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Reorder Level"
                          type="number"
                          value={bulkParForm.item_par_levels[itemId]?.reorder_level || ""}
                          onChange={(e) =>
                            setBulkParForm({
                              ...bulkParForm,
                              item_par_levels: {
                                ...bulkParForm.item_par_levels,
                                [itemId]: {
                                  ...bulkParForm.item_par_levels[itemId],
                                  reorder_level: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkParDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBulkParSubmit}
            variant="contained"
          >
            Update Par Levels
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
