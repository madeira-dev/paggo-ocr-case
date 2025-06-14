import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // isAuthenticated() is a method added by Passport to the request object
    // once a session is established and the user is deserialized.
    if (request.isAuthenticated && request.isAuthenticated()) {
      return true;
    }
    throw new UnauthorizedException('User is not authenticated');
  }
}