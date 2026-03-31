import { SystemRole } from '@prisma/client';

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  systemRole: SystemRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
