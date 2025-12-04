/**
 * API configuration and constants
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_V1_PREFIX = "/api/v1";

export const ENDPOINTS = {
  // Auth
  LOGIN: `${API_V1_PREFIX}/auth/login`,
  LOGOUT: `${API_V1_PREFIX}/auth/logout`,
  REFRESH: `${API_V1_PREFIX}/auth/refresh`,
  ME: `${API_V1_PREFIX}/auth/me`,

  // Users
  USERS: `${API_V1_PREFIX}/users`,
  USER: (id: string) => `${API_V1_PREFIX}/users/${id}`,

  // Items
  ITEMS: `${API_V1_PREFIX}/items`,
  ITEM: (id: string) => `${API_V1_PREFIX}/items/${id}`,
  ITEM_LOCATIONS: (id: string) => `${API_V1_PREFIX}/items/${id}/locations`,
  ITEM_PAR_LEVELS: (id: string) => `${API_V1_PREFIX}/items/${id}/par-levels`,

  // Locations
  LOCATIONS: `${API_V1_PREFIX}/locations`,
  LOCATION: (id: string) => `${API_V1_PREFIX}/locations/${id}`,
  LOCATION_INVENTORY: (id: string) =>
    `${API_V1_PREFIX}/locations/${id}/inventory`,
  LOCATION_PAR_CHECK: (id: string) =>
    `${API_V1_PREFIX}/locations/${id}/par-check`,
  LOCATION_COUNT: (id: string) => `${API_V1_PREFIX}/locations/${id}/count`,

  // RFID Operations
  RFID_SCAN: `${API_V1_PREFIX}/rfid/scan`,
  RFID_BATCH_SCAN: `${API_V1_PREFIX}/rfid/batch-scan`,
  RFID_TAG: (tagId: string) => `${API_V1_PREFIX}/rfid/tag/${tagId}`,
  RFID_RECEIVE: `${API_V1_PREFIX}/rfid/receive`,
  RFID_TRANSFER: `${API_V1_PREFIX}/rfid/transfer`,
  RFID_USE: `${API_V1_PREFIX}/rfid/use`,

  // Inventory
  INVENTORY: `${API_V1_PREFIX}/inventory`,
  PAR_LEVELS: `${API_V1_PREFIX}/par-levels`,

  // Orders
  ORDERS: `${API_V1_PREFIX}/orders`,
  ORDER: (id: string) => `${API_V1_PREFIX}/orders/${id}`,
  ORDER_RECEIVE: (id: string) => `${API_V1_PREFIX}/orders/${id}/receive`,
  AUTO_GENERATE_ORDERS: `${API_V1_PREFIX}/orders/auto-generate`,

  // Reports
  INVENTORY_SUMMARY: `${API_V1_PREFIX}/reports/inventory-summary`,
  USAGE_BY_ITEM: `${API_V1_PREFIX}/reports/usage-by-item`,
  USAGE_BY_LOCATION: `${API_V1_PREFIX}/reports/usage-by-location`,
  EXPIRING_ITEMS: `${API_V1_PREFIX}/reports/expiring-items`,
  CONTROLLED_SUBSTANCES: `${API_V1_PREFIX}/reports/controlled-substances`,
  ORDER_HISTORY: `${API_V1_PREFIX}/reports/order-history`,
  AUDIT_TRAIL: `${API_V1_PREFIX}/reports/audit-trail`,

  // Notifications
  NOTIFICATIONS: `${API_V1_PREFIX}/notifications`,
  NOTIFICATION_READ: (id: string) =>
    `${API_V1_PREFIX}/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: `${API_V1_PREFIX}/notifications/read-all`,

  // Dashboard
  DASHBOARD_STATS: `${API_V1_PREFIX}/dashboard/stats`,
} as const;

export const TOKEN_KEY = "ems_auth_token";
export const REFRESH_TOKEN_KEY = "ems_refresh_token";
