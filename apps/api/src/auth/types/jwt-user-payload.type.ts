import { SystemRole } from '@prisma/client';

export type JwtUserPayload = {
  sub: string;
  email: string;
  role: SystemRole;
};
