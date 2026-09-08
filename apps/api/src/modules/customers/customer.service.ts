import { customerRepository, CustomerRepository } from './customer.repository';
import { withTransaction } from '../../database/transactions';
import { db } from '../../database/client';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryFilterInput,
  CheckDuplicateCustomerInput,
} from '@crm/validation';

export class CustomerService {
  constructor(private readonly repo: CustomerRepository = customerRepository) {}

  /**
   * Search and filter customers directory with pagination
   */
  async getCustomers(filters: CustomerQueryFilterInput) {
    return this.repo.findPaginated(filters);
  }

  /**
   * Get customer summary statistics and dashboard metrics
   */
  async getCustomerDashboardStats() {
    return this.repo.getCustomerDashboardStats();
  }

  private createNotFoundError(id: string) {
    const error = new Error(`Customer with ID ${id} not found`);
    (error as any).statusCode = 404;
    (error as any).code = 'NOT_FOUND';
    return error;
  }

  /**
   * Get single customer by UUID
   */
  async getCustomerById(id: string) {
    const customer = await this.repo.findById(id);
    if (!customer) {
      throw this.createNotFoundError(id);
    }
    return customer;
  }

  /**
   * Check for potential duplicate customer by phone or email
   */
  async checkDuplicate(input: CheckDuplicateCustomerInput) {
    let duplicateByPhone: any = null;
    let duplicateByEmail: any = null;

    if (input.phone) {
      duplicateByPhone = await this.repo.findByPhone(input.phone, input.excludeCustomerId);
    }

    if (input.email) {
      duplicateByEmail = await this.repo.findByEmail(input.email, input.excludeCustomerId);
    }

    const isDuplicate = !!duplicateByPhone || !!duplicateByEmail;
    const existing: any = duplicateByPhone || duplicateByEmail;

    return {
      isDuplicate,
      matchField: duplicateByPhone ? 'phone' : duplicateByEmail ? 'email' : null,
      existingCustomer: existing
        ? {
            id: existing.id,
            customerNumber: existing.customerNumber,
            fullName: existing.fullName,
            phone: existing.phone,
            email: existing.email,
            status: existing.status,
          }
        : null,
    };
  }

  /**
   * Create a new customer inside an atomic ACID transaction
   */
  async createCustomer(
    data: CreateCustomerInput,
    actorId?: string | null,
    actorName?: string | null
  ) {
    console.log('[DEBUG customer.service.ts] 1. Checking duplicate phone:', data.phone);
    // 1. Check duplicate phone
    const existingPhone = await this.repo.findByPhone(data.phone);
    console.log('[DEBUG customer.service.ts] Checked phone, result:', existingPhone);
    if (existingPhone) {
      const error = new Error(`A customer with phone number ${data.phone} already exists (${existingPhone.customerNumber})`);
      (error as any).statusCode = 409;
      (error as any).code = 'CONFLICT';
      (error as any).details = { existingCustomerId: existingPhone.id, customerNumber: existingPhone.customerNumber };
      throw error;
    }

    // 2. Check duplicate email if supplied
    if (data.email && data.email.trim()) {
      console.log('[DEBUG customer.service.ts] 2. Checking duplicate email:', data.email);
      const existingEmail = await this.repo.findByEmail(data.email);
      console.log('[DEBUG customer.service.ts] Checked email, result:', existingEmail);
      if (existingEmail) {
        const error = new Error(`A customer with email ${data.email} already exists (${existingEmail.customerNumber})`);
        (error as any).statusCode = 409;
        (error as any).code = 'CONFLICT';
        (error as any).details = { existingCustomerId: existingEmail.id, customerNumber: existingEmail.customerNumber };
        throw error;
      }
    }

    console.log('[DEBUG customer.service.ts] 3. Calling this.repo.create...');
    // 3. Execute atomic creation directly via repository
    const customer = await this.repo.create(data, actorId, actorName);
    console.log('[DEBUG customer.service.ts] Created customer in repo:', customer?.id);
    if (!customer || !customer.id) {
      throw new Error('Database transaction failed to create customer record');
    }
    return customer;
  }

  /**
   * Update customer profile within ACID transaction
   */
  async updateCustomer(
    id: string,
    data: UpdateCustomerInput,
    actorId?: string | null,
    actorName?: string | null
  ) {
    // Verify customer exists
    await this.getCustomerById(id);

    // Check duplicate phone if being modified
    if (data.phone) {
      const duplicatePhone = await this.repo.findByPhone(data.phone, id);
      if (duplicatePhone) {
        const error = new Error(`A customer with phone number ${data.phone} already exists (${duplicatePhone.customerNumber})`);
        (error as any).statusCode = 409;
        (error as any).code = 'CONFLICT';
        throw error;
      }
    }

    // Check duplicate email if being modified
    if (data.email) {
      const duplicateEmail = await this.repo.findByEmail(data.email, id);
      if (duplicateEmail) {
        const error = new Error(`A customer with email ${data.email} already exists (${duplicateEmail.customerNumber})`);
        (error as any).statusCode = 409;
        (error as any).code = 'CONFLICT';
        throw error;
      }
    }

    const updated = await this.repo.update(id, data, actorId, actorName);
    if (!updated) {
      throw this.createNotFoundError(id);
    }
    return updated;
  }

  /**
   * Soft archive customer record while maintaining historical reference integrity
   */
  async archiveCustomer(
    id: string,
    reason?: string,
    actorId?: string | null,
    actorName?: string | null
  ) {
    await this.getCustomerById(id);
    const archived = await this.repo.archive(id, reason, actorId, actorName);
    if (!archived) {
      throw this.createNotFoundError(id);
    }
    return archived;
  }

  /**
   * Permanently delete customer and all customer records completely from the CRM
   */
  async deleteCustomerCompletely(
    id: string,
    actorId?: string | null,
    actorName?: string | null
  ) {
    await this.getCustomerById(id);
    return this.repo.deleteCustomerCompletely(id);
  }

  /**
   * Get calculated financial summary
   */
  async getFinancialSummary(customerId: string) {
    await this.getCustomerById(customerId);
    return this.repo.getFinancialSummary(customerId);
  }

  /**
   * Relationship sub-resource queries
   */
  async getCustomerAssets(customerId: string) {
    await this.getCustomerById(customerId);
    return this.repo.getCustomerAssets(customerId);
  }

  async getCustomerSales(customerId: string, page = 1, limit = 20) {
    await this.getCustomerById(customerId);
    return this.repo.getCustomerSales(customerId, page, limit);
  }

  async getCustomerInvoices(customerId: string, page = 1, limit = 20) {
    await this.getCustomerById(customerId);
    return this.repo.getCustomerInvoices(customerId, page, limit);
  }

  async getCustomerPayments(customerId: string, page = 1, limit = 20) {
    await this.getCustomerById(customerId);
    return this.repo.getCustomerPayments(customerId, page, limit);
  }

  async getCustomerServices(customerId: string, page = 1, limit = 20) {
    await this.getCustomerById(customerId);
    return this.repo.getCustomerServices(customerId, page, limit);
  }

  async getCustomerWarranties(customerId: string) {
    await this.getCustomerById(customerId);
    return this.repo.getCustomerWarranties(customerId);
  }

  async getCustomerJobCards(customerId: string, page = 1, limit = 20) {
    await this.getCustomerById(customerId);
    return this.repo.getCustomerJobCards(customerId, page, limit);
  }

  async getCustomerActivities(customerId: string, page = 1, limit = 50) {
    await this.getCustomerById(customerId);
    return this.repo.getCustomerActivities(customerId, page, limit);
  }

  async addCustomerNote(
    customerId: string,
    content: string,
    actorId?: string | null,
    actorName?: string | null
  ) {
    await this.getCustomerById(customerId);
    try {
      return await withTransaction(async (tx) => {
        return this.repo.addNote(customerId, content, actorId, actorName, tx);
      });
    } catch {
      return this.repo.addNote(customerId, content, actorId, actorName, db);
    }
  }

  /**
   * Custom Customer Label methods
   */
  async getAllCustomLabels() {
    return this.repo.getAllCustomLabels();
  }

  async getCustomLabelById(id: string) {
    return this.repo.getCustomLabelById(id);
  }

  async createCustomLabel(data: { name: string; color: string; description?: string | null }) {
    return this.repo.createCustomLabel(data);
  }

  async updateCustomLabel(id: string, data: { name?: string; color?: string; description?: string | null }) {
    return this.repo.updateCustomLabel(id, data);
  }

  async deleteCustomLabel(id: string) {
    return this.repo.deleteCustomLabel(id);
  }
}

export const customerService = new CustomerService();
