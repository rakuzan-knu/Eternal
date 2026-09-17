import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  readonly errorCode: string;

  constructor(
    message: string,
    errorCode: string = 'DOMAIN_ERROR',
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ message, errorCode }, status);
    this.errorCode = errorCode;
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, identifier?: string | number) {
    const msg = identifier
      ? `${entityName} with id '${identifier}' was not found`
      : `${entityName} was not found`;
    super(msg, 'NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

export class ConflictDomainException extends DomainException {
  constructor(message: string, errorCode: string = 'CONFLICT') {
    super(message, errorCode, HttpStatus.CONFLICT);
  }
}

export class ForbiddenDomainException extends DomainException {
  constructor(message: string, errorCode: string = 'FORBIDDEN') {
    super(message, errorCode, HttpStatus.FORBIDDEN);
  }
}

export class UnauthorizedDomainException extends DomainException {
  constructor(message: string, errorCode: string = 'UNAUTHORIZED') {
    super(message, errorCode, HttpStatus.UNAUTHORIZED);
  }
}

export class BadRequestDomainException extends DomainException {
  constructor(message: string, errorCode: string = 'BAD_REQUEST') {
    super(message, errorCode, HttpStatus.BAD_REQUEST);
  }
}

export class ValidationDomainException extends DomainException {
  constructor(message: string, errorCode: string = 'VALIDATION_ERROR') {
    super(message, errorCode, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class InternalDomainException extends DomainException {
  constructor(
    message: string = 'An internal domain error occurred',
    errorCode: string = 'INTERNAL_SERVER_ERROR',
  ) {
    super(message, errorCode, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
