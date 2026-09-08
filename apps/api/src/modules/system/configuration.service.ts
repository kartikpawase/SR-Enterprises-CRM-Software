import { z } from 'zod';
import { db } from '../../database/client';
import { appSettings } from '../../database/schema/settings';
import { auditLogs } from '../../database/schema/audit';
import { eq } from 'drizzle-orm';
import type {
  SettingsCategory,
  SystemSettings,
  BusinessSettings,
  TaxSettings,
  InvoiceSettings,
  PaymentSettings,
  SalesSettings,
  ServiceSettings,
  JobCardSettings,
  WarrantySettings,
  InventorySettings,
  NotificationSettings,
  NumberingSettings,
  SecuritySettings,
  AllSettingsResponse,
  PublicSettingsResponse,
  SettingsHealthResponse,
} from '@crm/types';

// ============================================================
// ZOD VALIDATION SCHEMAS PER CATEGORY
// ============================================================

export const SystemSettingsSchema = z.object({
  appName: z.string().min(1).max(100),
  appVersion: z.string().min(1).max(20),
  timezone: z.string().min(1).max(50),
  currency: z.string().min(1).max(10),
  currencySymbol: z.string().min(1).max(5),
  dateFormat: z.string().min(1).max(20),
  timeFormat: z.enum(['12h', '24h']),
  locale: z.string().min(1).max(20),
  defaultPageSize: z.number().int().min(5).max(200),
});

export const BusinessSettingsSchema = z.object({
  businessName: z.string().min(1).max(150),
  legalName: z.string().min(1).max(200),
  address: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().regex(/^\d{6}$/, 'Postal code must be 6 digits'),
  country: z.string().min(1).max(100),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be a valid 10-digit number'),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal('')),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format').optional().or(z.literal('')),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional().or(z.literal('')),
  logoUrl: z.string().optional().or(z.literal('')),
});

export const TaxSettingsSchema = z.object({
  taxEnabled: z.boolean(),
  defaultTaxRatePercent: z.number().min(0).max(100),
  taxInclusivePricing: z.boolean(),
  taxNumber: z.string().optional().or(z.literal('')),
  defaultHsnSac: z.string().optional().or(z.literal('')),
});

export const InvoiceSettingsSchema = z.object({
  prefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/, 'Prefix must be uppercase alphanumeric'),
  numberFormat: z.string().min(1).max(50),
  startingNumber: z.number().int().min(1),
  paymentTermsDays: z.number().int().min(0).max(365),
  defaultNotes: z.string().max(1000),
  defaultTermsAndConditions: z.string().max(2000),
  showTaxBreakdown: z.boolean(),
  showGst: z.boolean(),
  footerText: z.string().max(200).optional().or(z.literal('')),
});

export const PaymentSettingsSchema = z.object({
  defaultPaymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'NET_BANKING', 'OTHER']),
  defaultDuePeriodDays: z.number().int().min(0).max(365),
  allowPartialPayments: z.boolean(),
  autoGenerateReceipts: z.boolean(),
});

export const SalesSettingsSchema = z.object({
  defaultSalesStatus: z.enum(['COMPLETED', 'DRAFT']),
  autoGenerateInvoiceOnSale: z.boolean(),
  autoCreateAssetOnSale: z.boolean(),
  autoCreateWarrantyOnSale: z.boolean(),
});

export const ServiceSettingsSchema = z.object({
  defaultServiceDurationMinutes: z.number().int().min(15).max(1440),
  defaultServicePriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  slaHours: z.number().int().min(1).max(720),
  autoCreateJobCardOnService: z.boolean(),
});

export const JobCardSettingsSchema = z.object({
  prefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/, 'Prefix must be uppercase alphanumeric'),
  defaultPriority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  requireCustomerSignature: z.boolean(),
  requireOtpVerification: z.boolean(),
});

export const WarrantySettingsSchema = z.object({
  defaultWarrantyMonths: z.number().int().min(0).max(120),
  defaultServiceIntervalMonths: z.number().int().min(1).max(36),
  expiryNotificationThresholdDays: z.number().int().min(1).max(180),
  allowAmcUpgrade: z.boolean(),
});

export const InventorySettingsSchema = z.object({
  lowStockThreshold: z.number().int().min(0).max(10000),
  allowNegativeStock: z.boolean(),
  valuationMethod: z.enum(['FIFO', 'WEIGHTED_AVERAGE']),
  skuPrefix: z.string().max(10).optional().or(z.literal('')),
});

export const NotificationSettingsSchema = z.object({
  warrantyExpiryReminderDays: z.array(z.number().int().min(1).max(365)),
  invoiceDueReminderDays: z.array(z.number().int().min(1).max(365)),
  serviceReminderDays: z.array(z.number().int().min(1).max(365)),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
});

export const NumberingSettingsSchema = z.object({
  customerPrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  invoicePrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  salePrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  servicePrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  jobCardPrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  paymentPrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  warrantyPrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  assetPrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  inquiryPrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  reminderPrefix: z.string().min(1).max(10).regex(/^[A-Z0-9_-]+$/),
  padding: z.number().int().min(2).max(10),
  yearReset: z.boolean(),
});

export const SecuritySettingsSchema = z.object({
  sessionTimeoutMinutes: z.number().int().min(15).max(10080),
  maxLoginAttempts: z.number().int().min(3).max(20),
  lockoutDurationMinutes: z.number().int().min(1).max(1440),
  passwordMinLength: z.number().int().min(8).max(128),
  passwordRequireSpecialChar: z.boolean(),
});

export const CategoryValidators: Record<SettingsCategory, z.ZodTypeAny> = {
  SYSTEM: SystemSettingsSchema,
  BUSINESS: BusinessSettingsSchema,
  TAX: TaxSettingsSchema,
  INVOICE: InvoiceSettingsSchema,
  PAYMENT: PaymentSettingsSchema,
  SALES: SalesSettingsSchema,
  SERVICE: ServiceSettingsSchema,
  JOB_CARD: JobCardSettingsSchema,
  WARRANTY: WarrantySettingsSchema,
  INVENTORY: InventorySettingsSchema,
  NOTIFICATION: NotificationSettingsSchema,
  NUMBERING: NumberingSettingsSchema,
  SECURITY: SecuritySettingsSchema,
};

// ============================================================
// SYSTEM DEFAULT VALUES (IMMUTABLE SYSTEM FALLBACKS)
// ============================================================

export const SYSTEM_DEFAULTS: Record<SettingsCategory, any> = {
  SYSTEM: {
    appName: 'SR Enterprises CRM / SRM',
    appVersion: '1.0.0',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    locale: 'en-IN',
    defaultPageSize: 25,
  } as SystemSettings,

  BUSINESS: {
    businessName: 'SR Enterprises',
    legalName: 'SR Enterprises Water Purification Services',
    address: 'Shop 4, Om Heights, Baner Road',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411045',
    country: 'India',
    phone: '7385059197',
    email: 'srenterprises02015@gmail.com',
    website: 'https://srenterprises.com',
    gstin: '27AAAAA0000A1Z5',
    panNumber: 'AAAAA0000A',
    logoUrl: '',
  } as BusinessSettings,

  TAX: {
    taxEnabled: true,
    defaultTaxRatePercent: 18.00,
    taxInclusivePricing: false,
    taxNumber: '27AAAAA0000A1Z5',
    defaultHsnSac: '84212190',
  } as TaxSettings,

  INVOICE: {
    prefix: 'INV',
    numberFormat: 'INV-{YYYY}-{COUNTER}',
    startingNumber: 1,
    paymentTermsDays: 30,
    defaultNotes: 'Thank you for choosing SR Enterprises for your pure water needs.',
    defaultTermsAndConditions: '1. Payment due within 30 days.\n2. Goods once sold are covered under standard warranty.',
    showTaxBreakdown: true,
    showGst: true,
    footerText: 'Authorized Signature',
  } as InvoiceSettings,

  PAYMENT: {
    defaultPaymentMethod: 'UPI',
    defaultDuePeriodDays: 30,
    allowPartialPayments: true,
    autoGenerateReceipts: true,
  } as PaymentSettings,

  SALES: {
    defaultSalesStatus: 'COMPLETED',
    autoGenerateInvoiceOnSale: true,
    autoCreateAssetOnSale: true,
    autoCreateWarrantyOnSale: true,
  } as SalesSettings,

  SERVICE: {
    defaultServiceDurationMinutes: 60,
    defaultServicePriority: 'MEDIUM',
    slaHours: 24,
    autoCreateJobCardOnService: true,
  } as ServiceSettings,

  JOB_CARD: {
    prefix: 'JC',
    defaultPriority: 'NORMAL',
    requireCustomerSignature: false,
    requireOtpVerification: false,
  } as JobCardSettings,

  WARRANTY: {
    defaultWarrantyMonths: 12,
    defaultServiceIntervalMonths: 6,
    expiryNotificationThresholdDays: 30,
    allowAmcUpgrade: true,
  } as WarrantySettings,

  INVENTORY: {
    lowStockThreshold: 5,
    allowNegativeStock: false,
    valuationMethod: 'FIFO',
    skuPrefix: 'SR',
  } as InventorySettings,

  NOTIFICATION: {
    warrantyExpiryReminderDays: [30, 15, 7],
    invoiceDueReminderDays: [7, 3, 1],
    serviceReminderDays: [14, 7],
    inAppEnabled: true,
    emailEnabled: true,
    whatsappEnabled: true,
  } as NotificationSettings,

  NUMBERING: {
    customerPrefix: 'CX',
    invoicePrefix: 'INV',
    salePrefix: 'SALE',
    servicePrefix: 'SRV',
    jobCardPrefix: 'JC',
    paymentPrefix: 'PAY',
    warrantyPrefix: 'WAR',
    assetPrefix: 'ASSET',
    inquiryPrefix: 'INQ',
    reminderPrefix: 'REM',
    padding: 4,
    yearReset: true,
  } as NumberingSettings,

  SECURITY: {
    sessionTimeoutMinutes: 1440,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
  } as SecuritySettings,
};

// ============================================================
// CENTRAL CONFIGURATION SERVICE IMPLEMENTATION
// ============================================================

export class ConfigurationService {
  private static instance: ConfigurationService;
  private cache = new Map<SettingsCategory, { value: any; version: number; cachedAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Clears the in-memory settings cache
   */
  public clearCache(category?: SettingsCategory): void {
    if (category) {
      this.cache.delete(category);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Retrieves configuration for a given category.
   * Checks in-memory cache -> queries database -> falls back to system defaults.
   */
  public async get<T>(category: SettingsCategory): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(category);

    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.value as T;
    }

    try {
      const record = await db.query.appSettings.findFirst({
        where: eq(appSettings.category, category),
      });

      if (record && record.value) {
        // Deep merge stored value over system defaults for backward compatibility
        const mergedValue = {
          ...SYSTEM_DEFAULTS[category],
          ...(record.value as object),
        };
        this.cache.set(category, {
          value: mergedValue,
          version: record.version,
          cachedAt: now,
        });
        return mergedValue as T;
      }
    } catch {
      // If DB fails or during early boot, safely return system defaults
    }

    const defaultValue = { ...SYSTEM_DEFAULTS[category] };
    this.cache.set(category, {
      value: defaultValue,
      version: 1,
      cachedAt: now,
    });
    return defaultValue as T;
  }

  /**
   * Retrieves a specific setting key inside a category
   */
  public async getSetting<T = any>(category: SettingsCategory, key: string): Promise<T> {
    const categoryConfig = await this.get<Record<string, any>>(category);
    return categoryConfig[key];
  }

  /**
   * Get version of a category for optimistic concurrency
   */
  public async getCategoryVersion(category: SettingsCategory): Promise<number> {
    const cached = this.cache.get(category);
    if (cached) return cached.version;

    try {
      const record = await db.query.appSettings.findFirst({
        where: eq(appSettings.category, category),
      });
      return record?.version ?? 1;
    } catch {
      return 1;
    }
  }

  /**
   * Retrieves all configuration categories
   */
  public async getAll(): Promise<AllSettingsResponse> {
    const categories: SettingsCategory[] = [
      'SYSTEM',
      'BUSINESS',
      'TAX',
      'INVOICE',
      'PAYMENT',
      'SALES',
      'SERVICE',
      'JOB_CARD',
      'WARRANTY',
      'INVENTORY',
      'NOTIFICATION',
      'NUMBERING',
      'SECURITY',
    ];

    const versionMap: Record<SettingsCategory, number> = {} as any;
    const results: any = {};

    for (const cat of categories) {
      results[cat.toLowerCase()] = await this.get(cat);
      versionMap[cat] = await this.getCategoryVersion(cat);
    }

    return {
      system: results.system,
      business: results.business,
      tax: results.tax,
      invoice: results.invoice,
      payment: results.payment,
      sales: results.sales,
      service: results.service,
      jobCard: results.job_card,
      warranty: results.warranty,
      inventory: results.inventory,
      notification: results.notification,
      numbering: results.numbering,
      security: results.security,
      metadata: {
        cachedAt: new Date().toISOString(),
        versionMap,
      },
    };
  }

  /**
   * Retrieves safe public business and localization settings (No auth required)
   */
  public async getPublicSettings(): Promise<PublicSettingsResponse> {
    const system = await this.get<SystemSettings>('SYSTEM');
    const business = await this.get<BusinessSettings>('BUSINESS');
    const tax = await this.get<TaxSettings>('TAX');

    return {
      appName: system.appName,
      appVersion: system.appVersion,
      businessName: business.businessName,
      currency: system.currency,
      currencySymbol: system.currencySymbol,
      dateFormat: system.dateFormat,
      timezone: system.timezone,
      locale: system.locale,
      phone: business.phone,
      email: business.email,
      city: business.city,
      taxEnabled: tax.taxEnabled,
      defaultTaxRatePercent: tax.defaultTaxRatePercent,
    };
  }

  /**
   * Updates configuration category with optimistic locking, validation, and audit logging.
   */
  public async update<T>(
    category: SettingsCategory,
    patchData: Partial<T>,
    expectedVersion?: number,
    actorId?: string,
    actorName?: string
  ): Promise<{ success: boolean; data: T; version: number }> {
    const current = await this.get<T>(category);
    const currentVersion = await this.getCategoryVersion(category);

    // Optimistic Concurrency Check
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new Error(
        `Configuration conflict! The ${category} settings have been modified by another administrator (Expected version ${expectedVersion}, but current is ${currentVersion}). Please reload and retry.`
      );
    }

    // Merge proposed patch with current configuration
    const merged = { ...current, ...patchData };

    // Validate using category schema
    const validator = CategoryValidators[category];
    if (validator) {
      const parseResult = validator.safeParse(merged);
      if (!parseResult.success) {
        const errorMessages = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new Error(`Invalid ${category} settings: ${errorMessages}`);
      }
    }

    const nextVersion = currentVersion + 1;

    // Database Transaction: Update setting & record audit log
    await db.transaction(async (tx: any) => {
      await tx
        .insert(appSettings)
        .values({
          category,
          value: merged as object,
          version: nextVersion,
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettings.category,
          set: {
            value: merged as object,
            version: nextVersion,
            updatedBy: actorId,
            updatedAt: new Date(),
          },
        });

      // Record Audit Trail
      await tx.insert(auditLogs).values({
        actorId,
        actorUsername: actorName,
        action: 'UPDATE',
        entityType: 'SETTINGS',
        entityId: category,
        beforeState: current as object,
        afterState: merged as object,
      });
    });

    // Invalidate Cache immediately
    this.clearCache(category);

    return {
      success: true,
      data: merged as T,
      version: nextVersion,
    };
  }

  /**
   * Resets a category to system default settings
   */
  public async resetToDefaults(
    category: SettingsCategory,
    actorId?: string,
    actorName?: string
  ): Promise<{ success: boolean; data: any; version: number }> {
    const current = await this.get(category);
    const defaultValue = SYSTEM_DEFAULTS[category];
    const currentVersion = await this.getCategoryVersion(category);
    const nextVersion = currentVersion + 1;

    await db.transaction(async (tx: any) => {
      await tx
        .insert(appSettings)
        .values({
          category,
          value: defaultValue,
          version: nextVersion,
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettings.category,
          set: {
            value: defaultValue,
            version: nextVersion,
            updatedBy: actorId,
            updatedAt: new Date(),
          },
        });

      await tx.insert(auditLogs).values({
        actorId,
        actorUsername: actorName,
        action: 'UPDATE',
        entityType: 'SETTINGS',
        entityId: category,
        beforeState: current as object,
        afterState: { ...defaultValue, _reset: true } as object,
      });
    });

    this.clearCache(category);

    return {
      success: true,
      data: defaultValue,
      version: nextVersion,
    };
  }

  /**
   * Performs configuration health assessment
   */
  public async validateHealth(): Promise<SettingsHealthResponse> {
    const issues: string[] = [];
    const categories: Record<SettingsCategory, boolean> = {} as any;

    for (const [catKey, validator] of Object.entries(CategoryValidators)) {
      const cat = catKey as SettingsCategory;
      try {
        const val = await this.get(cat);
        const res = validator.safeParse(val);
        if (res.success) {
          categories[cat] = true;
        } else {
          categories[cat] = false;
          issues.push(`${cat} configuration contains invalid values: ${res.error.errors.map((e) => e.message).join(', ')}`);
        }
      } catch (err: any) {
        categories[cat] = false;
        issues.push(`${cat} could not be loaded: ${err.message}`);
      }
    }

    return {
      healthy: issues.length === 0,
      timestamp: new Date().toISOString(),
      issues,
      categories,
    };
  }
}

export const configService = ConfigurationService.getInstance();
