/**
 * TypeScript type definitions for the EMS Supply Tracking System
 */

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export enum LocationType {
  SUPPLY_STATION = "supply_station",
  STATION_CABINET = "station_cabinet",
  VEHICLE = "vehicle",
}

export enum TagStatus {
  IN_STOCK = "in_stock",
  IN_USE = "in_use",
  DEPLETED = "depleted",
  EXPIRED = "expired",
  DISPOSED = "disposed",
}

export enum MovementType {
  RECEIVE = "receive",
  TRANSFER = "transfer",
  USE = "use",
  DISPOSE = "dispose",
  RESTOCK = "restock",
  ADJUSTMENT = "adjustment",
}

export enum OrderStatus {
  PENDING = "pending",
  ORDERED = "ordered",
  PARTIAL = "partial",
  RECEIVED = "received",
  CANCELLED = "cancelled",
}

export enum NotificationType {
  LOW_STOCK = "low_stock",
  EXPIRATION_WARNING = "expiration_warning",
  EXPIRATION_CRITICAL = "expiration_critical",
  ORDER_RECEIVED = "order_received",
  ORDER_PLACED = "order_placed",
  PAR_LEVEL_BREACH = "par_level_breach",
  SYSTEM_ALERT = "system_alert",
}

export enum NotificationSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  parent_location_id?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_category_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  item_code: string;
  name: string;
  description?: string;
  category_id?: string;
  unit_of_measure: string;
  requires_expiration_tracking: boolean;
  is_controlled_substance: boolean;
  manufacturer?: string;
  manufacturer_part_number?: string;
  cost_per_unit?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  // Optional fields sometimes present in API response views
  par_level?: number;
  reorder_level?: number;
  current_quantity?: number;
  total_par_level?: number;
}

export interface InventoryItem {
  id: number;
  item_id: string;
  location_id: string;
  rfid_tag: string;
  expiration_date?: string;
  lot_number?: string;
  received_date: string;
  created_at: string;
  updated_at: string;
  item_name?: string;
  location_name?: string;
}

export interface InventoryItemListResponse {
  items: InventoryItem[];
  total_count: number;
  expiring_soon_count: number;
  earliest_expiration?: string;
}

export interface InventoryItemCreate {
  item_id: string;
  location_id: string;
  rfid_tag: string;
  expiration_date?: string;
  lot_number?: string;
  received_date?: string;
  truck_location?: string;
}

export interface InventoryItemBulkCreate {
  item_id: string;
  location_id: string;
  quantity: number;
  expiration_date?: string;
  lot_number?: string;
  received_date?: string;
  rfid_tag_prefix?: string;
  truck_location?: string;
}

export interface InventoryItemUpdate {
  expiration_date?: string;
  lot_number?: string;
  location_id?: string;
}

export interface RFIDTag {
  id: string;
  tag_id: string;
  item_id: string;
  current_location_id?: string;
  status: TagStatus;
  expiration_date?: string;
  lot_number?: string;
  received_date: string;
  cost?: number;
  created_at: string;
  updated_at: string;
  // Sometimes API includes a direct par_level property
  par_level?: number;
  item?: Item;
  current_location?: Location;
}

export interface ParLevel {
  id: string;
  location_id: string;
  item_id: string;
  par_quantity: number;
  reorder_quantity: number;
  max_quantity?: number;
  created_at: string;
  updated_at: string;
  location?: Location;
  item?: Item;
}

export interface InventoryCurrent {
  id: string;
  location_id: string;
  item_id: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  quantity_available?: number;
  last_counted_at?: string;
  last_counted_by?: string;
  created_at: string;
  updated_at: string;
  location?: Location;
  item?: Item;
}

export interface InventoryMovement {
  id: string;
  rfid_tag_id: string;
  from_location_id?: string;
  to_location_id?: string;
  movement_type: MovementType;
  quantity: number;
  user_id?: string;
  notes?: string;
  timestamp: string;
  created_at: string;
  rfid_tag?: RFIDTag;
  from_location?: Location;
  to_location?: Location;
  user?: User;
}

export interface Vendor {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  status: OrderStatus;
  order_date: string;
  expected_delivery_date?: string;
  received_date?: string;
  total_cost?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost?: number;
  total_cost?: number;
  created_at: string;
  updated_at: string;
  item?: Item;
}

export interface Notification {
  id: string;
  user_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  is_read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
  read_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface DashboardStats {
  total_items: number;
  low_stock_count: number;
  expiring_soon_count: number;
  pending_orders: number;
  locations: number;
  total_value: number;
}

export interface InventorySummary {
  location: Location;
  items: Array<{
    item: Item;
    current: InventoryCurrent;
    par_level?: ParLevel;
    status: "ok" | "low" | "critical";
  }>;
}

export interface ScanResult {
  success: boolean;
  tag?: RFIDTag;
  message: string;
}
