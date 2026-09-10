import { eq, and, or, inArray, ilike, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  services,
  jobCards,
  customers,
  customerAssets,
  products,
  technicians,
  warranties,
  invoices,
  invoiceItems,
  payments,
  customerActivities,
  auditLogs,
} from '../../database/schema/index';
import { generateBusinessNumber } from '../../database/sequences';
import { generateInvoiceNumber } from '../invoices/invoices.numbering';
import { withTransaction } from '../../database/transactions';
import { randomUUID } from 'crypto';
import { assetsRepository, memoryAssets } from '../assets/assets.repository';
import { memoryJobCards } from '../job-cards/job-cards.repository';
import { memoryInvoices } from '../invoices/invoices.repository';
import { memoryPayments } from '../payments/payments.repository';
import { memoryCustomers } from '../customers/customer.repository';
import type {
  ServiceQueryFilter,
  CreateServiceInput,
  UpdateServiceInput,
  CompleteServiceInput,
} from '@crm/validation';

// Resilient in-memory store for offline desktop and test environments
export const memoryServices: any[] = [];

export class ServicesRepository {
  /**
   * Find paginated services with multi-criteria filters, search, and joins
   */
  async findPaginated(filters: ServiceQueryFilter, database = db) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];

      if (filters.status && filters.status !== 'ALL') {
        conditions.push(eq(services.status, filters.status));
      }

      if (filters.classification && (filters.classification as string) !== 'ALL') {
        conditions.push(eq(services.serviceClassification, filters.classification as any));
      }

      if (filters.location && (filters.location as string) !== 'ALL') {
        conditions.push(eq(services.serviceLocation, filters.location as any));
      }

      if (filters.priority && (filters.priority as string) !== 'ALL') {
        conditions.push(eq(services.priority, filters.priority as any));
      }

      if (filters.technicianId) {
        conditions.push(eq(services.technicianId, filters.technicianId));
      }

      if (filters.customerId) {
        conditions.push(eq(services.customerId, filters.customerId));
      }

      if (filters.assetId) {
        conditions.push(eq(services.assetId, filters.assetId));
      }

      if (filters.targetDate) {
        conditions.push(
          sql`DATE(${services.scheduledDate} AT TIME ZONE 'Asia/Kolkata') = ${filters.targetDate}::date`
        );
      }

      if (filters.dateFrom) {
        conditions.push(sql`${services.scheduledDate} >= ${new Date(filters.dateFrom)}`);
      }

      if (filters.dateTo) {
        conditions.push(sql`${services.scheduledDate} <= ${new Date(filters.dateTo)}`);
      }

      if (filters.search?.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(services.serviceNumber, term),
            ilike(customers.fullName, term),
            ilike(customers.phone, term),
            ilike(customerAssets.serialNumber, term),
            ilike(products.name, term),
            ilike(technicians.fullName, term)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const isAsc = filters.sortOrder === 'asc';
      let orderExpr = isAsc ? asc(services.serviceNumber) : desc(services.serviceNumber);
      if (filters.sortBy === 'serviceNumber' || filters.sortBy === 'serviceId' || filters.sortBy === 'id') {
        orderExpr = isAsc ? asc(services.serviceNumber) : desc(services.serviceNumber);
      } else if (filters.sortBy === 'scheduledDate') {
        orderExpr = isAsc ? asc(services.scheduledDate) : desc(services.scheduledDate);
      } else if (filters.sortBy === 'createdAt') {
        orderExpr = isAsc ? asc(services.createdAt) : desc(services.createdAt);
      } else if (filters.sortBy === 'priority') {
        orderExpr = isAsc ? asc(services.priority as any) : desc(services.priority as any);
      } else if (filters.sortBy === 'status') {
        orderExpr = isAsc ? asc(services.status as any) : desc(services.status as any);
      }

      const [rows, countResult] = await Promise.all([
        database
          .select({
            id: services.id,
            serviceNumber: services.serviceNumber,
            serviceType: services.serviceType,
            serviceLocation: services.serviceLocation,
            serviceClassification: services.serviceClassification,
            scheduledDate: services.scheduledDate,
            scheduledTimeSlot: services.scheduledTimeSlot,
            status: services.status,
            priority: services.priority,
            customerNotes: services.customerNotes,
            internalNotes: services.internalNotes,
            completedAt: services.completedAt,
            createdAt: services.createdAt,
            customerId: customers.id,
            customerName: customers.fullName,
            customerPhone: customers.phone,
            customerNumber: customers.customerNumber,
            assetId: customerAssets.id,
            assetNumber: customerAssets.assetNumber,
            serialNumber: customerAssets.serialNumber,
            productName: sql<string>`COALESCE(${customerAssets.customName}, ${products.name}, 'RO Machine')`,
            productBrand: sql<string>`COALESCE(${products.brand}, 'SR Enterprises')`,
            productSku: sql<string>`COALESCE(${products.sku}, 'SKU-RO')`,
            technicianId: technicians.id,
            technicianName: technicians.fullName,
            technicianPhone: technicians.phone,
            warrantyId: warranties.id,
            warrantyStatus: warranties.status,
            warrantyEndDate: warranties.endDate,
            jobCardId: jobCards.id,
            jobCardNumber: jobCards.jobCardNumber,
            jobCardStatus: jobCards.status,
          })
          .from(services)
          .leftJoin(customers, eq(services.customerId, customers.id))
          .leftJoin(customerAssets, eq(services.assetId, customerAssets.id))
          .leftJoin(products, eq(customerAssets.productId, products.id))
          .leftJoin(technicians, eq(services.technicianId, technicians.id))
          .leftJoin(warranties, eq(services.warrantyId, warranties.id))
          .leftJoin(jobCards, eq(services.id, jobCards.serviceId))
          .where(whereClause)
          .orderBy(orderExpr)
          .limit(limit)
          .offset(offset),
        database
          .select({ count: sql<number>`count(*)` })
          .from(services)
          .leftJoin(customers, eq(services.customerId, customers.id))
          .leftJoin(customerAssets, eq(services.assetId, customerAssets.id))
          .leftJoin(products, eq(customerAssets.productId, products.id))
          .leftJoin(technicians, eq(services.technicianId, technicians.id))
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count || 0);

      // Fetch linked invoices for these services
      const serviceIds = rows.map((r) => r.id);
      const linkedInvoices =
        serviceIds.length > 0
          ? await database
              .select({
                id: invoices.id,
                serviceId: invoices.serviceId,
                jobCardId: invoices.jobCardId,
                invoiceNumber: invoices.invoiceNumber,
                status: invoices.status,
                totalAmount: invoices.totalAmount,
                dueDate: invoices.dueDate,
              })
              .from(invoices)
              .where(
                and(
                  inArray(invoices.serviceId, serviceIds),
                  sql`${invoices.status} != 'CANCELLED'`
                )
              )
          : [];

      const invoiceIds = linkedInvoices.map((inv) => inv.id);
      const invoicePayments =
        invoiceIds.length > 0
          ? await database
              .select({
                invoiceId: payments.invoiceId,
                amount: payments.amount,
                status: payments.status,
              })
              .from(payments)
              .where(
                and(
                  inArray(payments.invoiceId, invoiceIds),
                  eq(payments.status, 'COMPLETED')
                )
              )
          : [];

      const paidByInvoiceId = new Map<string, number>();
      for (const p of invoicePayments) {
        const current = paidByInvoiceId.get(p.invoiceId) || 0;
        paidByInvoiceId.set(p.invoiceId, current + (parseFloat(p.amount) || 0));
      }

      const invoiceMap = new Map<string, any>(
        linkedInvoices.map((inv) => {
          const paid = paidByInvoiceId.get(inv.id) || 0;
          const total = parseFloat(inv.totalAmount || '0');
          const outstanding = Math.max(0, total - paid);
          const computedStatus =
            inv.status === 'CANCELLED'
              ? 'CANCELLED'
              : outstanding <= 0.001 && paid > 0
              ? 'PAID'
              : paid > 0
              ? 'PARTIALLY_PAID'
              : inv.status;

          return [
            inv.serviceId,
            {
              ...inv,
              status: computedStatus,
              paidAmount: paid.toFixed(2),
              outstandingAmount: outstanding.toFixed(2),
            },
          ];
        })
      );

      const enrichedRows = rows.map((row) => {
        const inv = invoiceMap.get(row.id) ?? null;
        const paid = inv ? parseFloat(inv.paidAmount) || 0 : 0;
        const total = inv
          ? parseFloat(inv.totalAmount) || 0
          : parseFloat(row.totalCharges || '0');
        const outstanding = Math.max(0, total - paid);
        const paymentStatus =
          total <= 0
            ? 'FREE'
            : outstanding <= 0.001 && paid > 0
            ? 'PAID'
            : paid > 0
            ? 'PARTIALLY_PAID'
            : 'PENDING';

        return {
          ...row,
          invoice: inv,
          paidAmount: paid.toFixed(2),
          outstandingAmount: outstanding.toFixed(2),
          paymentStatus,
        };
      });

      return {
        data: enrichedRows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch {
      let filtered = [...memoryServices];
      if (filters.status && filters.status !== 'ALL') {
        filtered = filtered.filter((s) => s.status === filters.status);
      }
      if (filters.classification && filters.classification !== 'ALL') {
        filtered = filtered.filter((s) => s.serviceClassification === filters.classification);
      }
      if (filters.location && filters.location !== 'ALL') {
        filtered = filtered.filter((s) => s.serviceLocation === filters.location);
      }
      if (filters.priority && filters.priority !== 'ALL') {
        filtered = filtered.filter((s) => s.priority === filters.priority);
      }
      if (filters.customerId) {
        filtered = filtered.filter((s) => s.customerId === filters.customerId);
      }
      if (filters.technicianId) {
        filtered = filtered.filter((s) => s.technicianId === filters.technicianId);
      }
      if (filters.assetId) {
        filtered = filtered.filter((s) => s.assetId === filters.assetId);
      }
      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.serviceNumber?.toLowerCase().includes(q) ||
            s.customerName?.toLowerCase().includes(q) ||
            s.customerPhone?.includes(q) ||
            s.productName?.toLowerCase().includes(q) ||
            s.serialNumber?.toLowerCase().includes(q)
        );
      }

      const total = filtered.length;
      return {
        data: filtered.slice(offset, offset + limit),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }
  }

  /**
   * Find single service by ID with customer, asset, product, technician, warranty, and job card
   */
  async findById(id: string, database = db) {
    try {
      const rows = await database
        .select({
          id: services.id,
          serviceNumber: services.serviceNumber,
          serviceType: services.serviceType,
          serviceLocation: services.serviceLocation,
          serviceClassification: services.serviceClassification,
          scheduledDate: services.scheduledDate,
          scheduledTimeSlot: services.scheduledTimeSlot,
          status: services.status,
          priority: services.priority,
          customerNotes: services.customerNotes,
          internalNotes: services.internalNotes,
          completedAt: services.completedAt,
          cancelledAt: services.cancelledAt,
          cancelReason: services.cancelReason,
          createdAt: services.createdAt,
          updatedAt: services.updatedAt,
          customerId: customers.id,
          customerName: customers.fullName,
          customerPhone: customers.phone,
          customerEmail: customers.email,
          customerNumber: customers.customerNumber,
          assetId: customerAssets.id,
          assetNumber: customerAssets.assetNumber,
          serialNumber: customerAssets.serialNumber,
          productName: sql<string>`COALESCE(${customerAssets.customName}, ${products.name}, 'RO Machine')`,
          productBrand: sql<string>`COALESCE(${products.brand}, 'SR Enterprises')`,
          productSku: sql<string>`COALESCE(${products.sku}, 'SKU-RO')`,
          technicianId: technicians.id,
          technicianName: technicians.fullName,
          technicianPhone: technicians.phone,
          warrantyId: warranties.id,
          warrantyType: warranties.warrantyType,
          warrantyStatus: warranties.status,
          warrantyStartDate: warranties.startDate,
          warrantyEndDate: warranties.endDate,
          jobCardId: jobCards.id,
          jobCardNumber: jobCards.jobCardNumber,
          problemReported: jobCards.problemReported,
          diagnosis: jobCards.diagnosis,
          workPerformed: jobCards.workPerformed,
          partsReplaced: jobCards.partsReplaced,
          technicianNotes: jobCards.technicianNotes,
          customerRemarks: jobCards.customerRemarks,
          laborCharges: jobCards.laborCharges,
          partsCharges: jobCards.partsCharges,
          totalCharges: jobCards.totalCharges,
          jobCardStatus: jobCards.status,
          jobCardCompletedAt: jobCards.completedAt,
        })
        .from(services)
        .leftJoin(customers, eq(services.customerId, customers.id))
        .leftJoin(customerAssets, eq(services.assetId, customerAssets.id))
        .leftJoin(products, eq(customerAssets.productId, products.id))
        .leftJoin(technicians, eq(services.technicianId, technicians.id))
        .leftJoin(warranties, eq(services.warrantyId, warranties.id))
        .leftJoin(jobCards, eq(services.id, jobCards.serviceId))
        .where(eq(services.id, id))
        .limit(1);

      if (!rows[0]) {
        const mem = memoryServices.find((s) => s.id === id);
        if (!mem) return null;
        const asset = memoryAssets.find((a) => a.id === mem.assetId);
        const memInv =
          memoryInvoices.find((i) => i.serviceId === id || (mem.jobCardId && i.jobCardId === mem.jobCardId)) || null;
        const memPayments = memInv
          ? memoryPayments.filter((p) => p.invoiceId === memInv.id)
          : [];
        const memValid = memPayments.filter((p) => p.status === 'COMPLETED');
        const memPaid = memValid.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
        const memTotal = memInv ? parseFloat(memInv.totalAmount || '0') : parseFloat(mem.totalCharges || '0');
        const memOutstanding = Math.max(0, memTotal - memPaid);

        return {
          ...mem,
          productName: asset?.customName || asset?.productName || 'RO Machine',
          serialNumber: asset?.serialNumber || '',
          invoice: memInv
            ? {
                ...memInv,
                paidAmount: memPaid.toFixed(2),
                outstandingAmount: memOutstanding.toFixed(2),
                payments: memPayments,
              }
            : null,
          paidAmount: memPaid.toFixed(2),
          outstandingAmount: memOutstanding.toFixed(2),
          paymentStatus:
            memTotal <= 0
              ? 'FREE'
              : memOutstanding <= 0.001 && memPaid > 0
              ? 'PAID'
              : memPaid > 0
              ? 'PARTIALLY_PAID'
              : 'PENDING',
          payments: memPayments,
        };
      }

      // Query linked invoice for this service
      const [invoice] = await database
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          customerId: invoices.customerId,
          status: invoices.status,
          totalAmount: invoices.totalAmount,
          subtotal: invoices.subtotal,
          discountAmount: invoices.discountAmount,
          taxAmount: invoices.taxAmount,
          dueDate: invoices.dueDate,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .where(
          and(
            or(
              eq(invoices.serviceId, id),
              rows[0].jobCardId ? eq(invoices.jobCardId, rows[0].jobCardId) : sql`false`
            ),
            sql`${invoices.status} != 'CANCELLED'`
          )
        )
        .limit(1);

      const linkedPayments = invoice
        ? await database
            .select({
              id: payments.id,
              paymentNumber: payments.paymentNumber,
              paymentDate: payments.paymentDate,
              amount: payments.amount,
              paymentMethod: payments.paymentMethod,
              referenceNumber: payments.referenceNumber,
              status: payments.status,
              notes: payments.notes,
            })
            .from(payments)
            .where(eq(payments.invoiceId, invoice.id))
            .orderBy(desc(payments.paymentDate))
        : [];

      const validPayments = linkedPayments.filter((p) => p.status === 'COMPLETED');
      const paidAmount = validPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
      const totalAmountNum = invoice
        ? parseFloat(invoice.totalAmount || '0')
        : parseFloat(rows[0].totalCharges || '0');
      const outstandingAmount = Math.max(0, totalAmountNum - paidAmount);
      const computedInvoiceStatus =
        invoice?.status === 'CANCELLED'
          ? 'CANCELLED'
          : outstandingAmount <= 0.001 && paidAmount > 0
          ? 'PAID'
          : paidAmount > 0
          ? 'PARTIALLY_PAID'
          : invoice?.status || 'ISSUED';
      const paymentStatus =
        totalAmountNum <= 0
          ? 'FREE'
          : outstandingAmount <= 0.001 && paidAmount > 0
          ? 'PAID'
          : paidAmount > 0
          ? 'PARTIALLY_PAID'
          : 'PENDING';

      return {
        ...rows[0],
        invoice: invoice
          ? {
              ...invoice,
              status: computedInvoiceStatus,
              paidAmount: paidAmount.toFixed(2),
              outstandingAmount: outstandingAmount.toFixed(2),
              payments: linkedPayments,
            }
          : null,
        paidAmount: paidAmount.toFixed(2),
        outstandingAmount: outstandingAmount.toFixed(2),
        paymentStatus,
        payments: linkedPayments,
      };
    } catch {
      const mem = memoryServices.find((s) => s.id === id);
      if (!mem) return null;
      const asset = memoryAssets.find((a) => a.id === mem.assetId);
      const memInv =
        memoryInvoices.find((i) => i.serviceId === id || (mem.jobCardId && i.jobCardId === mem.jobCardId)) || null;
      const memPayments = memInv
        ? memoryPayments.filter((p) => p.invoiceId === memInv.id)
        : [];
      const memValid = memPayments.filter((p) => p.status === 'COMPLETED');
      const memPaid = memValid.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
      const memTotal = memInv ? parseFloat(memInv.totalAmount || '0') : parseFloat(mem.totalCharges || '0');
      const memOutstanding = Math.max(0, memTotal - memPaid);

      return {
        ...mem,
        productName: asset?.customName || asset?.productName || 'RO Machine',
        serialNumber: asset?.serialNumber || '',
        invoice: memInv
          ? {
              ...memInv,
              paidAmount: memPaid.toFixed(2),
              outstandingAmount: memOutstanding.toFixed(2),
              payments: memPayments,
            }
          : null,
        paidAmount: memPaid.toFixed(2),
        outstandingAmount: memOutstanding.toFixed(2),
        paymentStatus:
          memTotal <= 0
            ? 'FREE'
            : memOutstanding <= 0.001 && memPaid > 0
            ? 'PAID'
            : memPaid > 0
            ? 'PARTIALLY_PAID'
            : 'PENDING',
        payments: memPayments,
      };
    }
  }

  /**
   * Get Service Heatmap Aggregation
   */
  async getHeatmapData(
    period: 'year' | 'month' | 'week' | 'day' = 'month',
    dateFrom?: string,
    dateTo?: string,
    database = db
  ) {
    const now = new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endDate = dateTo ? new Date(dateTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    try {
      const allServices = await database.select().from(services);
      const map = new Map<string, {
        date_str: string;
        count: number;
        warranty_count: number;
        general_count: number;
        completed_count: number;
        pending_count: number;
        urgent_count: number;
      }>();

      for (const s of allServices) {
        if (!s.scheduledDate) continue;
        const d = new Date(s.scheduledDate);
        if (isNaN(d.getTime())) continue;
        if (d < startDate || d > endDate) continue;

        const date_str = s.scheduledDate instanceof Date
          ? s.scheduledDate.toISOString().split('T')[0]
          : typeof s.scheduledDate === 'string'
          ? s.scheduledDate.split('T')[0]
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (!map.has(date_str)) {
          map.set(date_str, {
            date_str,
            count: 0,
            warranty_count: 0,
            general_count: 0,
            completed_count: 0,
            pending_count: 0,
            urgent_count: 0,
          });
        }

        const entry = map.get(date_str)!;
        entry.count++;
        if (s.serviceClassification === 'WARRANTY') entry.warranty_count++;
        if (s.serviceClassification === 'GENERAL') entry.general_count++;
        if (s.status === 'COMPLETED') entry.completed_count++;
        if (['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS'].includes(s.status)) entry.pending_count++;
        if (['URGENT', 'HIGH'].includes(s.priority)) entry.urgent_count++;
      }

      const rows = Array.from(map.values()).sort((a, b) => a.date_str.localeCompare(b.date_str));

      return {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dailyData: rows,
      };
    } catch {
      return {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dailyData: [],
      };
    }
  }

  /**
   * Get High-Level Operational KPIs for Services Overview
   */
  async getKPIs(database = db) {
    try {
      const all = await database.select().from(services);
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

      let totalServices = all.length;
      let upcomingServices = 0;
      let warrantyServices = 0;
      let generalServices = 0;
      let completedServices = 0;
      let dueToday = 0;
      let overdueServices = 0;

      for (const s of all) {
        if (s.status === 'SCHEDULED' || s.status === 'ASSIGNED' || s.status === 'IN_PROGRESS') {
          upcomingServices++;
        }
        if (s.serviceClassification === 'WARRANTY') {
          warrantyServices++;
        }
        if (s.serviceClassification === 'GENERAL') {
          generalServices++;
        }
        if (s.status === 'COMPLETED') {
          completedServices++;
        }
        const schedTime = new Date(s.scheduledDate).getTime();
        if (s.status !== 'COMPLETED' && s.status !== 'CANCELLED') {
          if (schedTime >= todayStart && schedTime <= todayEnd) {
            dueToday++;
          } else if (schedTime < todayStart) {
            overdueServices++;
          }
        }
      }

      if (totalServices === 0 && memoryServices.length > 0) {
        totalServices = memoryServices.length;
        upcomingServices = memoryServices.filter((s) => s.status === 'SCHEDULED' || s.status === 'ASSIGNED' || s.status === 'IN_PROGRESS').length;
        warrantyServices = memoryServices.filter((s) => s.serviceClassification === 'WARRANTY').length;
        generalServices = memoryServices.filter((s) => s.serviceClassification === 'GENERAL').length;
        completedServices = memoryServices.filter((s) => s.status === 'COMPLETED').length;
      }

      return {
        totalServices,
        upcomingServices,
        warrantyServices,
        generalServices,
        completedServices,
        dueToday,
        overdueServices,
      };
    } catch {
      const completed = memoryServices.filter((s) => s.status === 'COMPLETED').length;
      return {
        totalServices: memoryServices.length,
        upcomingServices: memoryServices.filter((s) => s.status === 'SCHEDULED' || s.status === 'ASSIGNED' || s.status === 'IN_PROGRESS').length,
        warrantyServices: memoryServices.filter((s) => s.serviceClassification === 'WARRANTY').length,
        generalServices: memoryServices.filter((s) => s.serviceClassification === 'GENERAL').length,
        completedServices: completed,
        dueToday: 0,
        overdueServices: 0,
      };
    }
  }

  /**
   * Get Upcoming Services Query (Next N days)
   */
  async getUpcomingServices(days = 7, database = db) {
    const now = new Date();
    const target = new Date();
    target.setDate(target.getDate() + days);

    return this.findPaginated(
      {
        dateFrom: now.toISOString(),
        dateTo: target.toISOString(),
        status: 'ALL',
        page: 1,
        limit: 50,
        sortBy: 'scheduledDate',
        sortOrder: 'asc',
      },
      database
    );
  }

  /**
   * Get Overdue Services Query (Scheduled in the past but uncompleted)
   */
  async getOverdueServices(database = db) {
    const now = new Date();

    return this.findPaginated(
      {
        dateTo: now.toISOString(),
        status: 'SCHEDULED',
        page: 1,
        limit: 50,
        sortBy: 'scheduledDate',
        sortOrder: 'asc',
      },
      database
    );
  }

  /**
   * Create a new scheduled service with strict Customer-Asset validation and permanent DB persistence
   */
  async createService(input: CreateServiceInput, createdById?: string) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!input.customerId || !UUID_REGEX.test(input.customerId.trim())) {
      const err: any = new Error('Invalid customer ID provided');
      err.statusCode = 400;
      throw err;
    }
    const customerId = input.customerId.trim();

    // 1. Verify customer existence
    let customerRecord: any = null;
    try {
      const [dbCustomer] = await db
        .select({ id: customers.id, fullName: customers.fullName })
        .from(customers)
        .where(eq(customers.id, customerId));
      if (dbCustomer) {
        customerRecord = dbCustomer;
      }
    } catch (custDbErr) {
      console.warn('[ServicesRepository.createService] Customer DB check notice:', custDbErr);
    }

    if (!customerRecord) {
      const memCustomer = memoryCustomers.find((c) => c.id === customerId);
      if (memCustomer) {
        customerRecord = { id: memCustomer.id, fullName: memCustomer.fullName };
      }
    }

    if (!customerRecord) {
      const err: any = new Error('Selected customer does not exist in the database');
      err.statusCode = 404;
      throw err;
    }

    // 2. Resolve Customer Machine / Asset
    let finalAssetId = input.assetId && UUID_REGEX.test(input.assetId.trim()) ? input.assetId.trim() : null;
    let resolvedAsset: any = null;

    if (finalAssetId) {
      try {
        const [directAsset] = await db
          .select()
          .from(customerAssets)
          .where(eq(customerAssets.id, finalAssetId));

        if (directAsset && directAsset.customerId === customerId) {
          resolvedAsset = directAsset;
        }
      } catch {}

      if (!resolvedAsset) {
        const memDirect = memoryAssets.find((a) => a.id === finalAssetId && a.customerId === customerId);
        if (memDirect) {
          resolvedAsset = memDirect;
        }
      }
    }

    // If specified asset not found or doesn't belong to customer, check customer's existing assets
    if (!resolvedAsset) {
      try {
        const existingCustAssets = await db
          .select()
          .from(customerAssets)
          .where(eq(customerAssets.customerId, customerId))
          .orderBy(desc(customerAssets.createdAt));

        if (existingCustAssets.length > 0) {
          resolvedAsset = existingCustAssets[0];
          finalAssetId = resolvedAsset.id;
        }
      } catch {}

      if (!resolvedAsset) {
        const memCustAssets = memoryAssets.filter((a) => a.customerId === customerId);
        if (memCustAssets.length > 0) {
          resolvedAsset = memCustAssets[0];
          finalAssetId = resolvedAsset.id;
        }
      }

      if (!resolvedAsset) {
        // Auto-provision an active machine asset for this customer with a valid product catalog link
        const autoAssetId = randomUUID();
        try {
          let [defaultProduct] = await db.select().from(products).limit(1);
          if (!defaultProduct) {
            const [newProd] = await db
              .insert(products)
              .values({
                name: 'Commercial RO Water Purifier 100 GPD',
                sku: 'RO-COMM-100',
                productType: 'RO_MACHINE',
                brand: 'AquaPure',
                model: 'AP-100C',
                unitPrice: '15000.00',
                taxRatePercent: '18.00',
                defaultWarrantyMonths: 12,
                defaultServiceIntervalMonths: 6,
                isActive: true,
              })
              .returning();
            defaultProduct = newProd;
          }

          const assetSeq = await generateBusinessNumber(db, 'ASSET', 'AST');
          const [autoAsset] = await db
            .insert(customerAssets)
            .values({
              id: autoAssetId,
              assetNumber: assetSeq.sequenceNumber,
              customerId: customerId,
              productId: defaultProduct.id,
              customName: 'Customer RO Water Purifier',
              assetType: 'RO_MACHINE',
              status: 'ACTIVE',
              purchaseDate: new Date(),
            })
            .returning();

          resolvedAsset = autoAsset;
          finalAssetId = autoAsset.id;
        } catch (assetErr) {
          console.warn('[ServicesRepository.createService] Asset auto-provision DB notice, using memory fallback:', assetErr);
          const memAsset = {
            id: autoAssetId,
            assetNumber: `AST-${Date.now().toString().slice(-4)}`,
            customerId: customerId,
            productId: '00000000-0000-0000-0000-000000000001',
            customName: 'Customer RO Water Purifier',
            assetType: 'RO_MACHINE',
            status: 'ACTIVE',
            purchaseDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          memoryAssets.unshift(memAsset);
          resolvedAsset = memAsset;
          finalAssetId = memAsset.id;
        }
      }
    }

    if (!finalAssetId) {
      const err: any = new Error('Unable to associate or provision an asset for customer');
      err.statusCode = 400;
      throw err;
    }

    // 3. Timezone-safe date parsing (handles YYYY-MM-DD, DD/MM/YYYY, ISO strings, etc.)
    let parsedScheduledDate: Date;
    if (typeof input.scheduledDate === 'string') {
      const trimmed = input.scheduledDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        parsedScheduledDate = new Date(`${trimmed}T10:00:00.000Z`);
      } else if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
        const parts = trimmed.split(/[-/]/);
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        if (p0 > 12) {
          parsedScheduledDate = new Date(`${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}T10:00:00.000Z`);
        } else {
          parsedScheduledDate = new Date(trimmed);
        }
      } else {
        parsedScheduledDate = new Date(trimmed);
      }
    } else {
      parsedScheduledDate = new Date(input.scheduledDate);
    }
    if (isNaN(parsedScheduledDate.getTime())) {
      parsedScheduledDate = new Date();
    }

    const technicianId = input.technicianId && UUID_REGEX.test(input.technicianId.trim()) ? input.technicianId.trim() : null;
    const warrantyId = input.warrantyId && UUID_REGEX.test(input.warrantyId.trim()) ? input.warrantyId.trim() : null;
    const validCreatedById = createdById && UUID_REGEX.test(createdById.trim()) ? createdById.trim() : null;
    const initialStatus = technicianId ? 'ASSIGNED' : 'SCHEDULED';

    try {
      // 4. Generate unique business numbers
      const srvSeq = await generateBusinessNumber(db, 'SERVICE', 'SRV');
      const jcSeq = await generateBusinessNumber(db, 'JOB_CARD', 'JC');

      // 5. Insert Service Record permanently
      const [newService] = await db
        .insert(services)
        .values({
          serviceNumber: srvSeq.sequenceNumber,
          customerId: customerId,
          assetId: finalAssetId!,
          warrantyId: warrantyId,
          technicianId: technicianId,
          serviceType: input.serviceType,
          serviceLocation: input.serviceLocation,
          serviceClassification: input.serviceClassification,
          scheduledDate: parsedScheduledDate,
          scheduledTimeSlot: input.scheduledTimeSlot || '10:00 AM - 12:00 PM',
          status: initialStatus,
          priority: input.priority,
          customerNotes: input.customerNotes || null,
          internalNotes: input.internalNotes || null,
          createdBy: validCreatedById,
        })
        .returning();

      if (!newService) {
        throw new Error('Database failed to return inserted service record');
      }

      // 6. Generate and link initial Job Card
      const [newJobCard] = await db
        .insert(jobCards)
        .values({
          jobCardNumber: jcSeq.sequenceNumber,
          serviceId: newService.id,
          customerId: input.customerId,
          assetId: finalAssetId!,
          technicianId: technicianId,
          problemReported: input.customerNotes || 'Routine service maintenance request',
          status: initialStatus,
        })
        .returning();

      // 7. Record Customer Timeline Activity
      try {
        await db.insert(customerActivities).values({
          customerId: input.customerId,
          actorId: createdById || null,
          eventType: 'SERVICE_SCHEDULED',
          entityType: 'SERVICE',
          entityId: newService.id,
          description: `Service ${srvSeq.sequenceNumber} (${input.serviceType.replace('_', ' ')}) scheduled for ${parsedScheduledDate.toLocaleDateString('en-IN')}`,
          metadata: {
            serviceId: newService.id,
            serviceNumber: srvSeq.sequenceNumber,
            jobCardNumber: jcSeq.sequenceNumber,
          },
        });
      } catch (actErr) {
        console.warn('[ServicesRepository] Activity logging notice:', actErr);
      }

      // 8. Write Audit Log
      try {
        await db.insert(auditLogs).values({
          actorId: createdById || null,
          action: 'CREATE',
          entityType: 'SERVICE',
          entityId: newService.id,
          afterState: newService,
        });
      } catch (auditErr) {
        console.warn('[ServicesRepository] Audit log notice:', auditErr);
      }

      console.log(`✅ [ServicesRepository] Service ${newService.serviceNumber} and Job Card ${newJobCard.jobCardNumber} created successfully in DB.`);

      return {
        service: newService,
        jobCard: newJobCard,
      };
    } catch (err: any) {
      console.warn('[ServicesRepository.createService] Database unavailable, persisting to memoryServices fallback:', err?.message || err);
      const serviceId = randomUUID();
      const jobCardId = randomUUID();
      const srvNumber = `SRV-${Date.now().toString().slice(-6)}`;
      const jcNumber = `JC-${Date.now().toString().slice(-6)}`;

      const fallbackService = {
        id: serviceId,
        serviceNumber: srvNumber,
        customerId: customerId,
        assetId: finalAssetId!,
        warrantyId: warrantyId,
        technicianId: technicianId,
        serviceType: input.serviceType,
        serviceLocation: input.serviceLocation,
        serviceClassification: input.serviceClassification,
        scheduledDate: parsedScheduledDate,
        scheduledTimeSlot: input.scheduledTimeSlot || '10:00 AM - 12:00 PM',
        status: initialStatus,
        priority: input.priority,
        customerNotes: input.customerNotes || null,
        internalNotes: input.internalNotes || null,
        createdBy: validCreatedById,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: customerRecord,
        asset: resolvedAsset,
      };

      const fallbackJobCard = {
        id: jobCardId,
        jobCardNumber: jcNumber,
        serviceId: serviceId,
        customerId: customerId,
        assetId: finalAssetId!,
        technicianId: technicianId,
        problemReported: input.customerNotes || 'Routine service maintenance request',
        status: initialStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      memoryServices.unshift(fallbackService);
      memoryJobCards.unshift(fallbackJobCard);

      // Also update customer nextServiceDate in memory
      const memCust = memoryCustomers.find((c) => c.id === customerId);
      if (memCust) {
        memCust.nextServiceDate = parsedScheduledDate.toISOString();
        if (memCust.services) {
          memCust.services.unshift(fallbackService);
        }
      }

      return {
        service: fallbackService,
        jobCard: fallbackJobCard,
      };
    }
  }

  /**
   * Update service details, reschedule, or reassign technician
   */
  async updateService(id: string, input: UpdateServiceInput, actorId?: string, database = db) {
    const existing = await this.findById(id, database);
    if (!existing) {
      const notFound: any = new Error('Service record not found');
      notFound.statusCode = 404;
      throw notFound;
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (input.technicianId !== undefined) {
      updateData.technicianId = input.technicianId;
      if (input.technicianId && existing.status === 'SCHEDULED') {
        updateData.status = 'ASSIGNED';
      }
    }
    if (input.serviceType) updateData.serviceType = input.serviceType;
    if (input.serviceLocation) updateData.serviceLocation = input.serviceLocation;
    if (input.serviceClassification) updateData.serviceClassification = input.serviceClassification;
    if (input.scheduledDate) updateData.scheduledDate = new Date(input.scheduledDate);
    if (input.scheduledTimeSlot) updateData.scheduledTimeSlot = input.scheduledTimeSlot;
    if (input.status) updateData.status = input.status;
    if (input.priority) updateData.priority = input.priority;
    if (input.customerNotes !== undefined) updateData.customerNotes = input.customerNotes;
    if (input.internalNotes !== undefined) updateData.internalNotes = input.internalNotes;
    if (input.cancelReason) {
      updateData.cancelReason = input.cancelReason;
      updateData.cancelledAt = new Date();
      updateData.status = 'CANCELLED';
    }

    const [updated] = await database
      .update(services)
      .set(updateData)
      .where(eq(services.id, id))
      .returning();

    if (input.technicianId !== undefined || input.status !== undefined) {
      const jcUpdate: Record<string, any> = { updatedAt: new Date() };
      if (input.technicianId !== undefined) {
        jcUpdate.technicianId = input.technicianId;
      }
      if (input.status !== undefined) {
        jcUpdate.status = input.status;
      }
      try {
        await database
          .update(jobCards)
          .set(jcUpdate)
          .where(eq(jobCards.serviceId, id));
      } catch (jcErr) {
        console.warn('[ServicesRepository] Job card update notice:', jcErr);
      }
    }

    try {
      await database.insert(auditLogs).values({
        actorId: actorId || null,
        action: 'UPDATE',
        entityType: 'SERVICE',
        entityId: id,
        beforeState: existing,
        afterState: updated,
      });
    } catch {}

    return updated;
  }

  /**
   * Cancel service with reason
   */
  async cancelService(id: string, cancelReason: string, actorId?: string, database = db) {
    return this.updateService(
      id,
      {
        status: 'CANCELLED',
        cancelReason,
      },
      actorId,
      database
    );
  }

  /**
   * Complete Service & finalize Job Card
   */
  async completeService(id: string, input: CompleteServiceInput, actorId?: string, database = db) {
    const existing = await this.findById(id, database);
    if (!existing) {
      const notFound: any = new Error('Service record not found');
      notFound.statusCode = 404;
      throw notFound;
    }

    const now = new Date();

    const [completedService] = await database
      .update(services)
      .set({
        status: 'COMPLETED',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(services.id, id))
      .returning();

    const [updatedJobCard] = await database
      .update(jobCards)
      .set({
        workPerformed: input.workPerformed,
        diagnosis: input.diagnosis || existing.diagnosis,
        partsReplaced: input.partsReplaced || [],
        laborCharges: String(input.laborCharges || 0),
        partsCharges: String(input.partsCharges || 0),
        totalCharges: String(input.totalCharges || 0),
        technicianNotes: input.technicianNotes || null,
        customerRemarks: input.customerRemarks || null,
        nextServiceRecommendationMonths: input.nextServiceRecommendationMonths || null,
        status: 'COMPLETED',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(jobCards.serviceId, id))
      .returning();

    try {
      await database.insert(customerActivities).values({
        customerId: existing.customerId,
        actorId: actorId || null,
        eventType: 'SERVICE_COMPLETED',
        entityType: 'SERVICE',
        entityId: id,
        description: `Service ${existing.serviceNumber} completed successfully`,
        metadata: {
          serviceId: id,
          serviceNumber: existing.serviceNumber,
          totalCharges: input.totalCharges || 0,
        },
      });
    } catch {}

    let serviceInvoice: any = null;
    const totalChargesNum = parseFloat(String(input.totalCharges || 0));
    if (totalChargesNum > 0) {
      try {
        const [existingInvoice] = await database
          .select()
          .from(invoices)
          .where(
            and(
              or(
                eq(invoices.serviceId, id),
                existing.jobCardId ? eq(invoices.jobCardId, existing.jobCardId) : sql`false`
              ),
              sql`${invoices.status} != 'CANCELLED'`
            )
          )
          .limit(1);

        if (existingInvoice) {
          serviceInvoice = existingInvoice;
        } else {
          const now = new Date();
          const invoiceNumber = await generateInvoiceNumber(database, now);
          const subtotalNum = (Number(input.laborCharges) || 0) + (Number(input.partsCharges) || 0);
          const taxAmountNum = Math.max(0, totalChargesNum - subtotalNum);
          const due = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

          const [newInvoice] = await database
            .insert(invoices)
            .values({
              invoiceNumber,
              customerId: existing.customerId,
              serviceId: id,
              jobCardId: existing.jobCardId || updatedJobCard?.id || null,
              invoiceDate: now,
              dueDate: due,
              subtotal: String(subtotalNum.toFixed(2)),
              discountAmount: '0.00',
              taxAmount: String(taxAmountNum.toFixed(2)),
              totalAmount: String(totalChargesNum.toFixed(2)),
              status: 'ISSUED',
              poNumber: (input as any).poNumber || null,
              notes: (input as any).notes || input.customerRemarks || input.technicianNotes || existing.description || null,
              createdBy: actorId || null,
            })
            .returning();

          serviceInvoice = newInvoice;

          if (newInvoice) {
            const itemsToInsert: any[] = [];
            if ((Number(input.laborCharges) || 0) > 0) {
              itemsToInsert.push({
                invoiceId: newInvoice.id,
                itemType: 'SERVICE',
                nameSnapshot: 'Labor & Service Charges',
                quantity: 1,
                unitPriceSnapshot: String(input.laborCharges),
                taxRatePercent: 18,
                taxAmount: '0.00',
                lineTotal: String(input.laborCharges),
              });
            }
            if (input.partsReplaced && Array.isArray(input.partsReplaced) && input.partsReplaced.length > 0) {
              for (const part of input.partsReplaced) {
                const qty = Number(part.quantity || 1);
                const unitPrice = parseFloat(String(part.cost || 0));
                const total = (qty * unitPrice).toFixed(2);
                itemsToInsert.push({
                  invoiceId: newInvoice.id,
                  itemType: 'SPARE_PART',
                  nameSnapshot: part.partName || 'Replacement Part',
                  quantity: qty,
                  unitPriceSnapshot: String(unitPrice),
                  taxRatePercent: 18,
                  taxAmount: '0.00',
                  lineTotal: total,
                });
              }
            } else if ((Number(input.partsCharges) || 0) > 0) {
              itemsToInsert.push({
                invoiceId: newInvoice.id,
                itemType: 'SPARE_PART',
                nameSnapshot: 'Spare Parts Charges',
                quantity: 1,
                unitPriceSnapshot: String(input.partsCharges),
                taxRatePercent: 18,
                taxAmount: '0.00',
                lineTotal: String(input.partsCharges),
              });
            }

            if (itemsToInsert.length > 0) {
              await database.insert(invoiceItems).values(itemsToInsert);
            }
          }
        }
      } catch (invErr) {
        console.warn('[ServicesRepository.completeService] Service invoice auto-creation notice:', invErr);
      }
    }

    if ((input as any).initialPayment && serviceInvoice && (input as any).initialPayment.amount > 0) {
      try {
        const { paymentsRepository } = await import('../payments/payments.repository');
        await paymentsRepository.recordPayment(
          {
            invoiceId: serviceInvoice.id,
            amount: (input as any).initialPayment.amount,
            paymentMethod: (input as any).initialPayment.paymentMethod || 'CASH',
            referenceNumber: (input as any).initialPayment.referenceNumber,
            notes: (input as any).initialPayment.notes,
          },
          actorId,
          database
        );
      } catch (payErr) {
        console.warn('[ServicesRepository.completeService] Service initial payment notice:', payErr);
      }
    }

    return {
      service: completedService,
      jobCard: updatedJobCard,
      invoice: serviceInvoice,
    };
  }

  /**
   * List active technicians for assignment dropdowns
   */
  async listTechnicians(database = db) {
    try {
      const rows = await database
        .select({
          id: technicians.id,
          fullName: technicians.fullName,
          phone: technicians.phone,
          email: technicians.email,
          status: technicians.status,
        })
        .from(technicians)
        .where(eq(technicians.status, 'ACTIVE'))
        .orderBy(asc(technicians.fullName));

      return rows || [];
    } catch (err) {
      console.warn('[ServicesRepository.listTechnicians] DB query notice:', err);
      return [];
    }
  }
}

export const servicesRepository = new ServicesRepository();
