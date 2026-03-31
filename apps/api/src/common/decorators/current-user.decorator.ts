import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { JwtUserPayload } from '../../auth/types/jwt-user-payload.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtUserPayload }>();
    return request.user;
  },
);
