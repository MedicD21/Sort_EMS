/**
 * API service functions for all backend endpoints
 */
import { apiClient } from "./api";

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authApi = {
  login: (credentials: LoginCredentials) => {
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);
    return apiClient.post<AuthResponse>("/api/v1/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>("/api/v1/auth/refresh", {
      refresh_token: refreshToken,
    }),

  me: () => apiClient.get("/api/v1/auth/me"),
};

// ============================================================================
// ITEMS
// ============================================================================

export interface Item {
  id: string;
  name: string;
  description?: string;
  sku: string;
  category?: string;
  category_id?: string;
  category_name?: string;
  unit_of_measure: string;
  unit_cost?: number;
  current_stock: number;
  par_level?: number;
  reorder_level?: number;
  location_name?: string;
  location_id?: string;
  rfid_tag?: string;
  is_active: boolean;
  expiration_date?: string;
  expiring_soon_count?: number;
  expired_count?: number;
  // Supplier info
  supplier_name?: string;
  supplier_contact?: string;
  supplier_email?: string;
  supplier_phone?: string;
  supplier_website?: string;
  supplier_account_number?: string;
  // Ordering info
  minimum_order_quantity?: number;
  max_reorder_quantity_per_station?: number;
  order_unit?: string;
  lead_time_days?: number;
  preferred_vendor?: string;
  alternate_vendor?: string;
  // Manufacturer
  manufacturer?: string;
  manufacturer_part_number?: string;
  barcode?: string;
  // Flags
  is_controlled_substance?: boolean;
  requires_prescription?: boolean;
  requires_expiration_tracking?: boolean;
}

export const itemsApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    category_id?: string;
    search?: string;
  }) => apiClient.get<Item[]>("/api/v1/items", { params }),

  get: (id: string) => apiClient.get<Item>(`/api/v1/items/${id}`),

  create: (data: Partial<Item>) => apiClient.post<Item>("/api/v1/items", data),

  update: (id: string, data: Partial<Item>) =>
    apiClient.put<Item>(`/api/v1/items/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/v1/items/${id}`),
};

// ============================================================================
// CATEGORIES
// ============================================================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export const categoriesApi = {
  list: (params?: { skip?: number; limit?: number; active_only?: boolean }) =>
    apiClient.get<Category[]>("/api/v1/categories", { params }),

  get: (id: string) => apiClient.get<Category>(`/api/v1/categories/${id}`),

  create: (data: Partial<Category> & { id: string; name: string }) =>
    apiClient.post<Category>("/api/v1/categories", data),

  update: (id: string, data: Partial<Category>) =>
    apiClient.put<Category>(`/api/v1/categories/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/v1/categories/${id}`),
};

// ============================================================================
// LOCATIONS
// ============================================================================

export interface Location {
  id: string;
  name: string;
  type: "supply_station" | "station_cabinet" | "vehicle";
  parent_location_id?: string;
  is_active: boolean;
  child_count?: number;
}

export const locationsApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    apiClient.get<Location[]>("/api/v1/locations/", { params }),

  get: (id: string) => apiClient.get<Location>(`/api/v1/locations/${id}`),

  hierarchy: () => apiClient.get("/api/v1/locations/hierarchy"),

  inventory: (id: string) => apiClient.get(`/api/v1/locations/${id}/inventory`),

  create: (data: Partial<Location>) =>
    apiClient.post<Location>("/api/v1/locations", data),

  update: (id: string, data: Partial<Location>) =>
    apiClient.put<Location>(`/api/v1/locations/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/v1/locations/${id}`),
};

// ============================================================================
// INVENTORY
// ============================================================================

export interface InventoryItem {
  id: string;
  location_id: string;
  item_id: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  quantity_available: number;
  item_name: string;
  item_code: string;
  location_name: string;
  unit_of_measure: string;
}

export interface PhysicalCount {
  item_id: string;
  location_id: string;
  counted_quantity: number;
  notes?: string;
}

export interface Transfer {
  item_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  notes?: string;
}

export interface ExpiringItem {
  id: number;
  item_id: string;
  location_id: string;
  rfid_tag: string;
  expiration_date: string;
  lot_number?: string;
  days_until_expiration: number;
  item_name: string;
  item_code: string;
  location_name: string;
  category_name?: string;
}

export const inventoryApi = {
  list: (params?: {
    location_id?: string;
    item_id?: string;
    low_stock?: boolean;
  }) => apiClient.get<InventoryItem[]>("/api/v1/inventory", { params }),

  physicalCount: (data: PhysicalCount) =>
    apiClient.post("/api/v1/inventory/count", data),

  transfer: (data: Transfer) =>
    apiClient.post("/api/v1/inventory/transfer", data),

  movements: (params?: {
    days?: number;
    location_id?: string;
    item_id?: string;
  }) => apiClient.get("/api/v1/inventory/movements", { params }),

  bulkUpdateParLevels: (data: {
    item_ids: string[];
    location_ids: string[];
    par_level?: number;
    reorder_level?: number;
  }) => apiClient.post("/api/v1/inventory/bulk-par-levels", data),

  expiringItems: (params?: {
    days_ahead?: number;
    location_id?: string;
    skip?: number;
    limit?: number;
  }) => apiClient.get("/api/v1/inventory/expiring-items", { params }),

  expiredItems: (params?: {
    location_id?: string;
    skip?: number;
    limit?: number;
  }) => apiClient.get("/api/v1/inventory/expired-items", { params }),

  createRestockOrder: (data: {
    location_ids: string[];
    vendor_id?: string;
    notes?: string;
  }) => apiClient.post("/api/v1/inventory/create-restock-order", data),
};

// ============================================================================
// INTERNAL ORDERS (Restock Orders)
// ============================================================================

export interface InternalOrder {
  id: string;
  order_number: string;
  status: string;
  order_date: string;
  completed_date?: string;
  total_items: number;
  total_quantity: number;
  created_by_name?: string;
  location_summary: string;
  notes?: string;
}

export interface InternalOrderDetail {
  id: string;
  order_number: string;
  status: string;
  order_date: string;
  completed_date?: string;
  created_by_name?: string;
  notes?: string;
  items: Array<{
    item_id: string;
    item_name: string;
    item_code: string;
    total_quantity: number;
    locations: Array<{
      location_id: string;
      location_name: string;
      quantity_needed: number;
      quantity_delivered: number;
      current_stock: number;
      par_level: number;
    }>;
  }>;
}

export const internalOrdersApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) =>
    apiClient.get<InternalOrder[]>("/api/v1/internal-orders", { params }),

  get: (orderId: string) =>
    apiClient.get<InternalOrderDetail>(`/api/v1/internal-orders/${orderId}`),

  updateStatus: (orderId: string, status: string) =>
    apiClient.patch(`/api/v1/internal-orders/${orderId}/status`, null, {
      params: { status },
    }),

  bulkUpdateStatus: (orderIds: string[], status: string) =>
    apiClient.patch(`/api/v1/internal-orders/bulk-status`, {
      order_ids: orderIds,
      status,
    }),

  delete: (orderId: string) =>
    apiClient.delete(`/api/v1/internal-orders/${orderId}`),
};

// ============================================================================
// RFID / SCANNER
// ============================================================================

export interface ScanData {
  tag_id: string;
  scanner_location_id?: string;
  scan_type?: "barcode" | "rfid";
}

export interface LinkTagData {
  tag_id: string;
  item_id: string;
  location_id: string;
  lot_number?: string;
  expiration_date?: string;
}

export interface MoveByScanData {
  tag_id: string;
  to_location_id: string;
  quantity?: number;
  notes?: string;
}

export interface ReceiveStockData {
  barcode: string;
  quantity: number;
  location_id?: string;
  lot_number?: string;
  expiration_date?: string;
  purchase_order_id?: string;
}

export interface BatchScanItem {
  barcode: string;
  quantity: number;
}

export interface BatchScanData {
  items: BatchScanItem[];
  location_id: string;
  scan_type?: "receive" | "count" | "transfer";
}

export interface InventoryCountResult {
  item_id?: string;
  item_name: string;
  item_code?: string;
  barcode?: string;
  scanned_quantity: number;
  system_quantity: number;
  par_level?: number;
  reorder_level?: number;
  variance: number;
  status:
    | "ok"
    | "low"
    | "critical"
    | "over"
    | "under"
    | "missing"
    | "not_found";
}

export interface RFIDScanResult {
  success: boolean;
  tag_info?: {
    id: string;
    tag_id: string;
    item_id: string;
    current_location_id?: string;
    status: string;
    lot_number?: string;
    expiration_date?: string;
    item_name: string;
    item_code: string;
    location_name?: string;
    unit_of_measure: string;
  };
  item_info?: {
    name: string;
    code: string;
    description?: string;
    current_location?: string;
    quantity_on_hand?: number;
    is_controlled_substance?: boolean;
    expiration_date?: string;
    lot_number?: string;
  };
  message: string;
  suggested_action?: string;
}

export interface ReceiveStockResult {
  success: boolean;
  message: string;
  item?: {
    id: string;
    name: string;
    item_code: string;
    unit_of_measure: string;
    quantity_received: number;
    new_quantity_on_hand: number;
  };
  location?: string;
  movement_id?: string;
  suggested_action?: string;
}

export const rfidApi = {
  // Basic scanning
  scan: (data: ScanData) =>
    apiClient.post<RFIDScanResult>("/api/v1/rfid/scan", data),

  linkTag: (data: LinkTagData) => apiClient.post("/api/v1/rfid/link", data),

  moveItem: (data: MoveByScanData) => apiClient.post("/api/v1/rfid/move", data),

  // Stock receiving (Supply Station workflow)
  receiveStock: (data: ReceiveStockData) =>
    apiClient.post<ReceiveStockResult>("/api/v1/rfid/receive-stock", data),

  batchReceive: (data: BatchScanData) =>
    apiClient.post("/api/v1/rfid/batch-receive", data),

  // Inventory counting
  inventoryCount: (locationId: string, scannedItems: Record<string, number>) =>
    apiClient.post<{
      location: string;
      total_items_scanned: number;
      total_items_in_system: number;
      items_with_variance: number;
      results: InventoryCountResult[];
    }>("/api/v1/rfid/inventory-count", scannedItems, {
      params: { location_id: locationId },
    }),

  adjustInventory: (
    locationId: string,
    adjustments: Array<{ item_id: string; new_quantity: number }>,
    reason?: string
  ) =>
    apiClient.post("/api/v1/rfid/adjust-inventory", adjustments, {
      params: {
        location_id: locationId,
        reason: reason || "Inventory count adjustment",
      },
    }),

  // Tag management
  getTagInfo: (tagId: string) => apiClient.get(`/api/v1/rfid/${tagId}`),

  getItemTags: (itemId: string, status?: string) =>
    apiClient.get(`/api/v1/rfid/item/${itemId}/tags`, { params: { status } }),
};

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export interface Vendor {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderItem {
  id: string;
  item_id: string;
  item_name?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost?: number;
  total_cost?: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor_name?: string;
  status:
    | "pending"
    | "ordered"
    | "shipped"
    | "partial"
    | "received"
    | "cancelled";
  order_date: string;
  expected_delivery_date?: string;
  received_date?: string;
  total_cost?: number;
  items: PurchaseOrderItem[];
  created_at: string;
  // Tracking fields
  tracking_number?: string;
  carrier?: "ups" | "fedex" | "usps" | "dhl" | "amazon" | "ontrac" | "other";
  carrier_other?: string;
  shipped_date?: string;
  tracking_url?: string;
  tracking_link?: string;
  shipping_notes?: string;
}

export interface OrderItemCreate {
  item_id: string;
  quantity_ordered: number;
  unit_cost?: number;
}

export interface CreateOrder {
  vendor_id: string;
  po_number: string;
  items: OrderItemCreate[];
  expected_delivery_date?: string;
}

export interface UpdateOrder {
  status?:
    | "pending"
    | "ordered"
    | "shipped"
    | "partial"
    | "received"
    | "cancelled";
  expected_delivery_date?: string;
  received_date?: string;
}

export interface TrackingUpdate {
  tracking_number?: string;
  carrier?: "ups" | "fedex" | "usps" | "dhl" | "amazon" | "ontrac" | "other";
  carrier_other?: string;
  shipped_date?: string;
  tracking_url?: string;
  shipping_notes?: string;
}

export interface TrackingInfo {
  tracking_number?: string;
  carrier?: string;
  carrier_other?: string;
  carrier_display?: string;
  shipped_date?: string;
  tracking_url?: string;
  tracking_link?: string;
  shipping_notes?: string;
}

export interface ReceiveOrderItem {
  item_id: string;
  quantity_received: number;
  location_id: string;
}

export interface ReceiveOrder {
  items: ReceiveOrderItem[];
}

export const ordersApi = {
  vendors: {
    list: (activeOnly: boolean = true) =>
      apiClient.get<Vendor[]>("/api/v1/orders/vendors", {
        params: { active_only: activeOnly },
      }),
    get: (id: string) => apiClient.get<Vendor>(`/api/v1/orders/vendors/${id}`),
    create: (data: Partial<Vendor>) =>
      apiClient.post<Vendor>("/api/v1/orders/vendors", data),
    update: (id: string, data: Partial<Vendor>) =>
      apiClient.put<Vendor>(`/api/v1/orders/vendors/${id}`, data),
    delete: (id: string) =>
      apiClient.delete<{ message: string }>(`/api/v1/orders/vendors/${id}`),
  },

  list: (params?: {
    status?: string;
    vendor_id?: string;
    from_date?: string;
    to_date?: string;
    skip?: number;
    limit?: number;
  }) => apiClient.get<PurchaseOrder[]>("/api/v1/orders", { params }),

  get: (id: string) => apiClient.get<PurchaseOrder>(`/api/v1/orders/${id}`),

  create: (data: CreateOrder) =>
    apiClient.post<PurchaseOrder>("/api/v1/orders", data),

  update: (id: string, data: UpdateOrder) =>
    apiClient.put<PurchaseOrder>(`/api/v1/orders/${id}`, data),

  // Tracking API
  getTracking: (id: string) =>
    apiClient.get<TrackingInfo>(`/api/v1/orders/${id}/tracking`),

  updateTracking: (id: string, data: TrackingUpdate) =>
    apiClient.put<PurchaseOrder>(`/api/v1/orders/${id}/tracking`, data),

  receive: (id: string, data: ReceiveOrder) =>
    apiClient.post<{
      message: string;
      order_status: string;
      fully_received: boolean;
    }>(`/api/v1/orders/${id}/receive`, data),

  cancel: (id: string) =>
    apiClient.delete<{ message: string }>(`/api/v1/orders/${id}`),

  suggestions: {
    getReorderSuggestions: (params?: {
      vendor_id?: string;
      category_id?: string;
      urgency?: string;
    }) =>
      apiClient.get<ReorderSuggestion[]>("/api/v1/orders/suggestions/reorder", {
        params,
      }),

    createPOFromSuggestions: (data: {
      item_ids: string[];
      vendor_id: string;
    }) =>
      apiClient.post<{
        message: string;
        po_id: string;
        po_number: string;
        items_count: number;
        total_cost: number;
      }>("/api/v1/orders/suggestions/create-po", data),
  },
};

// ============================================================================
// REORDER SUGGESTIONS
// ============================================================================

export interface ReorderSuggestion {
  item_id: string;
  item_code: string;
  item_name: string;
  category_name?: string;
  current_total_stock: number;
  total_par_level: number;
  total_reorder_level: number;
  shortage: number;
  suggested_order_qty: number;
  preferred_vendor_id?: string;
  preferred_vendor_name?: string;
  estimated_cost?: number;
  locations_below_par: number;
  urgency: "critical" | "high" | "medium" | "low";
}

// ============================================================================
// REPORTS
// ============================================================================

export interface LowStockItem {
  item_id: string;
  item_code: string;
  item_name: string;
  location_id: string;
  location_name: string;
  current_quantity: number;
  par_quantity: number;
  reorder_quantity: number;
  shortage: number;
  category: string;
}

export interface UsageStatistic {
  item_id: string;
  item_code: string;
  item_name: string;
  category: string;
  total_used: number;
  total_received: number;
  net_change: number;
  average_daily_usage: number;
  period_days: number;
}

export interface InventorySummary {
  total_items: number;
  total_locations: number;
  items_below_par: number;
  items_at_or_above_par: number;
  total_value: number;
  categories: Array<{
    id: string;
    name: string;
    item_count: number;
  }>;
}

export interface CostAnalysisItem {
  item_id: string;
  item_code: string;
  item_name: string;
  category: string;
  unit_cost: number;
  total_quantity: number;
  total_value: number;
  percentage_of_total: number;
}

export interface CostByCategory {
  category_id: string;
  category_name: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
  percentage_of_total: number;
}

export interface CostAnalysisResponse {
  total_inventory_value: number;
  total_items: number;
  total_quantity: number;
  average_item_cost: number;
  highest_value_items: CostAnalysisItem[];
  lowest_value_items: CostAnalysisItem[];
  cost_by_category: CostByCategory[];
  value_distribution: Record<string, number>;
}

// New report interfaces
export interface ProductLifeProjection {
  item_id: string;
  item_code: string;
  item_name: string;
  category: string;
  current_stock: number;
  average_daily_usage: number;
  projected_days_remaining: number;
  projected_reorder_date?: string;
  lead_time_days: number;
  recommended_reorder_date?: string;
  status: "Critical" | "Low" | "Normal" | "Overstocked";
}

export interface COGItem {
  item_id: string;
  item_code: string;
  item_name: string;
  category: string;
  unit_cost: number;
  total_used: number;
  total_cost_used: number;
  period_days: number;
  monthly_cost_rate: number;
  yearly_projected_cost: number;
}

export interface COGReport {
  period_days: number;
  total_items_used: number;
  total_cost_of_goods_used: number;
  average_daily_cog: number;
  projected_monthly_cog: number;
  projected_yearly_cog: number;
  by_category: {
    category_id: string;
    category_name: string;
    total_items_used: number;
    total_cost: number;
  }[];
  top_cost_items: COGItem[];
}

export interface UsageHistoryEntry {
  date: string;
  total_used: number;
  total_received: number;
  net_change: number;
  movements_count: number;
}

export interface DetailedUsageReport {
  item_id: string;
  item_code: string;
  item_name: string;
  category: string;
  period_days: number;
  total_used: number;
  total_received: number;
  average_daily_usage: number;
  peak_usage_day?: string;
  peak_usage_amount: number;
  trend: "Increasing" | "Decreasing" | "Stable";
  daily_history: UsageHistoryEntry[];
}

export interface ExpirationAlert {
  item_id: string;
  item_code: string;
  item_name: string;
  location_id: string;
  location_name: string;
  expiration_date: string;
  days_until_expiration: number;
  quantity: number;
  estimated_value: number;
  status: "Expired" | "Critical" | "Warning" | "OK";
}

export interface ExpirationReport {
  total_expiring_items: number;
  total_expired: number;
  total_critical: number;
  total_warning: number;
  total_at_risk_value: number;
  items: ExpirationAlert[];
}

export interface TurnoverItem {
  item_id: string;
  item_code: string;
  item_name: string;
  category: string;
  current_stock: number;
  total_used: number;
  total_received: number;
  turnover_ratio: number;
  days_of_supply: number;
  avg_daily_usage: number;
  efficiency: "Excellent" | "Good" | "Fair" | "Slow Moving";
}

export interface TurnoverReport {
  period_days: number;
  total_items_analyzed: number;
  average_turnover_ratio: number;
  slow_moving_items: number;
  high_turnover_items: number;
  items: TurnoverItem[];
}

export interface ForecastItem {
  item_id: string;
  item_code: string;
  item_name: string;
  category: string;
  current_stock: number;
  projected_usage: number;
  projected_stock_at_end: number;
  par_level: number;
  reorder_point: number;
  quantity_to_order: number;
  lead_time_days: number;
  suggested_reorder_date: string;
  unit_cost: number;
  projected_order_cost: number;
  urgency: "High" | "Medium" | "Low";
}

export interface ReorderForecast {
  forecast_period_days: number;
  total_items_needing_reorder: number;
  total_projected_cost: number;
  items: ForecastItem[];
}

export const reportsApi = {
  lowStock: (params?: { location_id?: string; category_id?: string }) =>
    apiClient.get<LowStockItem[]>("/api/v1/reports/low-stock", { params }),

  usage: (params?: { days?: number; category_id?: string; limit?: number }) =>
    apiClient.get<UsageStatistic[]>("/api/v1/reports/usage", { params }),

  inventorySummary: () =>
    apiClient.get<InventorySummary>("/api/v1/reports/inventory-summary"),

  audit: (params?: {
    start_date?: string;
    end_date?: string;
    user_id?: string;
    limit?: number;
  }) => apiClient.get("/api/v1/reports/audit", { params }),

  orderHistory: (params?: { days?: number; status?: string }) =>
    apiClient.get("/api/v1/reports/order-history", { params }),

  movementHistory: (params?: {
    days?: number;
    location_id?: string;
    item_id?: string;
    limit?: number;
  }) => apiClient.get("/api/v1/reports/movement-history", { params }),

  costAnalysis: (params?: { category_id?: string; location_id?: string }) =>
    apiClient.get<CostAnalysisResponse>("/api/v1/reports/cost-analysis", {
      params,
    }),

  // New comprehensive reports
  productLifeProjection: (params?: {
    days_history?: number;
    category_id?: string;
    include_zero_stock?: boolean;
  }) =>
    apiClient.get<ProductLifeProjection[]>(
      "/api/v1/reports/product-life-projection",
      { params }
    ),

  costOfGoods: (params?: { days?: number; category_id?: string }) =>
    apiClient.get<COGReport>("/api/v1/reports/cost-of-goods", { params }),

  usageHistoryDetail: (params?: {
    days?: number;
    item_id?: string;
    category_id?: string;
    limit?: number;
  }) =>
    apiClient.get<DetailedUsageReport[]>(
      "/api/v1/reports/usage-history-detail",
      {
        params,
      }
    ),

  expirationTracking: (params?: {
    days_ahead?: number;
    include_expired?: boolean;
    location_id?: string;
  }) =>
    apiClient.get<ExpirationReport>("/api/v1/reports/expiration-tracking", {
      params,
    }),

  inventoryTurnover: (params?: { days?: number; category_id?: string }) =>
    apiClient.get<TurnoverReport>("/api/v1/reports/inventory-turnover", {
      params,
    }),

  reorderForecast: (params?: { days_ahead?: number; category_id?: string }) =>
    apiClient.get<ReorderForecast>("/api/v1/reports/reorder-forecast", {
      params,
    }),
};

// ============================================================================
// USERS
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "user";
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUser {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: "admin" | "user";
  is_active?: boolean;
}

export interface UpdateUser {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: "admin" | "user";
  is_active?: boolean;
}

export interface ChangePassword {
  current_password: string;
  new_password: string;
}

export const usersApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    is_active?: boolean;
    role?: string;
  }) => apiClient.get<User[]>("/api/v1/users/", { params }),

  get: (id: string) => apiClient.get<User>(`/api/v1/users/${id}`),

  create: (data: CreateUser) => apiClient.post<User>("/api/v1/users/", data),

  update: (id: string, data: UpdateUser) =>
    apiClient.put<User>(`/api/v1/users/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/v1/users/${id}`),

  resetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/api/v1/users/${id}/reset-password`, {
      new_password: newPassword,
    }),

  me: {
    profile: () => apiClient.get<User>("/api/v1/users/me/profile"),
    updateProfile: (data: UpdateUser) =>
      apiClient.put<User>("/api/v1/users/me/profile", data),
    changePassword: (data: ChangePassword) =>
      apiClient.post("/api/v1/users/me/change-password", data),
  },
};

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

export interface AutoOrderConfig {
  enabled: boolean;
  trigger_on_scan: boolean;
  trigger_on_manual_check: boolean;
  min_order_quantity: number;
  max_order_quantity: number;
  order_up_to_par: boolean;
  require_approval: boolean;
}

export interface StationRequestConfig {
  enabled: boolean;
  max_request_quantity: number;
  require_approval: boolean;
  auto_create_transfer: boolean;
  notification_emails: string[];
}

export interface StockAlertConfig {
  enabled: boolean;
  check_on_scan: boolean;
  check_on_transfer: boolean;
  alert_below_par: boolean;
  alert_below_reorder: boolean;
  alert_critical_percent: number;
}

export interface TransferRestrictionsConfig {
  require_rfid_scan: boolean;
  max_transfer_quantity: number;
  allow_negative_stock: boolean;
  require_notes_above_quantity: number | null;
}

export interface SystemConfig {
  auto_order: AutoOrderConfig;
  station_requests: StationRequestConfig;
  stock_alerts: StockAlertConfig;
  transfer_restrictions: TransferRestrictionsConfig;
}

export const configApi = {
  get: () => apiClient.get<SystemConfig>("/api/v1/config/"),

  update: (data: SystemConfig) =>
    apiClient.put<SystemConfig>("/api/v1/config/", data),

  updateAutoOrder: (data: AutoOrderConfig) =>
    apiClient.put<AutoOrderConfig>("/api/v1/config/auto-order", data),

  updateStationRequests: (data: StationRequestConfig) =>
    apiClient.put<StationRequestConfig>(
      "/api/v1/config/station-requests",
      data
    ),

  updateStockAlerts: (data: StockAlertConfig) =>
    apiClient.put<StockAlertConfig>("/api/v1/config/stock-alerts", data),

  updateTransferRestrictions: (data: TransferRestrictionsConfig) =>
    apiClient.put<TransferRestrictionsConfig>(
      "/api/v1/config/transfer-restrictions",
      data
    ),

  validateTransfer: (params: {
    item_id: string;
    from_location_id: string;
    quantity: number;
  }) => apiClient.get("/api/v1/config/validate-transfer", { params }),

  validateOrder: (params: { quantity: number }) =>
    apiClient.get("/api/v1/config/validate-order", { params }),
};

// ============================================================================
// EMPLOYEES
// ============================================================================

export interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  is_active: boolean;
  hire_date?: string;
  created_at: string;
  updated_at: string;
}

export const employeesApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    is_active?: boolean;
    department?: string;
    search?: string;
  }) => apiClient.get<Employee[]>("/api/v1/employees", { params }),

  get: (id: string) => apiClient.get<Employee>(`/api/v1/employees/${id}`),

  create: (data: Partial<Employee>) =>
    apiClient.post<Employee>("/api/v1/employees", data),

  update: (id: string, data: Partial<Employee>) =>
    apiClient.put<Employee>(`/api/v1/employees/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/v1/employees/${id}`),

  hardDelete: (id: string) => apiClient.delete(`/api/v1/employees/${id}/hard`),
};

// ============================================================================
// ASSETS
// ============================================================================

export interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  description?: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  warranty_expiration?: string;
  condition: string;
  location?: string;
  status: string;
  notes?: string;
  is_active: boolean;
  employee_id?: string;
  employee_name?: string;
  assigned_date?: string;
  created_at: string;
  updated_at: string;
}

export const assetsApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    category?: string;
    status?: string;
    condition?: string;
    employee_id?: string;
    is_active?: boolean;
    search?: string;
  }) => apiClient.get<Asset[]>("/api/v1/assets", { params }),

  get: (id: string) => apiClient.get<Asset>(`/api/v1/assets/${id}`),

  create: (data: Partial<Asset>) =>
    apiClient.post<Asset>("/api/v1/assets", data),

  update: (id: string, data: Partial<Asset>) =>
    apiClient.put<Asset>(`/api/v1/assets/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/v1/assets/${id}`),

  hardDelete: (id: string) => apiClient.delete(`/api/v1/assets/${id}/hard`),

  assignToEmployee: (assetId: string, employeeId: string) =>
    apiClient.post(`/api/v1/assets/${assetId}/assign/${employeeId}`),

  unassign: (assetId: string) =>
    apiClient.post(`/api/v1/assets/${assetId}/unassign`),
};

// ============================================================================
// FORMS
// ============================================================================

export interface FormFieldDefinition {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  default_value?: any;
  options?: string[];
  validation?: Record<string, any>;
  help_text?: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  fields: FormFieldDefinition[];
  is_active: boolean;
  requires_signature: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  template_id: string;
  template_name?: string;
  submitted_by?: string;
  submitted_by_name?: string;
  data: Record<string, any>;
  signature?: string;
  signature_name?: string;
  signature_date?: string;
  location_id?: string;
  notes?: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export const formsApi = {
  // Templates
  listTemplates: (params?: {
    skip?: number;
    limit?: number;
    category?: string;
    is_active?: boolean;
    search?: string;
  }) => apiClient.get<FormTemplate[]>("/api/v1/forms/templates", { params }),

  getTemplate: (id: string) =>
    apiClient.get<FormTemplate>(`/api/v1/forms/templates/${id}`),

  createTemplate: (data: Partial<FormTemplate>) =>
    apiClient.post<FormTemplate>("/api/v1/forms/templates", data),

  updateTemplate: (id: string, data: Partial<FormTemplate>) =>
    apiClient.put<FormTemplate>(`/api/v1/forms/templates/${id}`, data),

  deleteTemplate: (id: string) =>
    apiClient.delete(`/api/v1/forms/templates/${id}`),

  // Submissions
  listSubmissions: (params?: {
    skip?: number;
    limit?: number;
    template_id?: string;
    status?: string;
    submitted_by?: string;
    location_id?: string;
    start_date?: string;
    end_date?: string;
  }) =>
    apiClient.get<FormSubmission[]>("/api/v1/forms/submissions", { params }),

  getSubmission: (id: string) =>
    apiClient.get<FormSubmission>(`/api/v1/forms/submissions/${id}`),

  createSubmission: (data: Partial<FormSubmission>) =>
    apiClient.post<FormSubmission>("/api/v1/forms/submissions", data),

  updateSubmission: (id: string, data: Partial<FormSubmission>) =>
    apiClient.put<FormSubmission>(`/api/v1/forms/submissions/${id}`, data),

  deleteSubmission: (id: string) =>
    apiClient.delete(`/api/v1/forms/submissions/${id}`),

  reviewSubmission: (id: string, status: string) =>
    apiClient.post(`/api/v1/forms/submissions/${id}/review`, null, {
      params: { status },
    }),
};

// ============================================================================
// CSV IMPORT
// ============================================================================

export interface CSVImportConflict {
  item_code: string;
  existing_item_name: string;
  new_item_name: string;
  existing_item_id: string;
  row_number: number;
}

export interface CSVImportPreviewResponse {
  total_rows: number;
  new_items: number;
  conflicts: CSVImportConflict[];
  errors: Array<{ row: number; field?: string; error: string }>;
}

export interface CSVImportRequest {
  conflict_resolution: "skip" | "replace";
  item_codes_to_replace?: string[];
}

export interface CSVImportResult {
  total_rows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export const csvImportApi = {
  preview: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<CSVImportPreviewResponse>(
      "/api/v1/csv-import/preview",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  execute: (cacheKey: string, request: CSVImportRequest) =>
    apiClient.post<CSVImportResult>("/api/v1/csv-import/execute", request, {
      params: { cache_key: cacheKey },
    }),
};
