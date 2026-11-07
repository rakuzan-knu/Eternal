import { Injectable, type CanActivate } from '@nestjs/common';
import { RegistrationPolicyService } from '../registration-policy.service';

@Injectable()
export class RegistrationOpenGuard implements CanActivate {
  constructor(private readonly registrationPolicy: RegistrationPolicyService) {}

  canActivate(): boolean {
    this.registrationPolicy.assertRegistrationOpen();
    return true;
  }
}
