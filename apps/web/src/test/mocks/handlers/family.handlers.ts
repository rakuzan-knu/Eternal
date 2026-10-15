import { http, HttpResponse } from 'msw';
import {
  FamilyMembersResponse,
  FamilyActivitySummary,
  PendingPairRequest,
  ChildSafeguards,
  FamilyCenterSettings,
} from '@/features/profile/model/familyCenterTypes';

let mockSettings: FamilyCenterSettings = {
  weeklyDigest: true,
  newFriendAlerts: true,
  reportAlerts: true,
  notifyLinkRequests: true,
  pinEnabled: false,
  pinCode: '',
};

let mockSafeguards: Record<string, ChildSafeguards> = {
  'child-1': {
    childId: 'child-1',
    dailyLimitMinutes: 120,
    curfewStart: '22:00',
    curfewEnd: '07:00',
    timezone: 'Europe/Kyiv',
    restrictedDirectMessages: true,
    monthlyBudget: 100,
    spentThisMonth: 0,
    requirePurchaseApproval: true,
    profileSettingsLocked: true,
    updatedByParentId: 'parent-1',
    updatedAt: new Date().toISOString(),
  },
};

let mockMembers: FamilyMembersResponse = {
  role: 'parent',
  connectedChildren: [
    {
      id: 'child-1',
      linkId: 'link-1',
      username: 'leo_gamer',
      displayName: 'Leonid',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      birthDate: '2011-05-14',
      age: 15,
      status: 'online',
      connectedAt: '2026-08-10T12:00:00Z',
      safeguards: mockSafeguards['child-1'],
    },
  ],
  connectedParents: [],
  maxChildren: 8,
  maxParents: 2,
};

let mockPendingInvite: PendingPairRequest | null = null;

export const resetFamilyMockState = () => {
  mockSafeguards = {
    'child-1': {
      childId: 'child-1',
      dailyLimitMinutes: 120,
      curfewStart: '22:00',
      curfewEnd: '07:00',
      timezone: 'Europe/Kyiv',
      restrictedDirectMessages: true,
      monthlyBudget: 100,
      spentThisMonth: 0,
      requirePurchaseApproval: true,
      profileSettingsLocked: true,
      updatedByParentId: 'parent-1',
      updatedAt: new Date().toISOString(),
    },
  };
  mockSettings = {
    weeklyDigest: true,
    newFriendAlerts: true,
    reportAlerts: true,
    notifyLinkRequests: true,
    pinEnabled: false,
    pinCode: '',
  };
  mockMembers = {
    role: 'parent',
    connectedChildren: [
      {
        id: 'child-1',
        linkId: 'link-1',
        username: 'leo_gamer',
        displayName: 'Leonid',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
        birthDate: '2011-05-14',
        age: 15,
        status: 'online',
        connectedAt: '2026-08-10T12:00:00Z',
        safeguards: mockSafeguards['child-1'],
      },
    ],
    connectedParents: [],
    maxChildren: 8,
    maxParents: 2,
  };
  mockPendingInvite = null;
};

export const familyHandlers = [
  http.get('*/family/settings', () => {
    return HttpResponse.json(mockSettings);
  }),

  http.put('*/family/settings', async ({ request }) => {
    const body = (await request.json()) as Partial<FamilyCenterSettings>;
    mockSettings = { ...mockSettings, ...body };
    return HttpResponse.json(mockSettings);
  }),

  http.get('*/family/members', () => {
    return HttpResponse.json(mockMembers);
  }),

  http.post('*/family/invite/qr', () => {
    return HttpResponse.json({
      token: 'mock_qr_tok_12345',
      code: 'FC-8821',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });
  }),

  http.post('*/family/pair', async ({ request }) => {
    const body = (await request.json()) as { code: string };
    if (!body?.code || body.code.trim().length < 4) {
      return HttpResponse.json({ message: 'Invalid or expired pairing code.' }, { status: 400 });
    }
    const newChildId = `child-${Date.now()}`;
    const newChild = {
      id: newChildId,
      linkId: `link-${Date.now()}`,
      username: 'teen_sparkle',
      displayName: 'Sophia',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      birthDate: '2012-08-20',
      age: 14,
      status: 'online' as const,
      connectedAt: new Date().toISOString(),
    };
    mockMembers.connectedChildren.push(newChild);
    return HttpResponse.json({
      linkId: newChild.linkId,
      status: 'PENDING_CONFIRMATION',
      child: newChild,
    });
  }),

  http.post('*/family/confirm', async ({ request }) => {
    const body = (await request.json()) as { linkId: string; approved: boolean };
    mockPendingInvite = null;
    return HttpResponse.json({
      success: body.approved,
      status: body.approved ? 'ACTIVE' : 'REVOKED',
    });
  }),

  http.get('*/family/pending-invite', () => {
    return HttpResponse.json(mockPendingInvite);
  }),

  http.delete('*/family/members/:id', ({ params }) => {
    const linkId = params.id as string;
    mockMembers.connectedChildren = mockMembers.connectedChildren.filter(
      (c) => c.linkId !== linkId,
    );
    mockMembers.connectedParents = mockMembers.connectedParents.filter((p) => p.linkId !== linkId);
    return HttpResponse.json({
      success: true,
      message: 'Family Center link has been disconnected.',
    });
  }),

  http.get('*/family/my-activity', () => {
    const summary: FamilyActivitySummary = {
      childId: 'current-user',
      periodDays: 7,
      newFriendsCount: 0,
      messagingUsersCount: 0,
      voiceVideoMinutes: 0,
      purchaseAmount: 0,
      giftsReceivedCount: 0,
      reportsSharedCount: 0,
      lastUpdated: new Date().toISOString(),
    };
    return HttpResponse.json(summary);
  }),

  http.get('*/family/children/:id/activity-summary', ({ params }) => {
    const childId = params.id as string;
    const summary: FamilyActivitySummary = {
      childId,
      periodDays: 7,
      newFriendsCount: 0,
      messagingUsersCount: 0,
      voiceVideoMinutes: 0,
      purchaseAmount: 0,
      giftsReceivedCount: 0,
      reportsSharedCount: 0,
      lastUpdated: new Date().toISOString(),
    };
    return HttpResponse.json(summary);
  }),

  http.get('*/family/children/:id/safeguards', ({ params }) => {
    const childId = params.id as string;
    const safeguards = mockSafeguards[childId] || {
      childId,
      dailyLimitMinutes: 120,
      curfewStart: '22:00',
      curfewEnd: '07:00',
      timezone: 'UTC',
      restrictedDirectMessages: true,
      monthlyBudget: 100,
      spentThisMonth: 0,
      requirePurchaseApproval: true,
      profileSettingsLocked: true,
      updatedByParentId: 'parent-1',
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(safeguards);
  }),

  http.put('*/family/children/:id/safeguards', async ({ params, request }) => {
    const childId = params.id as string;
    const body = (await request.json()) as Partial<ChildSafeguards>;
    const current = mockSafeguards[childId] || {
      childId,
      dailyLimitMinutes: 120,
      curfewStart: '22:00',
      curfewEnd: '07:00',
      timezone: 'UTC',
      restrictedDirectMessages: true,
      monthlyBudget: 2000,
      spentThisMonth: 0,
      requirePurchaseApproval: true,
      profileSettingsLocked: true,
      updatedByParentId: 'parent-1',
      updatedAt: new Date().toISOString(),
    };
    const updated: ChildSafeguards = {
      ...current,
      ...body,
      childId,
      updatedAt: new Date().toISOString(),
    };
    mockSafeguards[childId] = updated;
    return HttpResponse.json(updated);
  }),
];
