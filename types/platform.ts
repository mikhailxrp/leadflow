export type PlatformCompanyListItem = {
  id: string;
  name: string;
  isBlocked: boolean;
  createdAt: string;
  userCount: number;
  lastLoginAt: string | null;
};
