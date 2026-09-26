export const UserRole = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  PROCESSOR: 'PROCESSOR',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const DistributorStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type DistributorStatus = (typeof DistributorStatus)[keyof typeof DistributorStatus];

export const WORK_FIELDS = [
  'excellentMail',
  'officialMail',
  'registeredMail',
  'governmentDocs',
  'parcels',
] as const;
export type WorkField = (typeof WORK_FIELDS)[number];

export interface WorkCounts {
  excellentMail: number;
  officialMail: number;
  registeredMail: number;
  governmentDocs: number;
  parcels: number;
}

export interface ShipmentEntryInput {
  distributorId: string;
  districtId: string;
  entryCount: number;
}

export interface WorkInput extends WorkCounts {
  workDate: string;
  shipmentEntries: ShipmentEntryInput[];
}

export interface ShipmentEntryView {
  id: string;
  distributorId: string;
  districtId: string;
  entryCount: number;
  distributorName?: string;
  districtName?: string;
}

export interface DailyWorkView extends WorkCounts {
  id: string;
  processorId: string;
  processorName: string;
  processorUsername: string;
  workDate: string;
  shipmentEntries: ShipmentEntryView[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserView {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface DistributorView {
  id: string;
  name: string;
  status: DistributorStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface DistrictView {
  id: string;
  name: string;
}

export interface ReturnView {
  id: string;
  distributorId: string;
  distributorName: string;
  processorId: string;
  processorName: string;
  processorUsername: string;
  quantity: number;
  supervisorReceivedQuantity: number;
  officeReissueQuantity: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceRecord {
  id: string;
  processorId: string;
  processorName: string;
  processorUsername: string;
  workDate: string;
  excellentMail: number;
  officialMail: number;
  registeredMail: number;
  governmentDocs: number;
  parcels: number;
  shipmentEntryCount: number;
  firstOperationAt: string | null;
  lastOperationAt: string | null;
}

export interface ReturnSummary {
  processorId: string;
  quantity: number;
}

export interface PerformanceTotals extends WorkCounts {
  totalWork: number;
  shipmentEntries: number;
  returns: number;
}

export interface ProcessorPerformanceRow extends WorkCounts {
  processorId: string;
  processorName: string;
  processorUsername: string;
  workDays: number;
  totalWork: number;
  shipmentEntries: number;
  returns: number;
  averageWorkPerDay: number;
}

export interface DailyPerformanceRow extends WorkCounts {
  workDate: string;
  workDays: number;
  totalWork: number;
  shipmentEntries: number;
  firstOperationAt: string | null;
  lastOperationAt: string | null;
}

export interface PerformanceReport {
  dateRange: {
    from: string;
    to: string;
  };
  totals: PerformanceTotals;
  perProcessor: ProcessorPerformanceRow[];
  daily: DailyPerformanceRow[];
}

export interface ApiResponse<T> {
  data: T;
}
