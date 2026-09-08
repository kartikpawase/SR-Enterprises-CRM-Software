import type { FastifyPluginAsync } from 'fastify';
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  InventoryItemQueryFilterSchema,
  CreateInventoryPurchaseSchema,
  InventoryPurchaseQueryFilterSchema,
  CreateInventorySaleSchema,
  InventorySaleQueryFilterSchema,
  InventoryAnalyticsFilterSchema,
  InventoryProfitLedgerFilterSchema,
} from '@crm/validation';
import { inventoryManagementService } from './inventory-management.service';
import { authenticate } from '../../middleware/auth';
import { HTTP_STATUS } from '@crm/shared';

export const inventoryManagementRoutes: FastifyPluginAsync = async (fastify) => {
  // All inventory management endpoints require authenticated session
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/inventory-management/items
   * Query inventory items (spare parts, accessories) with stock status and filters
   */
  fastify.get('/items', async (request, reply) => {
    const query = InventoryItemQueryFilterSchema.parse(request.query);
    const result = await inventoryManagementService.getItems(query);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/inventory-management/items/:id
   * Get single inventory item with its stock history
   */
  fastify.get('/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await inventoryManagementService.getItemById(id);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: item,
    });
  });

  /**
   * POST /api/v1/inventory-management/items
   * Create new inventory item
   */
  fastify.post('/items', async (request, reply) => {
    const body = CreateInventoryItemSchema.parse(request.body);
    const item = await inventoryManagementService.createItem(body);
    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: item,
      message: 'Inventory item created successfully',
    });
  });

  /**
   * PUT /api/v1/inventory-management/items/:id
   * Update existing inventory item
   */
  fastify.put('/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateInventoryItemSchema.parse(request.body);
    const item = await inventoryManagementService.updateItem(id, body);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: item,
      message: 'Inventory item updated successfully',
    });
  });

  /**
   * DELETE /api/v1/inventory-management/items/:id
   * Safely delete inventory item if not referenced by protected historical records
   */
  fastify.delete('/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const deletedItem = await inventoryManagementService.deleteItem(id);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: deletedItem,
        message: 'Inventory item deleted successfully',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('already used in existing inventory')) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'CANNOT_DELETE_REFERENCED_ITEM',
            message: err.message,
          },
        });
      }
      if (err.message && err.message.includes('not found')) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * GET /api/v1/inventory-management/purchases
   * Query inward stock purchase history
   */
  fastify.get('/purchases', async (request, reply) => {
    const query = InventoryPurchaseQueryFilterSchema.parse(request.query);
    const result = await inventoryManagementService.getPurchases(query);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * POST /api/v1/inventory-management/purchases
   * Record a new inward purchase (increments stock)
   */
  fastify.post('/purchases', async (request, reply) => {
    const body = CreateInventoryPurchaseSchema.parse(request.body);
    const purchase = await inventoryManagementService.createPurchase(body);
    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: purchase,
      message: 'Purchase recorded successfully and stock updated',
    });
  });

  /**
   * GET /api/v1/inventory-management/sales
   * Query outward sales history
   */
  fastify.get('/sales', async (request, reply) => {
    const query = InventorySaleQueryFilterSchema.parse(request.query);
    const result = await inventoryManagementService.getSales(query);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * POST /api/v1/inventory-management/sales
   * Record a new sale with FIFO cost allocation, stock decrement, and profit calculation
   */
  fastify.post('/sales', async (request, reply) => {
    const body = CreateInventorySaleSchema.parse(request.body);
    try {
      const sale = await inventoryManagementService.createSale(body);
      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: sale,
        message: 'Sale recorded successfully',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Insufficient stock')) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * GET /api/v1/inventory-management/analytics
   * Comprehensive KPI metrics, trend charts, and rankings
   */
  fastify.get('/analytics', async (request, reply) => {
    const filter = InventoryAnalyticsFilterSchema.parse(request.query);
    const analytics = await inventoryManagementService.getAnalytics(filter);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: analytics,
    });
  });

  /**
   * GET /api/v1/inventory-management/profit-ledger
   * Transaction-level profit breakdown table
   */
  fastify.get('/profit-ledger', async (request, reply) => {
    const filter = InventoryProfitLedgerFilterSchema.parse(request.query);
    const ledger = await inventoryManagementService.getProfitLedger(filter);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: ledger.data,
      pagination: ledger.pagination,
    });
  });
};
