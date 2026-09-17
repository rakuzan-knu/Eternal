import type { PrivacyDimension, Visibility } from '../../model/privacyTypes';

export function strangerLabel(dimension: PrivacyDimension, value: Visibility): string {
  const shownFor =
    value === 'EVERYBODY' ? 'all' : value === 'CONTACTS' ? 'your subscribers' : 'nobody';
  switch (dimension) {
    case 'LAST_SEEN':
      return value === 'EVERYBODY'
        ? 'All see your exact last activity time.'
        : value === 'CONTACTS'
          ? 'Your subscribers see the exact time, others see only «recently».'
          : 'Others see only «recently».';
    case 'FORWARD_LINK':
      return value === 'NOBODY'
        ? 'Forwarded messages show «Anonymous», without a link to the profile.'
        : `Forwarded messages link to your profile for ${shownFor}.`;
    case 'CALLS':
      return `You can be called by: ${shownFor}.`;
    case 'VOICE_MESSAGES':
      return `Send voice messages: ${shownFor}.`;
    case 'MESSAGES':
      return `Send direct messages: ${shownFor}.`;
    case 'BIRTHDAY':
      return `Birthday visibility: ${shownFor}.`;
    case 'GROUP_INVITES':
      return `Add you to groups: ${shownFor}.`;
    case 'AVATAR':
      return `Profile picture visible to: ${shownFor}.`;
    case 'BANNER':
      return `Profile banner visible to: ${shownFor}.`;
    case 'BIO':
      return `Profile bio visible to: ${shownFor}.`;
    default:
      return '';
  }
}
