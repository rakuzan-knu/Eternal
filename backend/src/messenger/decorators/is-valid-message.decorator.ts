import {
  registerDecorator,
  type ValidationOptions,
  type ValidationArguments,
} from 'class-validator';
import { type SendMessageDto } from '../dto/message.dto';

export function IsValidMessage(validationOptions?: ValidationOptions) {
  return function (target: new (...args: any[]) => any) {
    registerDecorator({
      name: 'isValidMessage',
      target: target,
      propertyName: 'text',
      options: validationOptions,
      validator: {
        validate(args: ValidationArguments) {
          const dto = args.object as SendMessageDto;

          const hasText = typeof dto.text === 'string' && dto.text.trim().length > 0;
          const hasAttachments = Array.isArray(dto.attachments) && dto.attachments.length > 0;

          return hasText || hasAttachments;
        },
        defaultMessage() {
          return 'Cannot send an empty message. Provide either text or at least one attachment.';
        },
      },
    });
  };
}
