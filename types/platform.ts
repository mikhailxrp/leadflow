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
  isActive: boolean;
  lastLoginAt: string | null;
  companiesCreated: number;
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
