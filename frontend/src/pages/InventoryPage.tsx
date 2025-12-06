/**
 * Inventory Page
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Snackbar,
  Tabs,
  Tab,
  Autocomplete,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  SwapHoriz as TransferIcon,
  Refresh as RefreshIcon,
  ShoppingCart,
  QrCodeScanner,
  LocalShipping,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import {
  itemsApi,
  Item,
  locationsApi,
  Location,
  inventoryApi,
  categoriesApi,
  Category,
  rfidApi,
  ReceiveStockResult,
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
    item_par_levels: {} as Record<
      string,
      { par_level: string; reorder_level: string }
    >,
  });
  const [scanResultsOpen, setScanResultsOpen] = useState(false);
  const [scanResults, setScanResults] = useState<{
    toBeOrdered: Item[];
    ok: Item[];
    par: Item[];
  }>({ toBeOrdered: [], ok: [], par: [] });

  // Restock Order state
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [restockLocationType, setRestockLocationType] = useState<
    "cabinet" | "truck"
  >("cabinet");

  // Single Station Restock Request state
  const [stationRestockDialogOpen, setStationRestockDialogOpen] =
    useState(false);
  const [selectedRestockStation, setSelectedRestockStation] =
    useState<string>("");

  // Individual Items dialog state
  const [individualItemsDialogOpen, setIndividualItemsDialogOpen] =
    useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<{
    itemId: string;
    itemName: string;
    locationId: string;
    locationName: string;
  } | null>(null);

  // Receive Stock dialog state (for Supply Station receiving)
  const [receiveStockDialogOpen, setReceiveStockDialogOpen] = useState(false);
  const [receivedItems, setReceivedItems] = useState<ReceiveStockResult[]>([]);
  const [receiveQuantity, setReceiveQuantity] = useState(1);
  const [receiveScanInput, setReceiveScanInput] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveMode, setReceiveMode] = useState<"scanner" | "manual">(
    "scanner"
  );
  const [manualSelectedItem, setManualSelectedItem] = useState<string>("");
  const [manualItemSearch, setManualItemSearch] = useState("");

  // Inventory Count mode (scanner vs manual)
  const [inventoryCountMode, setInventoryCountMode] = useState<
    "scanner" | "manual"
  >("scanner");
  const [manualCountItem, setManualCountItem] = useState<string>("");
  const [manualCountQty, setManualCountQty] = useState(1);
  const [manualCountSearch, setManualCountSearch] = useState("");

  // Scanner input buffer for keyboard wedge scanners
  const scannerBuffer = useRef<string>("");
  const scannerTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastScanTime = useRef<number>(0);

  // Audio feedback for scanning
  const playBeep = useCallback((success: boolean) => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = success ? 1000 : 400;
      oscillator.type = "sine";
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + (success ? 0.1 : 0.3));
    } catch (e) {
      // Audio not supported
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    fetchCategories();
    fetchItems();
  }, [selectedStation, selectedSubLocation]);

  // Keyboard listener for scanner input during scanning mode
  useEffect(() => {
    if (!isScanning && !receiveStockDialogOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const now = Date.now();

      // If it's Enter key, process the buffer
      if (e.key === "Enter") {
        e.preventDefault();
        if (scannerBuffer.current.length > 0) {
          const scannedCode = scannerBuffer.current;
          scannerBuffer.current = "";

          if (isScanning) {
            handleScanItem(scannedCode);
          } else if (receiveStockDialogOpen) {
            handleReceiveScan(scannedCode);
          }
        }
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();

        // If more than 100ms since last keystroke, start new buffer
        // (Manual typing is slow, scanner is fast)
        if (now - lastScanTime.current > 100) {
          scannerBuffer.current = "";
        }

        scannerBuffer.current += e.key;
        lastScanTime.current = now;

        // Clear any pending timeout
        if (scannerTimeout.current) {
          clearTimeout(scannerTimeout.current);
        }

        // Set timeout to process buffer if no Enter received
        scannerTimeout.current = setTimeout(() => {
          if (scannerBuffer.current.length >= 3) {
            const scannedCode = scannerBuffer.current;
            scannerBuffer.current = "";

            if (isScanning) {
              handleScanItem(scannedCode);
            } else if (receiveStockDialogOpen) {
              handleReceiveScan(scannedCode);
            }
          }
        }, 50);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (scannerTimeout.current) {
        clearTimeout(scannerTimeout.current);
      }
    };
  }, [isScanning, receiveStockDialogOpen]);

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
    const itemParLevels: Record<
      string,
      { par_level: string; reorder_level: string }
    > = {};
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
            par_level: itemValues.par_level
              ? parseInt(itemValues.par_level)
              : undefined,
            reorder_level: itemValues.reorder_level
              ? parseInt(itemValues.reorder_level)
              : undefined,
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
        `Updated par levels for ${updates.length} items across all ${
          bulkParForm.location_type === "cabinet" ? "cabinets" : "trucks"
        }. ` + `Created: ${totalCreated}, Updated: ${totalUpdated}`
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

  const navigate = useNavigate();

  const handleCreateRestockOrder = async () => {
    try {
      setError(null);

      // Get all location IDs based on type selected
      const selectedLocations = locations.filter((loc) => {
        if (restockLocationType === "cabinet") {
          return /^Station \d+$/.test(loc.name);
        } else {
          return /^Truck \d+$/.test(loc.name);
        }
      });

      if (selectedLocations.length === 0) {
        setError("No locations found for the selected type");
        return;
      }

      const response = await inventoryApi.createRestockOrder({
        location_ids: selectedLocations.map((loc) => loc.id),
      });

      // Handle new response format with multiple orders (one per location)
      const orders = response.data.orders || [];

      if (orders.length === 0) {
        setError("No items below par level found at the selected locations");
        return;
      }

      let messageLines = [
        response.data.message || `Created ${orders.length} restock order(s)`,
        "",
      ];

      orders.forEach((order: any) => {
        messageLines.push(
          `✓ ${order.order_number} - ${order.location}: ${order.total_items} items (${order.total_quantity} units)`
        );
      });

      setSuccess(messageLines.join("\n"));
      setRestockDialogOpen(false);

      // Navigate to restock orders page after a brief delay
      setTimeout(() => {
        navigate("/restock-orders");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create restock order");
      console.error("Error creating restock order:", err);
    }
  };

  const handleCreateSingleStationRestockOrder = async () => {
    try {
      setError(null);

      if (!selectedRestockStation) {
        setError("Please select a station");
        return;
      }

      // Find the selected location
      const selectedLocation = locations.find(
        (loc) => loc.id === selectedRestockStation
      );

      if (!selectedLocation) {
        setError("Invalid station selected");
        return;
      }

      const response = await inventoryApi.createRestockOrder({
        location_ids: [selectedRestockStation],
      });

      // Handle response
      const orders = response.data.orders || [];

      if (orders.length === 0) {
        setError(`No items below par level found at ${selectedLocation.name}`);
        return;
      }

      const order = orders[0];
      setSuccess(
        `✓ Restock request submitted for ${selectedLocation.name}\n\n` +
          `Order #: ${order.order_number}\n` +
          `Items: ${order.total_items}\n` +
          `Total Units Needed: ${order.total_quantity}`
      );
      setStationRestockDialogOpen(false);
      setSelectedRestockStation("");

      // Navigate to restock orders page after a brief delay
      setTimeout(() => {
        navigate("/restock-orders");
      }, 2500);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to submit restock request"
      );
      console.error("Error creating single station restock order:", err);
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
    setSuccess(
      "Scanning mode active - scan items with barcode scanner. Press any item barcode to count."
    );
    playBeep(true);
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
    playBeep(true);
  };

  // Handle manual count entry during inventory scanning
  const handleManualCountAdd = () => {
    if (!manualCountItem || manualCountQty < 1) return;

    const selectedItem = items.find((item) => item.id === manualCountItem);
    if (!selectedItem) return;

    // Use the item's barcode/SKU or ID as the key
    const itemKey =
      selectedItem.barcode ||
      selectedItem.sku ||
      selectedItem.rfid_tag ||
      selectedItem.id;

    const newScannedItems = new Map(scannedItems);
    const currentCount = newScannedItems.get(itemKey) || 0;
    newScannedItems.set(itemKey, currentCount + manualCountQty);
    setScannedItems(newScannedItems);
    setSuccess(
      `Added: ${selectedItem.name} x ${manualCountQty} (Total: ${
        currentCount + manualCountQty
      })`
    );
    playBeep(true);

    // Reset manual entry fields
    setManualCountItem("");
    setManualCountQty(1);
    setManualCountSearch("");
  };

  // Handle receiving stock into Supply Station
  const handleReceiveScan = async (barcode: string) => {
    if (!barcode.trim()) return;

    setIsReceiving(true);
    try {
      // Get Supply Station location ID
      const supplyStation = locations.find(
        (loc) => loc.name === "Supply Station"
      );

      const response = await rfidApi.receiveStock({
        barcode: barcode.trim(),
        quantity: receiveQuantity,
        location_id: supplyStation?.id,
      });

      const result = response.data;

      if (result.success) {
        playBeep(true);
        setSuccess(
          `✓ Received ${result.item?.quantity_received} x ${result.item?.name}`
        );
        setReceivedItems((prev) => [result, ...prev]);
        setReceiveScanInput("");
      } else {
        playBeep(false);
        setError(result.message || "Item not found");
      }
    } catch (err: any) {
      playBeep(false);
      setError(err.response?.data?.detail || "Failed to receive item");
    } finally {
      setIsReceiving(false);
    }
  };

  // Handle manual item receive (selecting from dropdown)
  const handleManualReceive = async () => {
    if (!manualSelectedItem) return;

    const selectedItem = items.find((item) => item.id === manualSelectedItem);
    if (!selectedItem) return;

    // Use the item's barcode/SKU or ID to receive
    const barcode = selectedItem.barcode || selectedItem.sku || selectedItem.id;
    await handleReceiveScan(barcode);
    setManualSelectedItem("");
  };

  const handleOpenReceiveStock = () => {
    setReceiveStockDialogOpen(true);
    setReceivedItems([]);
    setReceiveScanInput("");
    setReceiveQuantity(1);
    setReceiveMode("scanner");
    setManualSelectedItem("");
    setManualItemSearch("");
    setError(null);
    setSuccess(null);
  };

  const handleCloseReceiveStock = () => {
    setReceiveStockDialogOpen(false);
    // Refresh inventory to show updated counts
    fetchItems();
  };

  // Filter items for manual selection dropdown
  const filteredManualItems = items.filter(
    (item) =>
      manualItemSearch === "" ||
      item.name.toLowerCase().includes(manualItemSearch.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(manualItemSearch.toLowerCase()) ||
      item.sku?.toLowerCase().includes(manualItemSearch.toLowerCase())
  );

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
          sx={{ mb: 2, whiteSpace: "pre-line" }}
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

        {/* Inventory Count Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          {!isScanning ? (
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  handleStartScanning();
                  setInventoryCountMode("scanner");
                }}
                startIcon={<QrCodeScanner />}
              >
                Check Inventory (Scanner)
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  handleStartScanning();
                  setInventoryCountMode("manual");
                }}
                startIcon={<InventoryIcon />}
              >
                Check Inventory (Manual)
              </Button>
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

              <Button
                variant="outlined"
                color="info"
                onClick={() => setStationRestockDialogOpen(true)}
                startIcon={<ShoppingCart />}
              >
                Request Restock (My Station)
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={() => setRestockDialogOpen(true)}
                startIcon={<ShoppingCart />}
              >
                Create Restock Order (All)
              </Button>

              <Button
                variant="contained"
                color="warning"
                onClick={handleOpenReceiveStock}
                startIcon={<LocalShipping />}
              >
                Receive Stock (Supply Station)
              </Button>
            </Box>
          ) : (
            /* Active Scanning Mode */
            <Box>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  mb: 2,
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  label={
                    inventoryCountMode === "scanner"
                      ? "SCANNER MODE ACTIVE"
                      : "MANUAL COUNT MODE"
                  }
                  color="success"
                  icon={
                    inventoryCountMode === "scanner" ? (
                      <QrCodeScanner />
                    ) : (
                      <InventoryIcon />
                    )
                  }
                  sx={{ fontWeight: "bold" }}
                />
                <Typography variant="body2">
                  Counted {scannedItems.size} unique items (
                  {Array.from(scannedItems.values()).reduce((a, b) => a + b, 0)}{" "}
                  total)
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleStopScanning}
                >
                  Stop & View Results
                </Button>
              </Box>

              {/* Mode Tabs */}
              <Tabs
                value={inventoryCountMode}
                onChange={(_, newValue) => setInventoryCountMode(newValue)}
                sx={{ mb: 2 }}
              >
                <Tab
                  value="scanner"
                  label="Barcode Scanner"
                  icon={<QrCodeScanner />}
                  iconPosition="start"
                />
                <Tab
                  value="manual"
                  label="Manual Entry"
                  icon={<InventoryIcon />}
                  iconPosition="start"
                />
              </Tabs>

              {inventoryCountMode === "scanner" && (
                <Alert severity="info">
                  Scan items with your barcode scanner. Each scan adds 1 to the
                  count. Scanner input is automatically captured.
                </Alert>
              )}

              {inventoryCountMode === "manual" && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Search and select items to manually add to your inventory
                    count.
                  </Alert>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={7}>
                      <Autocomplete
                        options={items}
                        getOptionLabel={(option) =>
                          `${option.name} (${
                            option.item_code || option.sku || "N/A"
                          })`
                        }
                        value={
                          items.find((i) => i.id === manualCountItem) || null
                        }
                        onChange={(_, newValue) => {
                          setManualCountItem(newValue?.id || "");
                        }}
                        inputValue={manualCountSearch}
                        onInputChange={(_, newInputValue) => {
                          setManualCountSearch(newInputValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Search and Select Item"
                            placeholder="Type to search items..."
                            size="small"
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <InputAdornment position="start">
                                    <SearchIcon />
                                  </InputAdornment>
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <li {...props} key={option.id}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {option.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {option.item_code} |{" "}
                                {option.category_name || "No Category"}
                              </Typography>
                            </Box>
                          </li>
                        )}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <TextField
                        fullWidth
                        label="Qty"
                        type="text"
                        inputMode="numeric"
                        size="small"
                        value={manualCountQty}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setManualCountQty(Math.max(1, parseInt(val) || 1));
                        }}
                        inputProps={{ pattern: "[0-9]*", min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleManualCountAdd}
                        disabled={!manualCountItem}
                      >
                        Add to Count
                      </Button>
                    </Grid>
                  </Grid>

                  {/* Show currently counted items */}
                  {scannedItems.size > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Items Counted:
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {Array.from(scannedItems.entries()).map(
                          ([key, count]) => {
                            const item = items.find(
                              (i) =>
                                i.barcode === key ||
                                i.sku === key ||
                                i.rfid_tag === key ||
                                i.id === key
                            );
                            return (
                              <Chip
                                key={key}
                                label={`${item?.name || key}: ${count}`}
                                size="small"
                                onDelete={() => {
                                  const newScanned = new Map(scannedItems);
                                  newScanned.delete(key);
                                  setScannedItems(newScanned);
                                }}
                              />
                            );
                          }
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Paper>

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
                type="text"
                inputMode="decimal"
                label="Unit Cost ($)"
                value={editForm.unit_cost}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setEditForm({
                    ...editForm,
                    unit_cost: parseFloat(val) || 0,
                  });
                }}
                inputProps={{ pattern: "[0-9.]*", step: 0.01 }}
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
              Set par and reorder levels for each item. Values will be applied
              to all{" "}
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
                  <Box
                    key={itemId}
                    sx={{ mb: 3, pb: 2, borderBottom: "1px solid #eee" }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 2, fontWeight: "bold" }}
                    >
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
                          type="text"
                          inputMode="numeric"
                          value={
                            bulkParForm.item_par_levels[itemId]?.par_level || ""
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setBulkParForm({
                              ...bulkParForm,
                              item_par_levels: {
                                ...bulkParForm.item_par_levels,
                                [itemId]: {
                                  ...bulkParForm.item_par_levels[itemId],
                                  par_level: val,
                                },
                              },
                            });
                          }}
                          inputProps={{ pattern: "[0-9]*" }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Reorder Level"
                          type="text"
                          inputMode="numeric"
                          value={
                            bulkParForm.item_par_levels[itemId]
                              ?.reorder_level || ""
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setBulkParForm({
                              ...bulkParForm,
                              item_par_levels: {
                                ...bulkParForm.item_par_levels,
                                [itemId]: {
                                  ...bulkParForm.item_par_levels[itemId],
                                  reorder_level: val,
                                },
                              },
                            });
                          }}
                          inputProps={{ pattern: "[0-9]*" }}
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
          <Button onClick={handleBulkParSubmit} variant="contained">
            Update Par Levels
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Restock Order Dialog */}
      <Dialog
        open={restockDialogOpen}
        onClose={() => setRestockDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Restock Order</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              This will analyze all items below par level at the selected
              locations and create a purchase order for the logistics
              coordinator to fulfill.
            </Typography>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Location Type</InputLabel>
              <Select
                value={restockLocationType}
                label="Location Type"
                onChange={(e) =>
                  setRestockLocationType(e.target.value as "cabinet" | "truck")
                }
              >
                <MenuItem value="cabinet">All Cabinets (Station 1-11)</MenuItem>
                <MenuItem value="truck">All Trucks (Truck 1-11)</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mt: 3 }}>
              The system will check all{" "}
              {restockLocationType === "cabinet" ? "cabinets" : "trucks"} and
              create an order for items that are below par level.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestockDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateRestockOrder}
            variant="contained"
            color="success"
            startIcon={<ShoppingCart />}
          >
            Create Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Single Station Restock Request Dialog */}
      <Dialog
        open={stationRestockDialogOpen}
        onClose={() => setStationRestockDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Request Restock for Your Station</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              Select your station to request a restock. The system will check
              all items below par level and create a restock order for the
              logistics coordinator to fulfill.
            </Typography>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select Your Station</InputLabel>
              <Select
                value={selectedRestockStation}
                label="Select Your Station"
                onChange={(e) => setSelectedRestockStation(e.target.value)}
              >
                {locations
                  .filter((loc) => /^Station \d+$/.test(loc.name))
                  .sort((a, b) => {
                    // Sort numerically by station number
                    const aNum = parseInt(a.name.match(/\d+/)?.[0] || "0");
                    const bNum = parseInt(b.name.match(/\d+/)?.[0] || "0");
                    return aNum - bNum;
                  })
                  .map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {selectedRestockStation && (
              <Alert severity="info" sx={{ mt: 3 }}>
                Clicking "Submit Request" will create a restock order for{" "}
                <strong>
                  {locations.find((l) => l.id === selectedRestockStation)?.name}
                </strong>{" "}
                containing all items currently below par level.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setStationRestockDialogOpen(false);
              setSelectedRestockStation("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateSingleStationRestockOrder}
            variant="contained"
            color="info"
            disabled={!selectedRestockStation}
            startIcon={<ShoppingCart />}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receive Stock Dialog (Supply Station) */}
      <Dialog
        open={receiveStockDialogOpen}
        onClose={handleCloseReceiveStock}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LocalShipping color="warning" />
          Receive Stock into Supply Station
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Mode Tabs */}
            <Tabs
              value={receiveMode}
              onChange={(_, newValue) => setReceiveMode(newValue)}
              sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
            >
              <Tab
                value="scanner"
                label="Barcode Scanner"
                icon={<QrCodeScanner />}
                iconPosition="start"
              />
              <Tab
                value="manual"
                label="Manual Entry"
                icon={<InventoryIcon />}
                iconPosition="start"
              />
            </Tabs>

            {/* Scanner Mode */}
            {receiveMode === "scanner" && (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Scan item barcodes to receive them into Supply Station
                  inventory. The scanner will automatically capture input when
                  this dialog is open.
                </Alert>

                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={8}>
                    <TextField
                      fullWidth
                      label="Scan or Enter Barcode"
                      value={receiveScanInput}
                      onChange={(e) => setReceiveScanInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleReceiveScan(receiveScanInput);
                        }
                      }}
                      placeholder="Barcode will appear here when scanned..."
                      disabled={isReceiving}
                      autoFocus
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <QrCodeScanner />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      label="Qty"
                      type="text"
                      inputMode="numeric"
                      value={receiveQuantity}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setReceiveQuantity(Math.max(1, parseInt(val) || 1));
                      }}
                      inputProps={{ pattern: "[0-9]*", min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleReceiveScan(receiveScanInput)}
                      disabled={!receiveScanInput.trim() || isReceiving}
                      sx={{ height: 56 }}
                    >
                      {isReceiving ? <CircularProgress size={24} /> : "Add"}
                    </Button>
                  </Grid>
                </Grid>
              </>
            )}

            {/* Manual Entry Mode */}
            {receiveMode === "manual" && (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Search and select items from the list to manually add them to
                  Supply Station inventory.
                </Alert>

                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={8}>
                    <Autocomplete
                      options={filteredManualItems}
                      getOptionLabel={(option) =>
                        `${option.name} (${
                          option.item_code || option.sku || "N/A"
                        })`
                      }
                      value={
                        items.find((i) => i.id === manualSelectedItem) || null
                      }
                      onChange={(_, newValue) => {
                        setManualSelectedItem(newValue?.id || "");
                      }}
                      inputValue={manualItemSearch}
                      onInputChange={(_, newInputValue) => {
                        setManualItemSearch(newInputValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Search and Select Item"
                          placeholder="Type to search items..."
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <SearchIcon />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {option.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {option.item_code} |{" "}
                              {option.category_name || "No Category"} |{" "}
                              {option.unit_of_measure}
                            </Typography>
                          </Box>
                        </li>
                      )}
                      isOptionEqualToValue={(option, value) =>
                        option.id === value.id
                      }
                      disabled={isReceiving}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      label="Qty"
                      type="text"
                      inputMode="numeric"
                      value={receiveQuantity}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setReceiveQuantity(Math.max(1, parseInt(val) || 1));
                      }}
                      inputProps={{ pattern: "[0-9]*", min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleManualReceive}
                      disabled={!manualSelectedItem || isReceiving}
                      sx={{ height: 56 }}
                    >
                      {isReceiving ? <CircularProgress size={24} /> : "Add"}
                    </Button>
                  </Grid>
                </Grid>
              </>
            )}

            {/* Received Items List */}
            {receivedItems.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Received Items ({receivedItems.length})
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="center">Qty Received</TableCell>
                        <TableCell align="center">New Total</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {receivedItems.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {result.item?.name || "Unknown"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {result.item?.item_code}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`+${result.item?.quantity_received || 0}`}
                              color="success"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {result.item?.new_quantity_on_hand || 0}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={result.success ? "Received" : "Error"}
                              color={result.success ? "success" : "error"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flex: 1, ml: 2 }}
          >
            Total items received:{" "}
            {receivedItems.filter((r) => r.success).length}
          </Typography>
          <Button onClick={handleCloseReceiveStock} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
