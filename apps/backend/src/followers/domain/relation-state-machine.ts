import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

export enum RelationState {
  NONE = 'NONE',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  BLOCKED = 'BLOCKED',
}

export enum RelationAction {
  SEND_REQUEST = 'SEND_REQUEST',
  ACCEPT_REQUEST = 'ACCEPT_REQUEST',
  REJECT_REQUEST = 'REJECT_REQUEST',
  CANCEL_REQUEST = 'CANCEL_REQUEST',
  UNFOLLOW = 'UNFOLLOW',
  BLOCK = 'BLOCK',
  UNBLOCK = 'UNBLOCK',
}

export class RelationStateMachine {
  /**
   * Validates if a state transition is permitted.
   */
  static validateTransition(
    currentState: RelationState,
    action: RelationAction,
    isTargetBlocked: boolean,
  ): RelationState {
    if (isTargetBlocked && action !== RelationAction.UNBLOCK && action !== RelationAction.BLOCK) {
      throw new ForbiddenException('Action forbidden: relationship is in BLOCKED state');
    }

    switch (action) {
      case RelationAction.SEND_REQUEST:
        if (currentState === RelationState.ACCEPTED) {
          throw new ConflictException('Already following this user');
        }
        if (currentState === RelationState.PENDING) {
          throw new ConflictException('Follow request is already pending');
        }
        return RelationState.PENDING;

      case RelationAction.ACCEPT_REQUEST:
        if (currentState !== RelationState.PENDING) {
          throw new BadRequestException('Cannot accept request: no pending request found');
        }
        return RelationState.ACCEPTED;

      case RelationAction.REJECT_REQUEST:
      case RelationAction.CANCEL_REQUEST:
        if (currentState !== RelationState.PENDING) {
          throw new BadRequestException('Cannot reject/cancel: no pending request found');
        }
        return RelationState.NONE;

      case RelationAction.UNFOLLOW:
        if (currentState !== RelationState.ACCEPTED && currentState !== RelationState.PENDING) {
          throw new BadRequestException('Not following this user');
        }
        return RelationState.NONE;

      case RelationAction.BLOCK:
        return RelationState.BLOCKED;

      case RelationAction.UNBLOCK:
        if (currentState !== RelationState.BLOCKED) {
          throw new BadRequestException('User is not blocked');
        }
        return RelationState.NONE;

      default:
        throw new BadRequestException(`Unknown relation action: ${String(action)}`);
    }
  }

  /**
   * Deterministically orders two user IDs to prevent PostgreSQL deadlock during parallel mutations.
   */
  static getOrderedPair(userIdA: string, userIdB: string): [string, string] {
    if (userIdA === userIdB) {
      throw new BadRequestException('Cannot establish relation with self');
    }
    return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
  }
}
