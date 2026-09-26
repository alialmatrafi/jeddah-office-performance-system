import { describe, expect, it } from 'vitest';
import { aggregatePerformance, totalWork } from './index.js';

describe('report helpers', () => {
  it('aggregates work totals by processor and date', () => {
    const report = aggregatePerformance(
      [
        {
          id: 'work-1',
          processorId: 'processor-1',
          processorName: 'أحمد',
          processorUsername: 'ahmad',
          workDate: '2026-01-01',
          excellentMail: 2,
          officialMail: 3,
          registeredMail: 1,
          governmentDocs: 4,
          parcels: 5,
          shipmentEntryCount: 2,
          firstOperationAt: '2026-01-01T08:00:00.000Z',
          lastOperationAt: '2026-01-01T10:00:00.000Z',
        },
        {
          id: 'work-2',
          processorId: 'processor-1',
          processorName: 'أحمد',
          processorUsername: 'ahmad',
          workDate: '2026-01-02',
          excellentMail: 1,
          officialMail: 1,
          registeredMail: 2,
          governmentDocs: 1,
          parcels: 1,
          shipmentEntryCount: 3,
          firstOperationAt: '2026-01-02T07:00:00.000Z',
          lastOperationAt: '2026-01-02T09:00:00.000Z',
        },
      ],
      [{ processorId: 'processor-1', quantity: 4 }],
      { from: '2026-01-01', to: '2026-01-02' },
    );

    expect(report.totals.totalWork).toBe(21);
    expect(report.totals.shipmentEntries).toBe(5);
    expect(report.totals.returns).toBe(4);
    expect(report.perProcessor).toHaveLength(1);
    expect(report.perProcessor[0]?.workDays).toBe(2);
    expect(report.perProcessor[0]?.returns).toBe(4);
    expect(report.perProcessor[0]?.averageWorkPerDay).toBe(10.5);
    expect(report.daily).toHaveLength(2);
    expect(report.daily[0]?.firstOperationAt).toBe('2026-01-01T08:00:00.000Z');
    expect(report.daily[0]?.lastOperationAt).toBe('2026-01-01T10:00:00.000Z');
    expect(report.daily[1]?.firstOperationAt).toBe('2026-01-02T07:00:00.000Z');
    expect(report.daily[1]?.lastOperationAt).toBe('2026-01-02T09:00:00.000Z');
  });

  it('calculates the total number of work items', () => {
    expect(
      totalWork({
        excellentMail: 2,
        officialMail: 3,
        registeredMail: 4,
        governmentDocs: 5,
        parcels: 6,
      }),
    ).toBe(20);
  });
});
