import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRegistrationPolicy, type RegistrationPolicy } from '@common/contracts';

@Injectable()
export class RegistrationPolicyService {
  constructor(@Optional() private readonly config?: ConfigService) {}

  getPolicy(): RegistrationPolicy {
    return getRegistrationPolicy(
      this.config?.get<string>('UA_PUBLIC_REGISTRATION_ENABLED') === 'true',
    );
  }

  assertRegistrationOpen(): void {
    if (this.getPolicy().registrationOpen) return;
    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      errorCode: 'REGISTRATION_UNAVAILABLE',
      message:
        'New registrations are temporarily unavailable while regional admission requirements are reviewed. Existing accounts can still sign in and use privacy controls. Contact eternalnet.support@proton.me for support.',
    });
  }
}
