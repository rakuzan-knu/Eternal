import {
  Injectable,
  NotFoundException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getServiceRole, SERVICE_ROLE_METADATA, type ServiceRole } from './service-role';

@Injectable()
export class ServiceRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const owner =
      this.reflector.get<ServiceRole>(SERVICE_ROLE_METADATA, context.getClass()) ?? 'core';
    const serviceRole = getServiceRole();
    if (serviceRole === 'all' || owner === 'all' || owner === serviceRole) return true;
    throw new NotFoundException();
  }
}
