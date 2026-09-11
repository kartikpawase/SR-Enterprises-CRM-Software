import { db } from '../../database/client';
import {
  rentals,
  rentalPayments,
  rentalEvents,
  customers,
  technicians,
  users,
} from '../../database/schema/index';
import { eq, desc, asc, and, or, ilike, sql, inArray, gte, lte, count } from 'drizzle-orm';
import { generateBusinessNumber } from '../../database/sequences';
import { memoryCustomers } from '../customers/customer.repository';
import { randomUUID } from 'crypto';

export interface RentalListFilter {
  tab?: 'active' | 'due' | 'overdue' | 'returned' | 'all';
  search?: string;
  rentalStatus?: string;
  paymentStatus?: string;
  billingFrequency?: string;
  machineType?: string;
  customerId?: string;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'newest' | 'oldest' | 'dueDate' | 'outstanding' | 'customer';
  page?: number;
  limit?: number;
}

export interface CreateRentalInput {
  customerId: string;
  machineType: string;
  machineModel: string;
  serialNumber: string;
  assetId?: string;
  capacityLph?: string;
  installationLocation?: string;
  machineCondition?: 'NEW' | 'GOOD' | 'USED_GOOD' | 'USED_FAIR' | 'NEEDS_ATTENTION';
  accessories?: string;
  remarks?: string;
  rentalStartDate: Date;
  rentalEndDate?: Date;
  rentalDuration?: 'MONTHLY' | '3_MONTHS' | '6_MONTHS' | '12_MONTHS' | 'CUSTOM';
  minimumRentalPeriodMonths?: number;
  billingFrequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';
  monthlyRent: number;
  billingAmount: number;
  securityDeposit?: number;
  depositStatus?: 'NOT_COLLECTED' | 'COLLECTED' | 'PARTIALLY_REFUNDED' | 'FULLY_REFUNDED' | 'FORFEITED_ADJUSTED';
  initialDepositPaid?: boolean;
  initialRentPaid?: boolean;
  paymentMethod?: string;
  referenceNumber?: string;
  installationDate?: Date;
  installationTime?: string;
  installationAddress?: string;
  technicianId?: string;
  installationStatus?: 'PENDING' | 'SCHEDULED' | 'INSTALLED' | 'CANCELLED';
  installationNotes?: string;
  notes?: string;
  createdBy?: string;
  actorName?: string;
}

export interface RecordRentalPaymentInput {
  rentalId: string;
  amount: number;
  paymentDate?: Date;
  paymentMethod?: string;
  paymentType?: 'SECURITY_DEPOSIT' | 'MONTHLY_RENT' | 'ADVANCE_RENT' | 'DAMAGE_CHARGE' | 'OTHER';
  referenceNumber?: string;
  periodStartDate?: Date;
  periodEndDate?: Date;
  notes?: string;
  recordedBy?: string;
  actorName?: string;
}

export interface RecordRentalReturnInput {
  rentalId: string;
  returnDate: Date;
  returnCondition: string;
  damageCharges?: number;
  depositAdjustment?: number;
  refundAmount?: number;
  returnNotes?: string;
  actorId?: string;
  actorName?: string;
}

export const memoryRentals: any[] = [];
export const memoryRentalPayments: any[] = [];

async function attachCustomerDetails(rental: any, database = db) {
  if (!rental) return rental;
  if (rental.customer && rental.customer.fullName && rental.customer.phone) {
    return rental;
  }

  let cust: any = rental.customer || null;
  const customerId = rental.customerId;

  if (customerId) {
    // 1. Try memory customers first
    const memCust = memoryCustomers.find(
      (c) => c.id === customerId || c.customerNumber === customerId
    );
    if (memCust) {
      cust = {
        id: memCust.id,
        customerNumber: memCust.customerNumber,
        fullName: memCust.fullName,
        phone: memCust.phone,
        email: memCust.email,
        addresses: memCust.addresses || [],
      };
    } else {
      try {
        const [dbCust] = await database
          .select({
            id: customers.id,
            customerNumber: customers.customerNumber,
            fullName: customers.fullName,
            phone: customers.phone,
            email: customers.email,
          })
          .from(customers)
          .where(eq(customers.id, customerId));
        if (dbCust) {
          cust = dbCust;
        }
      } catch {}
    }
  }

  return {
    ...rental,
    customer: cust || {
      id: customerId || '',
      customerNumber: '',
      fullName: 'Customer',
      phone: '',
      email: '',
    },
  };
}

export class RentalRepository {
  /**
   * List rentals with query filters, tabs, search, sorting, and pagination
   */
  async findMany(filters: RentalListFilter, database = db) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];

      // Tab Filters
      if (filters.tab === 'active') {
        conditions.push(eq(rentals.rentalStatus, 'ACTIVE'));
      } else if (filters.tab === 'due') {
        conditions.push(
          or(
            eq(rentals.rentalStatus, 'PAYMENT_DUE'),
            eq(rentals.paymentStatus, 'DUE')
          )
        );
      } else if (filters.tab === 'overdue') {
        conditions.push(
          or(
            eq(rentals.rentalStatus, 'OVERDUE'),
            eq(rentals.paymentStatus, 'OVERDUE')
          )
        );
      } else if (filters.tab === 'returned') {
        conditions.push(inArray(rentals.rentalStatus, ['RETURNED', 'COMPLETED', 'TERMINATED']));
      }

      // Direct Status Filter
      if (filters.rentalStatus && filters.rentalStatus !== 'ALL') {
        conditions.push(eq(rentals.rentalStatus, filters.rentalStatus as any));
      }

      // Payment Status Filter
      if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
        conditions.push(eq(rentals.paymentStatus, filters.paymentStatus as any));
      }

      // Billing Frequency Filter
      if (filters.billingFrequency && filters.billingFrequency !== 'ALL') {
        conditions.push(eq(rentals.billingFrequency, filters.billingFrequency as any));
      }

      // Machine Type Filter
      if (filters.machineType && filters.machineType !== 'ALL') {
        conditions.push(eq(rentals.machineType, filters.machineType));
      }

      // Specific Customer Filter
      if (filters.customerId) {
        conditions.push(eq(rentals.customerId, filters.customerId));
      }

      // Specific Technician Filter
      if (filters.technicianId) {
        conditions.push(eq(rentals.technicianId, filters.technicianId));
      }

      // Date Range Filters
      if (filters.startDate) {
        conditions.push(gte(rentals.rentalStartDate, new Date(filters.startDate)));
      }
      if (filters.endDate) {
        conditions.push(lte(rentals.rentalStartDate, new Date(filters.endDate)));
      }

      // Text Search Filter
      if (filters.search && filters.search.trim()) {
        const searchTerm = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(rentals.rentalNumber, searchTerm),
            ilike(rentals.machineModel, searchTerm),
            ilike(rentals.serialNumber, searchTerm),
            ilike(customers.fullName, searchTerm),
            ilike(customers.customerNumber, searchTerm),
            ilike(customers.phone, searchTerm),
            ilike(customers.email, searchTerm)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Sorting Order
      let orderByClause: any = desc(rentals.createdAt);
      if (filters.sortBy === 'oldest') {
        orderByClause = asc(rentals.createdAt);
      } else if (filters.sortBy === 'dueDate') {
        orderByClause = asc(rentals.nextDueDate);
      } else if (filters.sortBy === 'outstanding') {
        orderByClause = desc(rentals.outstandingAmount);
      } else if (filters.sortBy === 'customer') {
        orderByClause = asc(customers.fullName);
      }

      // Main Query
      const rows = await database
        .select({
          rental: rentals,
          customer: {
            id: customers.id,
            customerNumber: customers.customerNumber,
            fullName: customers.fullName,
            phone: customers.phone,
            email: customers.email,
          },
          technician: {
            id: technicians.id,
            fullName: technicians.fullName,
            phone: technicians.phone,
            email: technicians.email,
          },
        })
        .from(rentals)
        .innerJoin(customers, eq(rentals.customerId, customers.id))
        .leftJoin(technicians, eq(rentals.technicianId, technicians.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Total Count for Pagination
      const countRes = await database
        .select({ totalCount: count() })
        .from(rentals)
        .innerJoin(customers, eq(rentals.customerId, customers.id))
        .where(whereClause);
      const totalCount = countRes?.[0]?.totalCount || rows.length;

      // Summary Statistics for KPI Cards
      const summaryStats = await this.getSummaryStats(database);

      const dbData = await Promise.all(
        rows.map((r) =>
          attachCustomerDetails(
            {
              ...r.rental,
              customer: r.customer,
              technician: r.technician,
            },
            database
          )
        )
      );

      // If DB returned rows, return them
      if (dbData.length > 0) {
        return {
          data: dbData,
          pagination: {
            page,
            limit,
            total: Number(totalCount),
            totalPages: Math.ceil(Number(totalCount) / limit),
          },
          summary: summaryStats,
        };
      }
    } catch (err: any) {
      console.warn('[RentalRepository.findMany] Database query notice:', err?.message);
    }

    // Memory fallback
    let filtered = [...memoryRentals];
    if (filters.customerId) {
      filtered = filtered.filter((r) => r.customerId === filters.customerId);
    }
    if (filters.search && filters.search.trim()) {
      const term = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.rentalNumber?.toLowerCase().includes(term) ||
          r.machineModel?.toLowerCase().includes(term) ||
          r.serialNumber?.toLowerCase().includes(term) ||
          r.customer?.fullName?.toLowerCase().includes(term)
      );
    }

    const total = filtered.length;
    const rawPaged = filtered.slice(offset, offset + limit);
    const pagedData = await Promise.all(rawPaged.map((r) => attachCustomerDetails(r, database)));

    return {
      data: pagedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        totalRentals: memoryRentals.length,
        totalActive: memoryRentals.filter((r) => r.rentalStatus === 'ACTIVE').length,
        totalDue: memoryRentals.filter((r) => r.rentalStatus === 'PAYMENT_DUE' || r.paymentStatus === 'DUE').length,
        totalOverdue: memoryRentals.filter((r) => r.rentalStatus === 'OVERDUE' || r.paymentStatus === 'OVERDUE').length,
        totalReturned: memoryRentals.filter((r) => ['RETURNED', 'COMPLETED', 'TERMINATED'].includes(r.rentalStatus)).length,
        monthlyRunRate: memoryRentals
          .filter((r) => r.rentalStatus === 'ACTIVE')
          .reduce((sum, r) => sum + Number(r.monthlyRent || 0), 0),
        totalOutstanding: memoryRentals.reduce((sum, r) => sum + Number(r.outstandingAmount || 0), 0),
        totalDepositsHeld: memoryRentals
          .filter((r) => r.depositStatus === 'COLLECTED')
          .reduce((sum, r) => sum + Number(r.securityDeposit || 0), 0),
      },
    };
  }

  /**
   * Get single rental by ID with full customer, technician, payment ledger, and events
   */
  async findById(id: string, database = db) {
    try {
      const rows = await database
        .select({
          rental: rentals,
          customer: {
            id: customers.id,
            customerNumber: customers.customerNumber,
            fullName: customers.fullName,
            phone: customers.phone,
            email: customers.email,
          },
          technician: {
            id: technicians.id,
            fullName: technicians.fullName,
            phone: technicians.phone,
            email: technicians.email,
          },
        })
        .from(rentals)
        .innerJoin(customers, eq(rentals.customerId, customers.id))
        .leftJoin(technicians, eq(rentals.technicianId, technicians.id))
        .where(eq(rentals.id, id))
        .limit(1);

      if (rows && rows.length > 0) {
        const rentalRecord = rows[0];

        // Fetch Payment Ledger
        const paymentsList = await database
          .select()
          .from(rentalPayments)
          .where(eq(rentalPayments.rentalId, id))
          .orderBy(desc(rentalPayments.paymentDate));

        // Fetch Events History
        const eventsList = await database
          .select()
          .from(rentalEvents)
          .where(eq(rentalEvents.rentalId, id))
          .orderBy(desc(rentalEvents.createdAt));

        return await attachCustomerDetails(
          {
            ...rentalRecord.rental,
            customer: rentalRecord.customer,
            technician: rentalRecord.technician,
            payments: paymentsList,
            events: eventsList,
          },
          database
        );
      }
    } catch (err: any) {
      console.warn('[RentalRepository.findById] DB notice:', err?.message);
    }

    const mem = memoryRentals.find((r) => r.id === id);
    if (mem) {
      return await attachCustomerDetails(mem, database);
    }
    return null;
  }

  /**
   * Find all rentals for a specific customer
   */
  async findByCustomerId(customerId: string, database = db) {
    try {
      const rows = await database
        .select({
          rental: rentals,
          customer: {
            id: customers.id,
            customerNumber: customers.customerNumber,
            fullName: customers.fullName,
            phone: customers.phone,
            email: customers.email,
          },
        })
        .from(rentals)
        .innerJoin(customers, eq(rentals.customerId, customers.id))
        .where(eq(rentals.customerId, customerId))
        .orderBy(desc(rentals.createdAt));

      if (rows && rows.length > 0) {
        return await Promise.all(
          rows.map((r) =>
            attachCustomerDetails(
              {
                ...r.rental,
                customer: r.customer,
              },
              database
            )
          )
        );
      }
    } catch (err: any) {
      console.warn('[RentalRepository.findByCustomerId] DB notice:', err?.message);
    }

    return await Promise.all(
      memoryRentals
        .filter((r) => r.customerId === customerId)
        .map((r) => attachCustomerDetails(r, database))
    );
  }

  /**
   * Create new rental agreement
   */
  async create(input: CreateRentalInput, database = db) {
    const monthlyRent = Number(input.monthlyRent || 0);
    const billingAmount = Number(input.billingAmount || monthlyRent);
    const securityDeposit = Number(input.securityDeposit || 0);

    let initialPaymentTotal = 0;
    if (input.initialDepositPaid && securityDeposit > 0) {
      initialPaymentTotal += securityDeposit;
    }
    if (input.initialRentPaid && billingAmount > 0) {
      initialPaymentTotal += billingAmount;
    }

    const totalPaid = initialPaymentTotal;
    const outstandingAmount = 0;
    let depositStatus = input.depositStatus || 'NOT_COLLECTED';
    if (input.initialDepositPaid && securityDeposit > 0) {
      depositStatus = 'COLLECTED';
    }

    const startDate = new Date(input.rentalStartDate || new Date());
    const nextDueDate = new Date(startDate);
    const freq = input.billingFrequency || 'MONTHLY';
    if (freq === 'QUARTERLY') nextDueDate.setMonth(nextDueDate.getMonth() + 3);
    else if (freq === 'HALF_YEARLY') nextDueDate.setMonth(nextDueDate.getMonth() + 6);
    else if (freq === 'YEARLY') nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    else nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'NOT_PAID' = 'NOT_PAID';
    if (input.initialRentPaid) {
      paymentStatus = 'PAID';
    } else if (initialPaymentTotal > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    let rentalNumber = `RNT-${new Date().getFullYear()}-${String(1001 + memoryRentals.length).padStart(4, '0')}`;
    try {
      const gen = await generateBusinessNumber(database, 'RENTAL', 'RNT');
      if (gen && gen.sequenceNumber) rentalNumber = gen.sequenceNumber;
    } catch {}

    const rentalId = crypto.randomUUID();

    const newRentalPayload: any = {
      id: rentalId,
      rentalNumber,
      customerId: input.customerId,
      machineType: input.machineType || 'RO',
      machineModel: input.machineModel,
      serialNumber: input.serialNumber,
      assetId: input.assetId && input.assetId.trim() ? (input.assetId as any) : undefined,
      capacityLph: input.capacityLph,
      installationLocation: input.installationLocation,
      machineCondition: (input.machineCondition as any) || 'GOOD',
      accessories: input.accessories,
      remarks: input.remarks,
      rentalStartDate: startDate,
      rentalEndDate: input.rentalEndDate ? new Date(input.rentalEndDate) : undefined,
      rentalDuration: (input.rentalDuration as any) || 'MONTHLY',
      minimumRentalPeriodMonths: input.minimumRentalPeriodMonths || 1,
      billingFrequency: (freq as any) || 'MONTHLY',
      monthlyRent: String(monthlyRent),
      billingAmount: String(billingAmount),
      securityDeposit: String(securityDeposit),
      depositStatus: (depositStatus as any),
      initialPaymentAmount: String(initialPaymentTotal),
      totalPaid: String(totalPaid),
      outstandingAmount: String(outstandingAmount),
      nextDueDate,
      rentalStatus: 'ACTIVE',
      paymentStatus: (paymentStatus as any),
      installationDate: input.installationDate ? new Date(input.installationDate) : undefined,
      installationTime: input.installationTime,
      installationAddress: input.installationAddress,
      technicianId: input.technicianId && input.technicianId.trim() ? (input.technicianId as any) : undefined,
      technicianName: undefined,
      installationStatus: (input.installationStatus as any) || 'PENDING',
      installationNotes: input.installationNotes,
      notes: input.notes,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const [inserted] = await database.insert(rentals).values(newRentalPayload).returning();
      if (inserted) {
        if (input.initialDepositPaid && securityDeposit > 0) {
          try {
            await database.insert(rentalPayments).values({
              id: crypto.randomUUID(),
              rentalId: inserted.id,
              customerId: input.customerId,
              amount: String(securityDeposit),
              paymentDate: startDate,
              paymentMethod: input.paymentMethod || 'UPI',
              paymentType: 'SECURITY_DEPOSIT',
              receiptNumber: `RCP-RNT-${Date.now().toString().slice(-6)}`,
              referenceNumber: input.referenceNumber,
              notes: 'Initial security deposit collected',
              recordedBy: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } catch {}
        }
        if (input.initialRentPaid && billingAmount > 0) {
          try {
            await database.insert(rentalPayments).values({
              id: crypto.randomUUID(),
              rentalId: inserted.id,
              customerId: input.customerId,
              amount: String(billingAmount),
              paymentDate: startDate,
              paymentMethod: input.paymentMethod || 'UPI',
              paymentType: 'MONTHLY_RENT',
              receiptNumber: `RCP-RNT-${Date.now().toString().slice(-6)}`,
              referenceNumber: input.referenceNumber,
              periodStartDate: startDate,
              periodEndDate: nextDueDate,
              notes: 'First cycle advance rent payment collected',
              recordedBy: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } catch {}
        }
        try {
          await database.insert(rentalEvents).values({
            id: crypto.randomUUID(),
            rentalId: inserted.id,
            eventType: 'RENTAL_CREATED',
            description: `Rental agreement ${rentalNumber} created for machine ${input.machineModel} (Serial: ${input.serialNumber}) with monthly rent ₹${monthlyRent}.`,
            actorId: null,
            actorName: input.actorName || 'Admin',
            createdAt: new Date(),
          });
        } catch {}

        const withCust = await attachCustomerDetails(inserted, database);
        memoryRentals.unshift(withCust);
        return withCust;
      }
    } catch (insertErr: any) {
      console.warn('[RentalRepository.create] DB insert notice, using memory fallback:', insertErr?.message);
    }

    const memWithCust = await attachCustomerDetails(newRentalPayload, database);
    memoryRentals.unshift(memWithCust);
    return memWithCust;
  }

  /**
   * Update rental details
   */
  async update(id: string, data: Partial<CreateRentalInput>, database = db) {
    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (data.machineType !== undefined) updatePayload.machineType = data.machineType;
    if (data.machineModel !== undefined) updatePayload.machineModel = data.machineModel;
    if (data.serialNumber !== undefined) updatePayload.serialNumber = data.serialNumber;
    if (data.capacityLph !== undefined) updatePayload.capacityLph = data.capacityLph;
    if (data.installationLocation !== undefined) updatePayload.installationLocation = data.installationLocation;
    if (data.machineCondition !== undefined) updatePayload.machineCondition = data.machineCondition;
    if (data.accessories !== undefined) updatePayload.accessories = data.accessories;
    if (data.remarks !== undefined) updatePayload.remarks = data.remarks;
    if (data.rentalStartDate !== undefined) updatePayload.rentalStartDate = new Date(data.rentalStartDate);
    if (data.rentalEndDate !== undefined) updatePayload.rentalEndDate = data.rentalEndDate ? new Date(data.rentalEndDate) : null;
    if (data.rentalDuration !== undefined) updatePayload.rentalDuration = data.rentalDuration;
    if (data.minimumRentalPeriodMonths !== undefined) updatePayload.minimumRentalPeriodMonths = data.minimumRentalPeriodMonths;
    if (data.billingFrequency !== undefined) updatePayload.billingFrequency = data.billingFrequency;
    if (data.monthlyRent !== undefined) updatePayload.monthlyRent = String(data.monthlyRent);
    if (data.billingAmount !== undefined) updatePayload.billingAmount = String(data.billingAmount);
    if (data.securityDeposit !== undefined) updatePayload.securityDeposit = String(data.securityDeposit);
    if (data.depositStatus !== undefined) updatePayload.depositStatus = data.depositStatus;
    if (data.technicianId !== undefined) updatePayload.technicianId = data.technicianId && data.technicianId.trim() ? data.technicianId : null;
    if (data.installationDate !== undefined) updatePayload.installationDate = data.installationDate ? new Date(data.installationDate) : null;
    if (data.installationTime !== undefined) updatePayload.installationTime = data.installationTime;
    if (data.installationAddress !== undefined) updatePayload.installationAddress = data.installationAddress;
    if (data.installationStatus !== undefined) updatePayload.installationStatus = data.installationStatus;
    if (data.installationNotes !== undefined) updatePayload.installationNotes = data.installationNotes;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    try {
      const [updated] = await database
        .update(rentals)
        .set(updatePayload)
        .where(eq(rentals.id, id))
        .returning();
      if (updated) return await attachCustomerDetails(updated, database);
    } catch (err: any) {
      console.warn('[RentalRepository.update] DB notice, using memory fallback:', err?.message);
    }

    let rental = memoryRentals.find((r) => r.id === id || r.rentalNumber === id);
    if (rental) {
      Object.assign(rental, updatePayload, { updatedAt: new Date().toISOString() });
      return await attachCustomerDetails(rental, database);
    }
    return null;
  }

  /**
   * Record recurring rental payment
   */
  async recordPayment(input: RecordRentalPaymentInput, database = db) {
    try {
      return await database.transaction(async (tx) => {
        const [rental] = await tx.select().from(rentals).where(eq(rentals.id, input.rentalId)).limit(1);
        if (!rental) throw new Error('Rental not found');

        const paymentAmount = Number(input.amount || 0);
        const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();

        // 1. Insert payment transaction
        // Generate official rental receipt number
        const receiptRes = await generateBusinessNumber(tx, 'RENTAL_PAYMENT', 'RCP-RNT');

        const [newPayment] = await tx
          .insert(rentalPayments)
          .values({
            rentalId: rental.id,
            customerId: rental.customerId,
            amount: String(paymentAmount),
            paymentDate,
            paymentMethod: input.paymentMethod || 'UPI',
            paymentType: (input.paymentType as any) || 'MONTHLY_RENT',
            receiptNumber: receiptRes.sequenceNumber,
            referenceNumber: input.referenceNumber,
            periodStartDate: input.periodStartDate ? new Date(input.periodStartDate) : undefined,
            periodEndDate: input.periodEndDate ? new Date(input.periodEndDate) : undefined,
            notes: input.notes,
            recordedBy: input.recordedBy && input.recordedBy.trim() ? (input.recordedBy as any) : undefined,
          })
          .returning();

        // 2. Sum all rental payments for this rental
        const allPayments = await tx
          .select({ amount: rentalPayments.amount })
          .from(rentalPayments)
          .where(eq(rentalPayments.rentalId, rental.id));

        const totalPaidSum = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        // Calculate outstanding amount: from existing outstanding balance or cycle monthly rent
        const monthlyRentNum = Number(rental.monthlyRent || 0);
        const previousOutstanding = Number(rental.outstandingAmount || 0);
        const dueForThisCycle = previousOutstanding > 0 ? previousOutstanding : monthlyRentNum;
        const outstandingAmount = Math.max(0, dueForThisCycle - paymentAmount);
        const isFullPayment = outstandingAmount === 0;
        const paymentStatus = isFullPayment ? 'PAID' : 'PARTIALLY_PAID';

        // Advance due date only when full payment is satisfied
        let nextDue = new Date(rental.nextDueDate);
        if (isFullPayment && (input.paymentType === 'MONTHLY_RENT' || input.paymentType === 'ADVANCE_RENT')) {
          const freq = rental.billingFrequency || 'MONTHLY';
          if (freq === 'QUARTERLY') nextDue.setMonth(nextDue.getMonth() + 3);
          else if (freq === 'HALF_YEARLY') nextDue.setMonth(nextDue.getMonth() + 6);
          else if (freq === 'YEARLY') nextDue.setFullYear(nextDue.getFullYear() + 1);
          else nextDue.setMonth(nextDue.getMonth() + 1);
        }

        // Update rental status
        const [updatedRental] = await tx
          .update(rentals)
          .set({
            totalPaid: String(totalPaidSum),
            outstandingAmount: String(outstandingAmount),
            paymentStatus: paymentStatus as any,
            rentalStatus: rental.rentalStatus === 'RETURNED' ? 'RETURNED' : 'ACTIVE',
            nextDueDate: nextDue,
            updatedAt: new Date(),
          })
          .where(eq(rentals.id, rental.id))
          .returning();

        // 3. Log Payment Event
        try {
          await tx.insert(rentalEvents).values({
            rentalId: rental.id,
            eventType: 'PAYMENT_RECORDED',
            description: `Payment of ₹${paymentAmount} recorded via ${input.paymentMethod || 'UPI'} (${input.paymentType || 'MONTHLY_RENT'}). Receipt: ${receiptRes.sequenceNumber}. New total paid: ₹${totalPaidSum}.`,
            actorId: input.recordedBy,
            actorName: input.actorName || 'Staff',
          });
        } catch {}

        return {
          payment: newPayment,
          rental: await attachCustomerDetails(updatedRental, tx),
        };
      });
    } catch (err: any) {
      console.warn('[RentalRepository.recordPayment] DB notice, using memory fallback:', err?.message);
      let rental = memoryRentals.find((r) => r.id === input.rentalId || r.rentalNumber === input.rentalId);
      if (!rental) throw new Error('Rental not found');

      const paymentAmount = Number(input.amount || 0);
      const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
      const currentPaid = Number(rental.totalPaid || 0) + paymentAmount;
      const monthlyRentNum = Number(rental.monthlyRent || 0);
      const previousOutstanding = Number(rental.outstandingAmount || 0);
      const dueForThisCycle = previousOutstanding > 0 ? previousOutstanding : monthlyRentNum;
      const outstandingAmount = Math.max(0, dueForThisCycle - paymentAmount);
      const isFullPayment = outstandingAmount === 0;

      let nextDue = new Date(rental.nextDueDate);
      if (isFullPayment && (input.paymentType === 'MONTHLY_RENT' || input.paymentType === 'ADVANCE_RENT')) {
        const freq = rental.billingFrequency || 'MONTHLY';
        if (freq === 'QUARTERLY') nextDue.setMonth(nextDue.getMonth() + 3);
        else if (freq === 'HALF_YEARLY') nextDue.setMonth(nextDue.getMonth() + 6);
        else if (freq === 'YEARLY') nextDue.setFullYear(nextDue.getFullYear() + 1);
        else nextDue.setMonth(nextDue.getMonth() + 1);
      }

      rental.totalPaid = String(currentPaid);
      rental.outstandingAmount = String(outstandingAmount);
      rental.paymentStatus = isFullPayment ? 'PAID' : 'PARTIALLY_PAID';
      rental.nextDueDate = nextDue.toISOString();
      rental.updatedAt = new Date().toISOString();

      const receiptNumber = `RCP-RNT-${new Date().getFullYear()}-${String(Date.now() % 10000).padStart(4, '0')}`;
      const newPayment = {
        id: randomUUID(),
        rentalId: rental.id,
        customerId: rental.customerId,
        amount: String(paymentAmount),
        paymentDate,
        paymentMethod: input.paymentMethod || 'UPI',
        paymentType: input.paymentType || 'MONTHLY_RENT',
        receiptNumber,
        referenceNumber: input.referenceNumber || null,
        notes: input.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      memoryRentalPayments.unshift(newPayment);

      return {
        payment: newPayment,
        rental: await attachCustomerDetails(rental, database),
      };
    }
  }

  /**
   * Find paginated rental payment ledger records with search & filters
   */
  async findRentalPayments(
    filters: {
      search?: string;
      paymentMethod?: string;
      paymentType?: string;
      customerId?: string;
      rentalId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
    database = db
  ) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters.search && filters.search.trim()) {
      const s = `%${filters.search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          ilike(customers.fullName, s),
          ilike(customers.phone, s),
          ilike(customers.customerNumber, s),
          ilike(rentals.rentalNumber, s),
          ilike(rentals.machineModel, s),
          ilike(rentals.serialNumber, s),
          ilike(rentalPayments.referenceNumber, s),
          ilike(rentalPayments.receiptNumber, s),
          ilike(rentalPayments.notes, s)
        )
      );
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
      conditions.push(eq(rentalPayments.paymentMethod, filters.paymentMethod));
    }

    if (filters.paymentType && filters.paymentType !== 'ALL') {
      conditions.push(eq(rentalPayments.paymentType, filters.paymentType as any));
    }

    if (filters.customerId) {
      conditions.push(eq(rentalPayments.customerId, filters.customerId));
    }

    if (filters.rentalId) {
      conditions.push(eq(rentalPayments.rentalId, filters.rentalId));
    }

    if (filters.startDate) {
      conditions.push(gte(rentalPayments.paymentDate, new Date(filters.startDate)));
    }

    if (filters.endDate) {
      conditions.push(lte(rentalPayments.paymentDate, new Date(filters.endDate)));
    }

    try {
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Total Count
      const countResult = await database
        .select({ count: count() })
        .from(rentalPayments)
        .leftJoin(rentals, eq(rentalPayments.rentalId, rentals.id))
        .leftJoin(customers, eq(rentalPayments.customerId, customers.id))
        .where(whereClause);

      const total = Number(countResult[0]?.count || 0);

      // Records
      const rows = await database
        .select({
          id: rentalPayments.id,
          rentalId: rentalPayments.rentalId,
          customerId: rentalPayments.customerId,
          amount: rentalPayments.amount,
          paymentDate: rentalPayments.paymentDate,
          paymentMethod: rentalPayments.paymentMethod,
          paymentType: rentalPayments.paymentType,
          receiptNumber: rentalPayments.receiptNumber,
          referenceNumber: rentalPayments.referenceNumber,
          periodStartDate: rentalPayments.periodStartDate,
          periodEndDate: rentalPayments.periodEndDate,
          notes: rentalPayments.notes,
          recordedBy: rentalPayments.recordedBy,
          createdAt: rentalPayments.createdAt,
          updatedAt: rentalPayments.updatedAt,
          // Rental details
          rentalNumber: rentals.rentalNumber,
          machineType: rentals.machineType,
          machineModel: rentals.machineModel,
          serialNumber: rentals.serialNumber,
          monthlyRent: rentals.monthlyRent,
          securityDeposit: rentals.securityDeposit,
          totalPaid: rentals.totalPaid,
          outstandingAmount: rentals.outstandingAmount,
          rentalStatus: rentals.rentalStatus,
          paymentStatus: rentals.paymentStatus,
          nextDueDate: rentals.nextDueDate,
          // Customer details
          customerName: customers.fullName,
          customerPhone: customers.phone,
          customerNumber: customers.customerNumber,
          customerEmail: customers.email,
          // User details
          recordedByName: users.displayName,
        })
        .from(rentalPayments)
        .leftJoin(rentals, eq(rentalPayments.rentalId, rentals.id))
        .leftJoin(customers, eq(rentalPayments.customerId, customers.id))
        .leftJoin(users, eq(rentalPayments.recordedBy, users.id))
        .where(whereClause)
        .orderBy(desc(rentalPayments.paymentDate), desc(rentalPayments.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: rows.map((r) => ({
          ...r,
          receiptNumber:
            r.receiptNumber ||
            `RCP-RNT-${r.paymentDate && !isNaN(new Date(r.paymentDate).getTime()) ? new Date(r.paymentDate).getFullYear() : new Date().getFullYear()}-${(r.id || '0000').slice(0, 4).toUpperCase()}`,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (err: any) {
      console.warn('[RentalRepository.findRentalPayments] DB notice, using memory fallback:', err?.message);
      let filtered = [...memoryRentalPayments];
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim().toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.receiptNumber?.toLowerCase().includes(s) ||
            p.referenceNumber?.toLowerCase().includes(s) ||
            p.customerName?.toLowerCase().includes(s) ||
            p.customerPhone?.toLowerCase().includes(s) ||
            p.rentalNumber?.toLowerCase().includes(s) ||
            p.notes?.toLowerCase().includes(s)
        );
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
        filtered = filtered.filter((p) => p.paymentMethod === filters.paymentMethod);
      }
      if (filters.paymentType && filters.paymentType !== 'ALL') {
        filtered = filtered.filter((p) => p.paymentType === filters.paymentType);
      }
      if (filters.customerId) {
        filtered = filtered.filter((p) => p.customerId === filters.customerId);
      }
      if (filters.rentalId) {
        filtered = filtered.filter((p) => p.rentalId === filters.rentalId);
      }

      const total = filtered.length;
      const paged = filtered.slice(offset, offset + limit);

      return {
        data: paged,
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
   * Find single rental payment with full details
   */
  async findRentalPaymentById(id: string, database = db) {
    try {
      const rows = await database
        .select({
          id: rentalPayments.id,
          rentalId: rentalPayments.rentalId,
          customerId: rentalPayments.customerId,
          amount: rentalPayments.amount,
          paymentDate: rentalPayments.paymentDate,
          paymentMethod: rentalPayments.paymentMethod,
          paymentType: rentalPayments.paymentType,
          receiptNumber: rentalPayments.receiptNumber,
          referenceNumber: rentalPayments.referenceNumber,
          periodStartDate: rentalPayments.periodStartDate,
          periodEndDate: rentalPayments.periodEndDate,
          notes: rentalPayments.notes,
          recordedBy: rentalPayments.recordedBy,
          createdAt: rentalPayments.createdAt,
          updatedAt: rentalPayments.updatedAt,
          // Rental details
          rentalNumber: rentals.rentalNumber,
          machineType: rentals.machineType,
          machineModel: rentals.machineModel,
          serialNumber: rentals.serialNumber,
          monthlyRent: rentals.monthlyRent,
          securityDeposit: rentals.securityDeposit,
          totalPaid: rentals.totalPaid,
          outstandingAmount: rentals.outstandingAmount,
          rentalStatus: rentals.rentalStatus,
          paymentStatus: rentals.paymentStatus,
          nextDueDate: rentals.nextDueDate,
          // Customer details
          customerName: customers.fullName,
          customerPhone: customers.phone,
          customerNumber: customers.customerNumber,
          customerEmail: customers.email,
          // User details
          recordedByName: users.displayName,
        })
        .from(rentalPayments)
        .leftJoin(rentals, eq(rentalPayments.rentalId, rentals.id))
        .leftJoin(customers, eq(rentalPayments.customerId, customers.id))
        .leftJoin(users, eq(rentalPayments.recordedBy, users.id))
        .where(eq(rentalPayments.id, id))
        .limit(1);

      if (!rows[0]) {
        return memoryRentalPayments.find((p) => p.id === id) || null;
      }
      const r = rows[0];
      return {
        ...r,
        receiptNumber:
          r.receiptNumber ||
          `RCP-RNT-${r.paymentDate && !isNaN(new Date(r.paymentDate).getTime()) ? new Date(r.paymentDate).getFullYear() : new Date().getFullYear()}-${(r.id || '0000').slice(0, 4).toUpperCase()}`,
      };
    } catch (err: any) {
      console.warn('[RentalRepository.findRentalPaymentById] DB notice, using memory fallback:', err?.message);
      return memoryRentalPayments.find((p) => p.id === id) || null;
    }
  }

  /**
   * Record machine return
   */
  async recordReturn(input: RecordRentalReturnInput, database = db) {
    try {
      return await database.transaction(async (tx) => {
        const [rental] = await tx.select().from(rentals).where(eq(rentals.id, input.rentalId)).limit(1);
        if (!rental) throw new Error('Rental not found');

        const returnDate = input.returnDate ? new Date(input.returnDate) : new Date();

        const [updatedRental] = await tx
          .update(rentals)
          .set({
            rentalStatus: 'RETURNED',
            returnDate,
            returnCondition: input.returnCondition,
            damageCharges: String(input.damageCharges || 0),
            depositAdjustment: String(input.depositAdjustment || 0),
            refundAmount: String(input.refundAmount || 0),
            returnNotes: input.returnNotes,
            updatedAt: new Date(),
          })
          .where(eq(rentals.id, rental.id))
          .returning();

        // Log Return Event
        try {
          await tx.insert(rentalEvents).values({
            rentalId: rental.id,
            eventType: 'MACHINE_RETURNED',
            description: `Machine returned on ${returnDate.toLocaleDateString()}. Condition: ${input.returnCondition}. Refund: ₹${input.refundAmount || 0}. Damage charges: ₹${input.damageCharges || 0}.`,
            actorId: input.actorId,
            actorName: input.actorName || 'Admin',
          });
        } catch {}

        return await attachCustomerDetails(updatedRental, tx);
      });
    } catch (err: any) {
      console.warn('[RentalRepository.recordReturn] DB notice, using memory fallback:', err?.message);
      let rental = memoryRentals.find((r) => r.id === input.rentalId || r.rentalNumber === input.rentalId);
      if (!rental) {
        throw new Error('Rental not found');
      }

      const returnDate = input.returnDate ? new Date(input.returnDate) : new Date();
      rental.rentalStatus = 'RETURNED';
      rental.returnDate = returnDate.toISOString();
      rental.returnCondition = input.returnCondition;
      rental.damageCharges = String(input.damageCharges || 0);
      rental.depositAdjustment = String(input.depositAdjustment || 0);
      rental.refundAmount = String(input.refundAmount || 0);
      rental.returnNotes = input.returnNotes || '';
      rental.updatedAt = new Date().toISOString();

      return await attachCustomerDetails(rental, database);
    }
  }

  /**
   * Hard delete rental record
   */
  async delete(id: string, database = db) {
    try {
      const [deleted] = await database.delete(rentals).where(eq(rentals.id, id)).returning();
      if (deleted) return deleted;
    } catch (err: any) {
      console.warn('[RentalRepository.delete] DB notice, using memory fallback:', err?.message);
    }
    const idx = memoryRentals.findIndex((r) => r.id === id || r.rentalNumber === id);
    if (idx !== -1) {
      const [deleted] = memoryRentals.splice(idx, 1);
      return deleted;
    }
    return { id };
  }

  /**
   * Compute high-level KPI stats across rental database
   */
  async getSummaryStats(database = db) {
    const allRentals = await database.select().from(rentals);

    const totalRentals = allRentals.length;
    const totalActive = allRentals.filter((r) => r.rentalStatus === 'ACTIVE').length;
    const totalDue = allRentals.filter((r) => r.rentalStatus === 'PAYMENT_DUE' || r.paymentStatus === 'DUE').length;
    const totalOverdue = allRentals.filter((r) => r.rentalStatus === 'OVERDUE' || r.paymentStatus === 'OVERDUE').length;
    const totalReturned = allRentals.filter((r) => ['RETURNED', 'COMPLETED', 'TERMINATED'].includes(r.rentalStatus)).length;

    const monthlyRunRate = allRentals
      .filter((r) => r.rentalStatus === 'ACTIVE')
      .reduce((sum, r) => sum + Number(r.monthlyRent || 0), 0);

    const totalOutstanding = allRentals.reduce((sum, r) => sum + Number(r.outstandingAmount || 0), 0);
    const totalDepositsHeld = allRentals
      .filter((r) => r.depositStatus === 'COLLECTED')
      .reduce((sum, r) => sum + Number(r.securityDeposit || 0), 0);

    return {
      totalRentals,
      totalActive,
      totalDue,
      totalOverdue,
      totalReturned,
      monthlyRunRate,
      totalOutstanding,
      totalDepositsHeld,
    };
  }
}

export const rentalRepository = new RentalRepository();
