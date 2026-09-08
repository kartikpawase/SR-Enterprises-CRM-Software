import { describe, it, expect } from 'vitest';
import { JobCardsRepository } from './job-cards.repository';

describe('JobCardsRepository - KPI Summary Statistics', () => {
  const repository = new JobCardsRepository();

  it('returns valid numeric KPIs with all authoritative summary properties', async () => {
    const kpis = await repository.getKPIs();

    expect(kpis).toBeDefined();
    expect(typeof kpis.totalJobCards).toBe('number');
    expect(typeof kpis.assignedCount).toBe('number');
    expect(typeof kpis.inProgressCount).toBe('number');
    expect(typeof kpis.onHoldCount).toBe('number');
    expect(typeof kpis.completedCount).toBe('number');
    expect(typeof kpis.cancelledCount).toBe('number');

    // Backward compatibility keys
    expect(typeof kpis.scheduled).toBe('number');
    expect(typeof kpis.assigned).toBe('number');
    expect(typeof kpis.inProgress).toBe('number');
    expect(typeof kpis.onHold).toBe('number');
    expect(typeof kpis.completed).toBe('number');
    expect(typeof kpis.cancelled).toBe('number');

    // Values should not be NaN
    expect(Number.isNaN(kpis.totalJobCards)).toBe(false);
    expect(Number.isNaN(kpis.assignedCount)).toBe(false);
    expect(Number.isNaN(kpis.inProgressCount)).toBe(false);
    expect(Number.isNaN(kpis.completedCount)).toBe(false);

    // Sum of categorized counts cannot exceed totalJobCards
    expect(kpis.totalJobCards).toBeGreaterThanOrEqual(
      kpis.assignedCount + kpis.inProgressCount + kpis.onHoldCount + kpis.completedCount + kpis.cancelledCount
    );
  });
});
