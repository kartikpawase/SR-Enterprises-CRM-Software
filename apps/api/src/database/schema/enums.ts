import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * User & RBAC Enums
 */
export const userRoleEnum = pgEnum('user_role', ['Super Admin', 'Admin', 'Staff', 'Technician']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE', 'SUSPENDED']);

/**
 * Customer & Address Enums
 */
export const customerTypeEnum = pgEnum('customer_type', ['INDIVIDUAL', 'COMMERCIAL']);
export const customerStatusEnum = pgEnum('customer_status', ['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export const customerLabelEnum = pgEnum('customer_label', ['GOOD', 'BAD']);
export const addressTypeEnum = pgEnum('address_type', ['BILLING', 'SERVICE', 'BOTH']);

/**
 * Product & Asset Enums
 */
export const productTypeEnum = pgEnum('product_type', ['RO_MACHINE', 'SPARE_PART']);
export const assetTypeEnum = pgEnum('asset_type', ['RO_MACHINE', 'SPARE_PART']);
export const assetStatusEnum = pgEnum('asset_status', ['ACTIVE', 'IN_SERVICE', 'REPLACED', 'DECOMMISSIONED']);

/**
 * Sales & Financial Enums
 */
export const saleStatusEnum = pgEnum('sale_status', ['DRAFT', 'COMPLETED', 'CANCELLED']);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
]);
export const invoiceItemTypeEnum = pgEnum('invoice_item_type', ['PRODUCT', 'SERVICE', 'SPARE_PART', 'CUSTOM']);
export const paymentMethodEnum = pgEnum('payment_method', [
  'CASH',
  'UPI',
  'CARD',
  'BANK_TRANSFER',
  'CHEQUE',
  'OTHER',
]);
export const paymentStatusEnum = pgEnum('payment_status', ['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED']);
export const reminderTypeEnum = pgEnum('reminder_type', [
  'PAYMENT_FOLLOW_UP',
  'OVERDUE_PAYMENT',
  'INVOICE_DUE',
  'SERVICE_DUE',
  'WARRANTY_EXPIRY',
  'CUSTOMER_FOLLOW_UP',
]);
export const reminderStatusEnum = pgEnum('reminder_status', ['PENDING', 'COMPLETED', 'CANCELLED', 'MISSED']);

/**
 * Warranty & Lifecycle Enums
 */
export const warrantyTypeEnum = pgEnum('warranty_type', [
  'STANDARD_MACHINE',
  'EXTENDED_MACHINE',
  'SPARE_PART',
]);
export const warrantyStatusEnum = pgEnum('warranty_status', ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'VOID']);
export const warrantyEventTypeEnum = pgEnum('warranty_event_type', [
  'ACTIVATED',
  'EXTENDED',
  'CLAIM_FILED',
  'REPLACEMENT_APPROVED',
  'REPLACEMENT_COMPLETED',
  'VOIDED',
  'EXPIRED',
]);

/**
 * Service & Job Card Enums
 */
export const serviceTypeEnum = pgEnum('service_type', [
  'INSTALLATION',
  'REPAIR',
  'PERIODIC_MAINTENANCE',
  'EMERGENCY',
  'SPARE_REPLACEMENT',
]);
export const serviceLocationEnum = pgEnum('service_location', ['DOORSTEP', 'IN_SHOP']);
export const serviceClassificationEnum = pgEnum('service_classification', ['GENERAL', 'WARRANTY']);
export const serviceStatusEnum = pgEnum('service_status', [
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'OVERDUE',
]);
export const servicePriorityEnum = pgEnum('service_priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const serviceScheduleStatusEnum = pgEnum('service_schedule_status', [
  'PENDING',
  'SERVICE_CREATED',
  'COMPLETED',
  'SKIPPED',
]);
export const jobCardStatusEnum = pgEnum('job_card_status', [
  'SCHEDULED',
  'ASSIGNED',
  'STARTED',
  'DIAGNOSIS',
  'IN_PROGRESS',
  'ON_HOLD',
  'CANCELLED',
  'COMPLETED',
  'CUSTOMER_CONFIRMED',
  'CLOSED',
]);
export const technicianStatusEnum = pgEnum('technician_status', ['ACTIVE', 'ON_LEAVE', 'INACTIVE']);

/**
 * Inquiry Enums
 */
export const inquirySourceEnum = pgEnum('inquiry_source', [
  'WEBSITE',
  'DIRECT',
  'DIRECT_CALL',
  'PHONE',
  'WHATSAPP',
  'REFERRAL',
  'SOCIAL',
  'WALK_IN',
  'OTHER',
]);
export const inquiryTypeEnum = pgEnum('inquiry_type', [
  'NEW_PURCHASE',
  'SERVICE',
  'REPAIR',
  'WARRANTY',
  'INSTALLATION',
  'PRODUCT_INFORMATION',
  'GENERAL',
]);
export const inquiryStatusEnum = pgEnum('inquiry_status', [
  'NEW',
  'CONTACTED',
  'FOLLOW_UP',
  'IN_PROGRESS',
  'QUALIFIED',
  'CONVERTED',
  'CLOSED',
  'SPAM',
]);
export const inquiryPriorityEnum = pgEnum('inquiry_priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT']);

/**
 * WhatsApp Business Enums
 */
export const whatsappOptInStatusEnum = pgEnum('whatsapp_opt_in_status', [
  'OPTED_IN',
  'OPTED_OUT',
  'UNKNOWN',
]);
export const whatsappConversationStatusEnum = pgEnum('whatsapp_conversation_status', [
  'ACTIVE',
  'CLOSED',
  'ARCHIVED',
]);
export const whatsappDirectionEnum = pgEnum('whatsapp_direction', ['INBOUND', 'OUTBOUND']);
export const whatsappMessageTypeEnum = pgEnum('whatsapp_message_type', [
  'TEXT',
  'TEMPLATE',
  'IMAGE',
  'DOCUMENT',
  'OTHER',
]);
export const whatsappMessageStatusEnum = pgEnum('whatsapp_message_status', [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
]);

/**
 * Notification Enums
 */
export const notificationSeverityEnum = pgEnum('notification_severity', [
  'INFO',
  'SUCCESS',
  'WARNING',
  'CRITICAL',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'NEW_INQUIRY',
  'PAYMENT_RECEIVED',
  'INVOICE_OVERDUE',
  'REMINDER_DUE',
  'SERVICE_DUE',
  'JOB_ASSIGNED',
  'JOB_COMPLETED',
  'WARRANTY_EXPIRING',
  'WHATSAPP_FAILURE',
  'SYSTEM_WARNING',
  'PAYMENT_DUE',
  'PAYMENT_OVERDUE',
  'JOB_CARD_UPDATE',
  'SYSTEM_ALERT',
]);

/**
 * Customer Activity & Audit Enums
 */
export const customerEventTypeEnum = pgEnum('customer_event_type', [
  'CUSTOMER_CREATED',
  'CUSTOMER_UPDATED',
  'CUSTOMER_ARCHIVED',
  'SALE_COMPLETED',
  'INVOICE_GENERATED',
  'INVOICE_SENT',
  'PAYMENT_RECEIVED',
  'PAYMENT_CANCELLED',
  'PAYMENT_OVERDUE',
  'REMINDER_CREATED',
  'REMINDER_COMPLETED',
  'SERVICE_SCHEDULED',
  'SERVICE_COMPLETED',
  'JOB_CARD_CREATED',
  'JOB_CARD_COMPLETED',
  'WARRANTY_ACTIVATED',
  'WARRANTY_EXPIRING',
  'WARRANTY_EXPIRED',
  'WARRANTY_REPLACEMENT',
  'INQUIRY_CONVERTED',
]);
export const auditActionEnum = pgEnum('audit_action', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'ARCHIVE',
  'RESTORE',
  'LOGIN',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'LOCKOUT_TRIGGERED',
  'PERMISSION_CHANGE',
  'CANCEL',
]);

/**
 * Document & Storage Enums
 */
export const documentEntityTypeEnum = pgEnum('document_entity_type', [
  'CUSTOMER',
  'SALE',
  'INVOICE',
  'SERVICE',
  'JOB_CARD',
  'PRODUCT',
  'WARRANTY',
]);
export const storageProviderEnum = pgEnum('storage_provider', ['S3_R2', 'LOCAL']);

/**
 * Transactional Email & Queue Enums
 */
export const emailEventTypeEnum = pgEnum('email_event_type', [
  'SALE_CONFIRMATION',
  'PAYMENT_RECEIPT',
  'SERVICE_COMPLETED',
  'SERVICE_REMINDER',
  'PAYMENT_REMINDER',
  'THANK_YOU',
  'WARRANTY_EXPIRY_REMINDER',
  'INVOICE_EMAIL',
  'ADMIN_TEST',
  'GENERAL',
]);

export const emailDeliveryStatusEnum = pgEnum('email_delivery_status', [
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'SKIPPED',
]);

