import type { PlatformRole, UserRole } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    kind: 'company' | 'platform';
    user?: DefaultSession['user'] & {
      id: string;
      companyId: string;
      role: UserRole;
      impersonatedByPlatformAdminId?: string;
      isDemo?: boolean;
    };
    admin?: {
      id: string;
      email: string;
      role: PlatformRole;
    };
  }

  interface User {
    kind?: 'company' | 'platform';
    companyId?: string;
    role?: UserRole;
    platformRole?: PlatformRole;
    impersonatedByPlatformAdminId?: string;
    isDemo?: boolean;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    kind?: 'company' | 'platform';
    userId?: string;
    adminId?: string;
    companyId?: string;
    role?: UserRole;
    platformRole?: PlatformRole;
    impersonatedByPlatformAdminId?: string;
    email?: string;
    isDemo?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    kind?: 'company' | 'platform';
    userId?: string;
    adminId?: string;
    companyId?: string;
    role?: UserRole;
    platformRole?: PlatformRole;
    impersonatedByPlatformAdminId?: string;
    email?: string;
    isDemo?: boolean;
  }
}
