import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: keyof { userId: string; sessionId: string; user: any } | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return only that
    if (data) {
      return user?.[data];
    }

    // Otherwise return the whole user object
    return user;
  },
);
