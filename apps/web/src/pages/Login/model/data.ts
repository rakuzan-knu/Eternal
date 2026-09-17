export interface MockNotification {
  id: number;
  initials: string;
  name: string;
  action: string;
  time: string;
  color: string;
}

export const MOCK_NOTIFS: MockNotification[] = [
  {
    id: 1,
    initials: 'AK',
    name: 'Alex K.',
    action: 'liked your post',
    time: 'Just now',
    color: 'bg-purple-900/40 text-purple-300',
  },
  {
    id: 2,
    initials: 'SM',
    name: 'Sara M.',
    action: 'followed you',
    time: '2m ago',
    color: 'bg-blue-900/40 text-blue-300',
  },
  {
    id: 3,
    initials: '1.2k',
    name: 'Post reached',
    action: '1,200+',
    time: '5m ago',
    color: 'bg-indigo-900/50 text-indigo-300 font-bold',
  },
];
