import { eq, and, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  technicians,
  jobCards,
  services,
  customers,
  customerAssets,
  products,
  auditLogs,
} from '../../database/schema/index';
import { randomUUID } from 'crypto';
import { memoryJobCards } from '../job-cards/job-cards.repository';
import type {
  TechnicianQueryFilter,
  CreateTechnicianInput,
  UpdateTechnicianInput,
} from '@crm/validation';

export const INITIAL_TECHNICIANS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    fullName: 'Aakash Sharma',
    phone: '9820011223',
    email: 'aakash.sharma@srenterprises.com',
    status: 'ACTIVE' as const,
    skills: ['RO Installation', 'Membrane Replacement', 'TDS Calibration', 'Booster Pump Repair'],
    address: 'Shop 4, Ganesh Market, Nashik, Maharashtra',
    emergencyContact: '9820099887 (Father - Ramesh)',
    userId: null,
    createdAt: new Date('2026-01-10T09:00:00.000Z'),
    updatedAt: new Date('2026-01-10T09:00:00.000Z'),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    fullName: 'Ramesh Kumar',
    phone: '9833445566',
    email: 'ramesh.kumar@srenterprises.com',
    status: 'ACTIVE' as const,
    skills: ['Filter Replacement', 'Commercial RO Setup', 'Leakage Troubleshooting', 'Electrical Wiring'],
    address: 'Flat 202, Sai Residency, CIDCO, Nashik, Maharashtra',
    emergencyContact: '9833445500 (Wife - Sunita)',
    userId: null,
    createdAt: new Date('2026-01-15T09:00:00.000Z'),
    updatedAt: new Date('2026-01-15T09:00:00.000Z'),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    fullName: 'Priya Verma',
    phone: '9844556677',
    email: 'priya.verma@srenterprises.com',
    status: 'ACTIVE' as const,
    skills: ['TDS Calibration', 'Filter Replacement', 'RO Installation'],
    address: 'Plot 18, Indira Nagar, Nashik, Maharashtra',
    emergencyContact: '9844556600 (Brother - Amit)',
    userId: null,
    createdAt: new Date('2026-02-01T09:00:00.000Z'),
    updatedAt: new Date('2026-02-01T09:00:00.000Z'),
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    fullName: 'Suresh Patil',
    phone: '9855667788',
    email: 'suresh.patil@srenterprises.com',
    status: 'ON_LEAVE' as const,
    skills: ['Commercial RO Setup', 'Booster Pump Repair', 'Leakage Troubleshooting'],
    address: 'House 12, Panchavati, Nashik, Maharashtra',
    emergencyContact: '9855667700 (Father - Devidas)',
    userId: null,
    createdAt: new Date('2026-02-10T09:00:00.000Z'),
    updatedAt: new Date('2026-02-10T09:00:00.000Z'),
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    fullName: 'Vikas Deshmukh',
    phone: '9866778899',
    email: 'vikas.deshmukh@srenterprises.com',
    status: 'INACTIVE' as const,
    skills: ['RO Installation', 'Filter Replacement'],
    address: 'Old Nashik, Near Saraf Bazar, Nashik, Maharashtra',
    emergencyContact: '9866778800 (Uncle - Sanjay)',
    userId: null,
    createdAt: new Date('2025-11-20T09:00:00.000Z'),
    updatedAt: new Date('2026-01-05T09:00:00.000Z'),
  },
];

// In-memory mirror for offline fallback
export const memoryTechnicians: any[] = [...INITIAL_TECHNICIANS];

export class TechniciansRepository {
  private hasEnsuredInitial = false;

  /**
   * Ensure default 5 workforce technicians exist in the database
   */
  async ensureDefaultTechnicians(database = db) {
    if (this.hasEnsuredInitial) return;
    try {
      for (const t of INITIAL_TECHNICIANS) {
        await database
          .insert(technicians)
          .values({
            id: t.id,
            fullName: t.fullName,
            phone: t.phone,
            email: t.email,
            status: t.status,
            skills: t.skills,
            address: t.address,
            emergencyContact: t.emergencyContact,
            userId: t.userId,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          })
          .onConflictDoNothing();
      }
      this.hasEnsuredInitial = true;
    } catch (err: any) {
      console.warn('[TechniciansRepository.ensureDefaultTechnicians] Note:', err?.message);
    }
  }

  /**
   * Find paginated technicians with active & completed job aggregations
   */
  async findPaginated(filters: TechnicianQueryFilter, database = db) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    try {
      await this.ensureDefaultTechnicians(database);

      const conditions: any[] = [];

      if (filters.status && (filters.status as string) !== 'ALL') {
        const queryStatus = (filters.status as string) === 'SUSPENDED' ? 'INACTIVE' : filters.status;
        conditions.push(eq(technicians.status, queryStatus as any));
      }

      if (filters.search?.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(technicians.fullName, term),
            ilike(technicians.phone, term),
            ilike(technicians.email, term),
            ilike(technicians.address, term)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const isAsc = filters.sortOrder === 'asc';
      let orderExpr = isAsc ? asc(technicians.fullName) : desc(technicians.fullName);
      if (filters.sortBy === 'createdAt') {
        orderExpr = isAsc ? asc(technicians.createdAt) : desc(technicians.createdAt);
      } else if (filters.sortBy === 'status') {
        orderExpr = isAsc ? asc(technicians.status) : desc(technicians.status);
      }

      const [techRows, countResult] = await Promise.all([
        database
          .select({
            id: technicians.id,
            fullName: technicians.fullName,
            phone: technicians.phone,
            email: technicians.email,
            status: technicians.status,
            skills: technicians.skills,
            address: technicians.address,
            emergencyContact: technicians.emergencyContact,
            userId: technicians.userId,
            createdAt: technicians.createdAt,
            updatedAt: technicians.updatedAt,
          })
          .from(technicians)
          .where(whereClause)
          .orderBy(orderExpr)
          .limit(limit)
          .offset(offset),
        database
          .select({ count: sql<number>`count(*)` })
          .from(technicians)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count || 0);

      const rows = techRows.map((t) => {
        const activeJobs = memoryJobCards.filter(
          (j) => j.technicianId === t.id && (j.status === 'ASSIGNED' || j.status === 'IN_PROGRESS' || j.status === 'SCHEDULED')
        ).length;
        const completedJobs = memoryJobCards.filter(
          (j) => j.technicianId === t.id && j.status === 'COMPLETED'
        ).length;

        return {
          ...t,
          activeJobsCount: activeJobs,
          completedJobsCount: completedJobs,
        };
      });

      return {
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (err: any) {
      console.warn('[TechniciansRepository.findPaginated] DB query fallback:', err?.message);
    }

    // Memory fallback
    let filtered = [...memoryTechnicians];

    if (filters.status && (filters.status as string) !== 'ALL') {
      const queryStatus = (filters.status as string) === 'SUSPENDED' ? 'INACTIVE' : filters.status;
      filtered = filtered.filter((t) => t.status === queryStatus);
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.fullName.toLowerCase().includes(term) ||
          t.phone.toLowerCase().includes(term) ||
          (t.email && t.email.toLowerCase().includes(term)) ||
          (t.address && t.address.toLowerCase().includes(term))
      );
    }

    const total = filtered.length;
    const isAsc = filters.sortOrder === 'asc';

    filtered.sort((a, b) => {
      if (filters.sortBy === 'createdAt') {
        return isAsc
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (filters.sortBy === 'status') {
        return isAsc ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
      }
      return isAsc ? a.fullName.localeCompare(b.fullName) : b.fullName.localeCompare(a.fullName);
    });

    const paged = filtered.slice(offset, offset + limit).map((t) => {
      const activeJobs = memoryJobCards.filter(
        (j) => j.technicianId === t.id && (j.status === 'ASSIGNED' || j.status === 'IN_PROGRESS' || j.status === 'SCHEDULED')
      ).length;
      const completedJobs = memoryJobCards.filter(
        (j) => j.technicianId === t.id && j.status === 'COMPLETED'
      ).length;

      return {
        ...t,
        activeJobsCount: activeJobs,
        completedJobsCount: completedJobs,
      };
    });

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

  /**
   * Find single technician by ID with active assignments & recent job history
   */
  async findById(id: string, database = db) {
    try {
      await this.ensureDefaultTechnicians(database);

      const rows = await database
        .select({
          id: technicians.id,
          fullName: technicians.fullName,
          phone: technicians.phone,
          email: technicians.email,
          status: technicians.status,
          skills: technicians.skills,
          address: technicians.address,
          emergencyContact: technicians.emergencyContact,
          userId: technicians.userId,
          createdAt: technicians.createdAt,
          updatedAt: technicians.updatedAt,
        })
        .from(technicians)
        .where(eq(technicians.id, id))
        .limit(1);

      if (rows[0]) {
        let recentJobs: any[] = [];
        try {
          recentJobs = await database
            .select({
              id: jobCards.id,
              jobCardNumber: jobCards.jobCardNumber,
              status: jobCards.status,
              problemReported: jobCards.problemReported,
              workPerformed: jobCards.workPerformed,
              createdAt: jobCards.createdAt,
              completedAt: jobCards.completedAt,
              serviceNumber: services.serviceNumber,
              serviceType: services.serviceType,
              customerName: customers.fullName,
              customerPhone: customers.phone,
              productName: products.name,
            })
            .from(jobCards)
            .leftJoin(services, eq(jobCards.serviceId, services.id))
            .leftJoin(customers, eq(jobCards.customerId, customers.id))
            .leftJoin(customerAssets, eq(jobCards.assetId, customerAssets.id))
            .leftJoin(products, eq(customerAssets.productId, products.id))
            .where(eq(jobCards.technicianId, id))
            .orderBy(desc(jobCards.createdAt))
            .limit(10);
        } catch {}

        if (recentJobs.length === 0) {
          recentJobs = memoryJobCards
            .filter((j) => j.technicianId === id)
            .map((j) => ({
              id: j.id,
              jobCardNumber: j.jobCardNumber,
              status: j.status,
              problemReported: j.problemReported,
              workPerformed: j.workPerformed,
              createdAt: j.createdAt,
              completedAt: j.completedAt,
              serviceNumber: j.serviceNumber || 'SRV-2026-0001',
              serviceType: j.serviceType || 'GENERAL_SERVICE',
              customerName: j.customerName || 'Customer',
              customerPhone: j.customerPhone || '',
              productName: j.productName || 'Water Purifier',
            }));
        }

        return {
          ...rows[0],
          recentJobs,
        };
      }
    } catch (err: any) {
      console.warn('[TechniciansRepository.findById] DB query fallback:', err?.message);
    }

    const tech = memoryTechnicians.find((t) => t.id === id || t.phone === id);
    if (!tech) return null;

    const recentJobs = memoryJobCards
      .filter((j) => j.technicianId === id)
      .map((j) => ({
        id: j.id,
        jobCardNumber: j.jobCardNumber,
        status: j.status,
        problemReported: j.problemReported,
        workPerformed: j.workPerformed,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
        serviceNumber: j.serviceNumber || 'SRV-2026-0001',
        serviceType: j.serviceType || 'GENERAL_SERVICE',
        customerName: j.customerName || 'Customer',
        customerPhone: j.customerPhone || '',
        productName: j.productName || 'Water Purifier',
      }));

    return {
      ...tech,
      recentJobs,
    };
  }

  /**
   * Get High-Level Operational KPIs for Technicians
   */
  async getKPIs(database = db) {
    try {
      await this.ensureDefaultTechnicians(database);

      const query = sql`
        SELECT
          COUNT(*)::int AS total_technicians,
          COUNT(*) FILTER (WHERE ${technicians.status} = 'ACTIVE')::int AS active_technicians,
          COUNT(*) FILTER (WHERE ${technicians.status} = 'ON_LEAVE')::int AS on_leave,
          COUNT(*) FILTER (WHERE ${technicians.status} = 'INACTIVE')::int AS inactive_technicians
        FROM ${technicians}
      `;

      const result = await database.execute(query);
      const row = result[0] as any;

      if (row && Number(row.total_technicians) > 0) {
        return {
          totalTechnicians: Number(row.total_technicians) || 0,
          activeTechnicians: Number(row.active_technicians) || 0,
          onLeave: Number(row.on_leave) || 0,
          inactiveTechnicians: Number(row.inactive_technicians) || 0,
        };
      }
    } catch (err: any) {
      console.warn('[TechniciansRepository.getKPIs] DB query fallback:', err?.message);
    }

    return {
      totalTechnicians: memoryTechnicians.length,
      activeTechnicians: memoryTechnicians.filter((t) => t.status === 'ACTIVE').length,
      onLeave: memoryTechnicians.filter((t) => t.status === 'ON_LEAVE').length,
      inactiveTechnicians: memoryTechnicians.filter((t) => t.status === 'INACTIVE').length,
    };
  }

  /**
   * Create a new field technician
   */
  async create(input: CreateTechnicianInput, actorId?: string, database = db) {
    try {
      await this.ensureDefaultTechnicians(database);

      // Check phone uniqueness
      const existing = await database
        .select()
        .from(technicians)
        .where(eq(technicians.phone, input.phone))
        .limit(1);

      if (existing[0]) {
        throw new Error(`A technician with phone number "${input.phone}" already exists`);
      }

      const dbStatus: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' = input.status === 'SUSPENDED' ? 'INACTIVE' : (input.status || 'ACTIVE');

      const [newTech] = await database
        .insert(technicians)
        .values({
          id: randomUUID(),
          fullName: input.fullName,
          phone: input.phone,
          email: input.email || null,
          address: input.address || null,
          skills: input.skills || ['RO Installation', 'General Service'],
          emergencyContact: input.emergencyContact || null,
          userId: input.userId || null,
          status: dbStatus,
        })
        .returning();

      if (!newTech) {
        throw new Error('Failed to create technician');
      }

      // Audit Log
      try {
        if (actorId) {
          await database.insert(auditLogs).values({
            actorId,
            action: 'CREATE',
            entityType: 'USER',
            entityId: newTech.id,
            afterState: newTech,
          });
        }
      } catch {}

      memoryTechnicians.unshift(newTech);
      return newTech;
    } catch (err: any) {
      if (err.message?.includes('already exists')) throw err;
      console.warn('[TechniciansRepository.create] DB insert notice, using memory fallback:', err?.message);

      const existingMem = memoryTechnicians.find((t) => t.phone === input.phone);
      if (existingMem) {
        throw new Error(`A technician with phone number "${input.phone}" already exists`);
      }

      const dbStatus: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' = input.status === 'SUSPENDED' ? 'INACTIVE' : (input.status || 'ACTIVE');
      const newTech = {
        id: randomUUID(),
        fullName: input.fullName,
        phone: input.phone,
        email: input.email || null,
        address: input.address || null,
        skills: input.skills || ['RO Installation', 'General Service'],
        emergencyContact: input.emergencyContact || null,
        userId: input.userId || null,
        status: dbStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      memoryTechnicians.unshift(newTech);
      return newTech;
    }
  }

  /**
   * Update technician profile or status
   */
  async update(id: string, input: UpdateTechnicianInput, actorId?: string, database = db) {
    try {
      await this.ensureDefaultTechnicians(database);

      const existing = await this.findById(id, database);
      if (!existing) {
        throw new Error('Technician not found');
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (input.fullName) updateData.fullName = input.fullName;
      if (input.phone) updateData.phone = input.phone;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.skills) updateData.skills = input.skills;
      if (input.emergencyContact !== undefined) updateData.emergencyContact = input.emergencyContact;
      if (input.status) {
        updateData.status = (input.status as string) === 'SUSPENDED' ? 'INACTIVE' : input.status;
      }
      if (input.userId !== undefined) updateData.userId = input.userId;

      const [updated] = await database
        .update(technicians)
        .set(updateData)
        .where(eq(technicians.id, id))
        .returning();

      // Audit Log
      try {
        if (actorId) {
          await database.insert(auditLogs).values({
            actorId,
            action: 'UPDATE',
            entityType: 'USER',
            entityId: id,
            beforeState: existing,
            afterState: updated,
          });
        }
      } catch {}

      const memIdx = memoryTechnicians.findIndex((t) => t.id === id);
      if (memIdx !== -1) {
        memoryTechnicians[memIdx] = { ...memoryTechnicians[memIdx], ...updated };
      }

      return updated || { ...existing, ...updateData };
    } catch (err: any) {
      if (err.message?.includes('not found')) throw err;
      console.warn('[TechniciansRepository.update] DB update notice, using memory fallback:', err?.message);

      const tech = memoryTechnicians.find((t) => t.id === id);
      if (!tech) {
        throw new Error('Technician not found');
      }

      if (input.fullName) tech.fullName = input.fullName;
      if (input.phone) tech.phone = input.phone;
      if (input.email !== undefined) tech.email = input.email;
      if (input.address !== undefined) tech.address = input.address;
      if (input.skills) tech.skills = input.skills;
      if (input.emergencyContact !== undefined) tech.emergencyContact = input.emergencyContact;
      if (input.status) {
        tech.status = (input.status as string) === 'SUSPENDED' ? 'INACTIVE' : input.status;
      }
      if (input.userId !== undefined) tech.userId = input.userId;
      tech.updatedAt = new Date();

      return tech;
    }
  }
}

export const techniciansRepository = new TechniciansRepository();
