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
    apiClient.get<Location[]>("/api/v1/locations", { params }),

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
};

// ============================================================================
// RFID / SCANNER
// ============================================================================

export interface ScanData {
  tag_id: string;
}

export interface LinkTagData {
  tag_id: string;
  item_id: string;
  location_id: string;
}

export interface MoveByScanData {
  tag_id: string;
  to_location_id: string;
}

export const rfidApi = {
  scan: (data: ScanData) => apiClient.post("/api/v1/rfid/scan", data),

  linkTag: (data: LinkTagData) => apiClient.post("/api/v1/rfid/link", data),

  moveItem: (data: MoveByScanData) => apiClient.post("/api/v1/rfid/move", data),
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
  is_active: boolean;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  vendor_id: string;
  vendor_name?: string;
  status: "pending" | "ordered" | "received" | "cancelled";
  order_date?: string;
  expected_delivery_date?: string;
  total_amount?: number;
  notes?: string;
}

export interface OrderItem {
  item_id: string;
  quantity: number;
  unit_cost: number;
}

export interface CreateOrder {
  vendor_id: string;
  items: OrderItem[];
  expected_delivery_date?: string;
  notes?: string;
}

export interface ReceiveOrder {
  location_id: string;
  received_items: Array<{
    item_id: string;
    quantity_received: number;
  }>;
  notes?: string;
}

export const ordersApi = {
  vendors: {
    list: () => apiClient.get<Vendor[]>("/api/v1/orders/vendors"),
    create: (data: Partial<Vendor>) =>
      apiClient.post<Vendor>("/api/v1/orders/vendors", data),
  },

  list: (params?: { status?: string; vendor_id?: string }) =>
    apiClient.get<PurchaseOrder[]>("/api/v1/orders", { params }),

  get: (id: string) => apiClient.get<PurchaseOrder>(`/api/v1/orders/${id}`),

  create: (data: CreateOrder) =>
    apiClient.post<PurchaseOrder>("/api/v1/orders", data),

  update: (id: string, data: Partial<PurchaseOrder>) =>
    apiClient.put<PurchaseOrder>(`/api/v1/orders/${id}`, data),

  receive: (id: string, data: ReceiveOrder) =>
    apiClient.post(`/api/v1/orders/${id}/receive`, data),
};

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
