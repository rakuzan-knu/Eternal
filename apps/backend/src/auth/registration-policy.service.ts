import { ForbiddenException, Injectable } from '@nestjs/common';
import { getRegistrationPolicy, type RegistrationPolicy } from '@common/contracts';

@Injectable()
export class RegistrationPolicyService {
  getPolicy(): RegistrationPolicy {
    return getRegistrationPolicy();
  }

  assertRegistrationOpen(): void {
    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      errorCode: 'REGISTRATION_UNAVAILABLE',
      message:
        'New registrations are temporarily unavailable while regional admission requirements are reviewed. Existing accounts can still sign in and use privacy controls. Contact eternalnet.support@proton.me for support.',
    });
  }
}
