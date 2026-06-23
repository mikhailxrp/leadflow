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

export type PlatformCompanyListItem = {
  id: string;
  name: string;
  isBlocked: boolean;
  createdAt: string;
  userCount: number;
  lastLoginAt: string | null;
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
  users: PlatformCompanyUser[];
  pendingInviteEmail: string | null;
};
