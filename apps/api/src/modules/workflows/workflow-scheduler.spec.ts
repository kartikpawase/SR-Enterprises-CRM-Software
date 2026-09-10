import { describe, it, expect } from 'vitest';
import { WorkflowScheduler } from './engine/workflow-scheduler';

describe('WorkflowScheduler & Business Rules Automation', () => {
  it('runs all scheduled automations safely', async () => {
    const summary = await WorkflowScheduler.runAllScheduledAutomations();

    expect(summary).toBeDefined();
    expect(summary.overdueInvoicesProcessed).toBeGreaterThanOrEqual(0);
    expect(summary.expiringWarrantiesProcessed).toBeGreaterThanOrEqual(0);
    expect(summary.lowStockAlertsTriggered).toBeGreaterThanOrEqual(0);
    expect(summary.outboxEventsProcessed).toBeGreaterThanOrEqual(0);
  }, 20000);

  it('scans overdue invoices without throwing errors', async () => {
    const count = await WorkflowScheduler.processOverdueInvoices();
    expect(typeof count).toBe('number');
  });

  it('scans expiring warranties using configured notification thresholds', async () => {
    const count = await WorkflowScheduler.processExpiringWarranties();
    expect(typeof count).toBe('number');
  });

  it('scans low stock alerts using configured inventory threshold', async () => {
    const count = await WorkflowScheduler.processLowStockAlerts();
    expect(typeof count).toBe('number');
  });
});
