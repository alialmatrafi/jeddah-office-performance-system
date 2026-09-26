import {
  DailyPerformanceRow,
  PerformanceRecord,
  PerformanceReport,
  PerformanceTotals,
  ProcessorPerformanceRow,
  ReturnSummary,
  WorkCounts,
} from './types.js';

export function emptyWorkCounts(): WorkCounts {
  return {
    excellentMail: 0,
    officialMail: 0,
    registeredMail: 0,
    governmentDocs: 0,
    parcels: 0,
  };
}

export function addWorkCounts(left: WorkCounts, right: WorkCounts): WorkCounts {
  return {
    excellentMail: left.excellentMail + right.excellentMail,
    officialMail: left.officialMail + right.officialMail,
    registeredMail: left.registeredMail + right.registeredMail,
    governmentDocs: left.governmentDocs + right.governmentDocs,
    parcels: left.parcels + right.parcels,
  };
}

export function totalWork(counts: WorkCounts): number {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

function earliest(left: string | null, right: string | null): string | null {
  if (left === null) {
    return right;
  }
  if (right === null) {
    return left;
  }
  return left < right ? left : right;
}

function latest(left: string | null, right: string | null): string | null {
  if (left === null) {
    return right;
  }
  if (right === null) {
    return left;
  }
  return left > right ? left : right;
}

export function aggregatePerformance(
  records: PerformanceRecord[],
  returns: ReturnSummary[],
  dateRange: { from: string; to: string },
): PerformanceReport {
  const totals: PerformanceTotals = {
    ...emptyWorkCounts(),
    totalWork: 0,
    shipmentEntries: 0,
    returns: 0,
  };
  const processorRows = new Map<string, ProcessorPerformanceRow>();
  const dailyRows = new Map<string, DailyPerformanceRow>();

  for (const record of records) {
    const counts: WorkCounts = {
      excellentMail: record.excellentMail,
      officialMail: record.officialMail,
      registeredMail: record.registeredMail,
      governmentDocs: record.governmentDocs,
      parcels: record.parcels,
    };
    const recordTotal = totalWork(counts);
    Object.assign(totals, addWorkCounts(totals, counts));
    totals.totalWork += recordTotal;
    totals.shipmentEntries += record.shipmentEntryCount;

    const existingProcessor = processorRows.get(record.processorId);
    if (existingProcessor) {
      const merged = addWorkCounts(existingProcessor, counts);
      Object.assign(existingProcessor, merged);
      existingProcessor.workDays += 1;
      existingProcessor.totalWork += recordTotal;
      existingProcessor.shipmentEntries += record.shipmentEntryCount;
      existingProcessor.averageWorkPerDay = existingProcessor.totalWork / existingProcessor.workDays;
    } else {
      processorRows.set(record.processorId, {
        ...counts,
        processorId: record.processorId,
        processorName: record.processorName,
        processorUsername: record.processorUsername,
        workDays: 1,
        totalWork: recordTotal,
        shipmentEntries: record.shipmentEntryCount,
        returns: 0,
        averageWorkPerDay: recordTotal,
      });
    }

    const existingDaily = dailyRows.get(record.workDate);
    if (existingDaily) {
      const merged = addWorkCounts(existingDaily, counts);
      Object.assign(existingDaily, merged);
      existingDaily.workDays += 1;
      existingDaily.totalWork += recordTotal;
      existingDaily.shipmentEntries += record.shipmentEntryCount;
      existingDaily.firstOperationAt = earliest(existingDaily.firstOperationAt, record.firstOperationAt);
      existingDaily.lastOperationAt = latest(existingDaily.lastOperationAt, record.lastOperationAt);
    } else {
      dailyRows.set(record.workDate, {
        ...counts,
        workDate: record.workDate,
        workDays: 1,
        totalWork: recordTotal,
        shipmentEntries: record.shipmentEntryCount,
        firstOperationAt: record.firstOperationAt,
        lastOperationAt: record.lastOperationAt,
      });
    }
  }

  for (const item of returns) {
    totals.returns += item.quantity;
    const processorRow = processorRows.get(item.processorId);
    if (processorRow) {
      processorRow.returns += item.quantity;
    }
  }

  return {
    dateRange,
    totals,
    perProcessor: [...processorRows.values()].sort((left, right) => right.totalWork - left.totalWork),
    daily: [...dailyRows.values()].sort((left, right) => left.workDate.localeCompare(right.workDate)),
  };
}
