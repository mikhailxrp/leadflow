import type { CompanyLegalForm, EventType, Prisma } from '@prisma/client';

export type SubscriptionStatus = 'none' | 'ok' | 'expiring' | 'overdue';

export type PlatformAdminListItem = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type CompanyActivityItem = {
  companyId: string;
  companyName: string;
  lastLoginAt: string | null;
  leadCount: number;
  activeUsers: number;
  createdAt: string;
};

export type MarketerActivityItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  // true — приглашение ещё не подтверждено (пароль не задан)
  invitePending: boolean;
  lastLoginAt: string | null;
  companiesCreated: number;
};

export type MarketerCompanyItem = {
  id: string;
  name: string;
  createdAt: string;
  isBlocked: boolean;
};

export type MarketerDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  telegram: string | null;
  vk: string | null;
  max: string | null;
  isActive: boolean;
  invitePending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  companies: MarketerCompanyItem[];
  grantedCompanies: MarketerCompanyItem[];
};

export type CompanyActivityResponse = {
  companies: CompanyActivityItem[];
  marketers?: MarketerActivityItem[];
};

export type PlatformCompanyListItem = {
  id?: string;
  name: string;
  isBlocked: boolean;
  createdAt: string;
  userCount: number;
  lastLoginAt: string | null;
  nextPaymentAt?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  ownedByMarketer?: boolean;
  manageable: boolean;
};

export type PlatformCompanyUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'HEAD' | 'MANAGER';
  isBlocked: boolean;
  lastLoginAt: string | null;
};

export type PlatformCompanyDetail = {
  id: string;
  name: string;
  isBlocked: boolean;
  createdAt: string;
  leadCount: number;
  lastLoginAt: string | null;
  nextPaymentAt: string | null;
  subscriptionStatus: SubscriptionStatus;
  users: PlatformCompanyUser[];
  pendingInviteEmail: string | null;
  manageable: boolean;
  ownedByMarketer: boolean;
  grants?: CompanyGrantItem[];
  availableMarketers?: AvailableMarketer[];
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  legalForm: CompanyLegalForm | null;
  directorName: string | null;
};

export type CompanyGrantItem = {
  marketerId: string;
  name: string;
  email: string;
};

export type AvailableMarketer = {
  id: string;
  name: string;
  email: string;
};

export type PlatformLogItem = {
  id: string;
  type: EventType;
  label: string;
  actorLabel: string;
  createdAt: string;
  leadId: string | null;
  leadLabel: string | null;
  payload: Prisma.JsonValue;
};

export type PlatformLogsResponse = {
  items: PlatformLogItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type PlatformLogLeadSearchResult = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
};
