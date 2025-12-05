/**
 * Individual Inventory Items API Service
 */
import { apiClient } from "./api";
import {
  InventoryItem,
  InventoryItemListResponse,
  InventoryItemCreate,
  InventoryItemBulkCreate,
  InventoryItemUpdate,
} from "../types";

const BASE_URL = "/api/v1/inventory-items";

export const inventoryItemsApi = {
  /**
   * Get all individual items for a specific item at a specific location
   */
  async getIndividualItems(
    itemId: string,
    locationId: string
  ): Promise<InventoryItemListResponse> {
    const response = await apiClient.get<InventoryItemListResponse>(
      `${BASE_URL}/${itemId}/${locationId}`
    );
    return response.data;
  },

  /**
   * Add a single individual item with RFID tag and expiration
   */
  async createIndividualItem(
    data: InventoryItemCreate
  ): Promise<InventoryItem> {
    const response = await apiClient.post<InventoryItem>(BASE_URL, data);
    return response.data;
  },

  /**
   * Add multiple items at once (e.g., bag of 5)
   */
  async createBulkItems(
    data: InventoryItemBulkCreate
  ): Promise<InventoryItem[]> {
    const response = await apiClient.post<InventoryItem[]>(
      `${BASE_URL}/bulk`,
      data
    );
    return response.data;
  },

  /**
   * Update an individual item (expiration, lot number, or location)
   */
  async updateIndividualItem(
    itemId: number,
    data: InventoryItemUpdate
  ): Promise<InventoryItem> {
    const response = await apiClient.patch<InventoryItem>(
      `${BASE_URL}/${itemId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a specific individual item (e.g., when expired or used)
   */
  async deleteIndividualItem(itemId: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${itemId}`);
  },
};
