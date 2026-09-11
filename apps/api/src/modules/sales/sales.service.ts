import { salesRepository } from './sales.repository';
import type {
  CreateSaleInput,
  UpdateSaleInput,
  ConfirmSaleInput,
  SaleQueryFilter,
} from '@crm/validation';

export class SalesService {
  async getSales(filters: SaleQueryFilter) {
    return salesRepository.findPaginated(filters);
  }

  async getSalesStats(filters: SaleQueryFilter) {
    return salesRepository.getSalesStats(filters);
  }

  async getSaleById(id: string) {
    const sale = await salesRepository.findById(id);
    if (!sale) {
      throw new Error('Sale not found');
    }
    return sale;
  }

  async createSale(data: CreateSaleInput, actorId?: string, actorName = 'System') {
    return salesRepository.createSale(data, actorId, actorName);
  }

  async updateDraftSale(id: string, data: UpdateSaleInput, actorId?: string, actorName = 'System') {
    return salesRepository.updateDraft(id, data, actorId, actorName);
  }

  async confirmSale(id: string, confirmation: ConfirmSaleInput, actorId?: string, actorName = 'System') {
    return salesRepository.confirmSale(id, confirmation, actorId, actorName);
  }

  async cancelSale(id: string, reason: string, actorId?: string, actorName = 'System') {
    return salesRepository.cancelSale(id, reason, actorId, actorName);
  }

  async deleteSale(id: string, actorId?: string, actorName = 'System') {
    return salesRepository.deleteSale(id, actorId, actorName);
  }
}

export const salesService = new SalesService();
