import type { PlatformRole, UserRole } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

export type CompanySession = {
  kind: 'company';
  user: NonNullable<DefaultSession['user']> & {
    id: string;
    companyId: string;
    role: UserRole;
    impersonatedByPlatformAdminId?: string;
    isDemo?: boolean;
  };
};

export type PlatformSession = {
  kind: 'platform';
  admin: {
    id: string;
    email: string;
    role: PlatformRole;
  };
  user?: never;
};

export type AppSession = CompanySession | PlatformSession;
