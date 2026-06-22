import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { UserRole } from '@prisma/client';

type CompanyAuthUser = {
  kind: 'company';
  id: string;
  companyId: string;
  role: UserRole;
  impersonatedByPlatformAdminId?: string;
};

type PlatformAuthUser = {
  kind: 'platform';
  id: string;
  email: string;
};

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'company-credentials',
      name: 'Company',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async () => null,
    }),
    Credentials({
      id: 'platform-credentials',
      name: 'Platform',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async () => null,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (!user) {
        return token;
      }

      const authUser = user as CompanyAuthUser | PlatformAuthUser;
      token.kind = authUser.kind;

      if (authUser.kind === 'company') {
        token.userId = authUser.id;
        token.companyId = authUser.companyId;
        token.role = authUser.role;
        if (authUser.impersonatedByPlatformAdminId) {
          token.impersonatedByPlatformAdminId =
            authUser.impersonatedByPlatformAdminId;
        }
      } else {
        token.adminId = authUser.id;
        token.email = authUser.email;
      }

      return token;
    },
    session({ session, token }) {
      const {
        kind,
        userId,
        adminId,
        companyId,
        role,
        email,
        impersonatedByPlatformAdminId,
      } = token;

      if (kind === 'company' && userId && companyId && role) {
        session.kind = 'company';
        session.user = {
          ...session.user,
          id: userId,
          companyId,
          role,
          ...(impersonatedByPlatformAdminId
            ? { impersonatedByPlatformAdminId }
            : {}),
        };
      } else if (kind === 'platform' && adminId && email) {
        session.kind = 'platform';
        session.admin = {
          id: adminId,
          email,
        };
      }

      return session;
    },
  },
});
