import { HttpStatus } from '@nestjs/common';
import {
  BadRequestDomainException,
  ConflictDomainException,
  DomainException,
  EntityNotFoundException,
  ForbiddenDomainException,
  InternalDomainException,
  UnauthorizedDomainException,
  ValidationDomainException,
} from '../domain.exception';

describe('Domain Exceptions', () => {
  it('instantiates base DomainException with defaults', () => {
    const ex = new DomainException('Base domain error');
    expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(ex.errorCode).toBe('DOMAIN_ERROR');
    expect(ex.getResponse()).toEqual({
      message: 'Base domain error',
      errorCode: 'DOMAIN_ERROR',
    });
  });

  it('instantiates EntityNotFoundException with and without identifier', () => {
    const exWithId = new EntityNotFoundException('User', 'usr-123');
    expect(exWithId.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exWithId.errorCode).toBe('NOT_FOUND');
    expect(exWithId.message).toBe("User with id 'usr-123' was not found");

    const exWithoutId = new EntityNotFoundException('Post');
    expect(exWithoutId.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exWithoutId.message).toBe('Post was not found');
  });

  it('instantiates ConflictDomainException', () => {
    const ex = new ConflictDomainException('Resource conflict');
    expect(ex.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(ex.errorCode).toBe('CONFLICT');
  });

  it('instantiates ForbiddenDomainException', () => {
    const ex = new ForbiddenDomainException('Access denied');
    expect(ex.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(ex.errorCode).toBe('FORBIDDEN');
  });

  it('instantiates UnauthorizedDomainException', () => {
    const ex = new UnauthorizedDomainException('Invalid credentials');
    expect(ex.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(ex.errorCode).toBe('UNAUTHORIZED');
  });

  it('instantiates BadRequestDomainException', () => {
    const ex = new BadRequestDomainException('Invalid input parameter');
    expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(ex.errorCode).toBe('BAD_REQUEST');
  });

  it('instantiates ValidationDomainException', () => {
    const ex = new ValidationDomainException('Validation failed on email field');
    expect(ex.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(ex.errorCode).toBe('VALIDATION_ERROR');
  });

  it('instantiates InternalDomainException', () => {
    const ex = new InternalDomainException();
    expect(ex.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(ex.errorCode).toBe('INTERNAL_SERVER_ERROR');
    expect(ex.message).toBe('An internal domain error occurred');
  });
});
