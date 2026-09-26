import type {
  DailyWorkView,
  DistributorView,
  ReturnView,
  UserView,
} from '@jeddah/shared';
import {
  DistributorStatus,
  UserRole,
  UserStatus,
} from '@jeddah/shared';

type UserRecord = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

type DistributorRecord = {
  id: string;
  name: string;
  status: DistributorStatus;
  createdAt: Date;
  updatedAt: Date;
};

type WorkRecord = {
  id: string;
  processorId: string;
  workDate: Date;
  excellentMail: number;
  officialMail: number;
  registeredMail: number;
  governmentDocs: number;
  parcels: number;
  processor: {
    name: string;
    username: string;
  };
  shipmentEntries: Array<{
    id: string;
    distributorId: string;
    districtId: string;
    entryCount: number;
    distributor: { name: string };
    district: { name: string };
  }>;
  createdAt: Date;
  updatedAt: Date;
};

type ReturnRecord = {
  id: string;
  distributorId: string;
  processorId: string;
  quantity: number;
  supervisorReceivedQuantity: number;
  officeReissueQuantity: number;
  note: string | null;
  distributor: { name: string };
  processor: { name: string; username: string };
  createdAt: Date;
  updatedAt: Date;
};

export function toUserView(user: UserRecord): UserView {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toDistributorView(distributor: DistributorRecord): DistributorView {
  return {
    id: distributor.id,
    name: distributor.name,
    status: distributor.status,
    createdAt: distributor.createdAt.toISOString(),
    updatedAt: distributor.updatedAt.toISOString(),
  };
}

export function toWorkView(work: WorkRecord): DailyWorkView {
  return {
    id: work.id,
    processorId: work.processorId,
    processorName: work.processor.name,
    processorUsername: work.processor.username,
    workDate: work.workDate.toISOString().slice(0, 10),
    excellentMail: work.excellentMail,
    officialMail: work.officialMail,
    registeredMail: work.registeredMail,
    governmentDocs: work.governmentDocs,
    parcels: work.parcels,
    shipmentEntries: work.shipmentEntries.map((entry) => ({
      id: entry.id,
      distributorId: entry.distributorId,
      districtId: entry.districtId,
      entryCount: entry.entryCount,
      distributorName: entry.distributor.name,
      districtName: entry.district.name,
    })),
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  };
}

export function toReturnView(record: ReturnRecord): ReturnView {
  return {
    id: record.id,
    distributorId: record.distributorId,
    distributorName: record.distributor.name,
    processorId: record.processorId,
    processorName: record.processor.name,
    processorUsername: record.processor.username,
    quantity: record.quantity,
    supervisorReceivedQuantity: record.supervisorReceivedQuantity,
    officeReissueQuantity: record.officeReissueQuantity,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
