import { inventoryManagementRepository } from './inventory-management.repository';
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  InventoryItemQueryFilter,
  CreateInventoryPurchaseInput,
  InventoryPurchaseQueryFilter,
  CreateInventorySaleInput,
  InventorySaleQueryFilter,
  InventoryAnalyticsFilter,
  InventoryProfitLedgerFilter,
} from '@crm/validation';

export class InventoryManagementService {
  async getItems(filters: InventoryItemQueryFilter) {
    return inventoryManagementRepository.getItems(filters);
  }

  async getItemById(id: string) {
    const item = await inventoryManagementRepository.getItemById(id);
    if (!item) {
      throw new Error('Inventory item not found');
    }
    return item;
  }

  async createItem(input: CreateInventoryItemInput) {
    return inventoryManagementRepository.createItem(input);
  }

  async updateItem(id: string, input: UpdateInventoryItemInput) {
    await this.getItemById(id); // Ensure exists
    return inventoryManagementRepository.updateItem(id, input);
  }

  async createPurchase(input: CreateInventoryPurchaseInput) {
    await this.getItemById(input.itemId); // Ensure item exists
    return inventoryManagementRepository.createPurchase(input);
  }

  async getPurchases(filters: InventoryPurchaseQueryFilter) {
    return inventoryManagementRepository.getPurchases(filters);
  }

  async createSale(input: CreateInventorySaleInput) {
    await this.getItemById(input.itemId); // Ensure item exists
    return inventoryManagementRepository.createSale(input);
  }

  async getSales(filters: InventorySaleQueryFilter) {
    return inventoryManagementRepository.getSales(filters);
  }

  async getAnalytics(filter: InventoryAnalyticsFilter) {
    return inventoryManagementRepository.getAnalytics(filter);
  }

  async getProfitLedger(filter: InventoryProfitLedgerFilter) {
    return inventoryManagementRepository.getProfitLedger(filter);
  }
}

export const inventoryManagementService = new InventoryManagementService();
