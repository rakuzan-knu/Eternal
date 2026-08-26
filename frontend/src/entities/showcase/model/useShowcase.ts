import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showcaseApi } from '../api/showcaseApi';
import { useChatSocket } from '@/features/chat/model/useChatSocket';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import type {
  ProfileShowcaseDto,
  UpdateShowcaseDto,
  ShowcaseMediaType,
} from '@backend/common/contracts';

export const SHOWCASE_QUERY_KEY = 'showcase';
export const MEDIA_SEARCH_QUERY_KEY = 'media-search';
export const TRACK_SEARCH_QUERY_KEY = 'track-search';

export function useShowcase(username?: string) {
  return useQuery({
    queryKey: [SHOWCASE_QUERY_KEY, username],
    queryFn: () => showcaseApi.getShowcase(username || ''),
    enabled: Boolean(username),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useUpdateShowcase() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: (dto: UpdateShowcaseDto) => showcaseApi.updateShowcase(dto),
    onMutate: async (newDto: UpdateShowcaseDto) => {
      const myUsername = currentUser?.username;
      if (!myUsername) return;

      const queryKey = [SHOWCASE_QUERY_KEY, myUsername];
      await queryClient.cancelQueries({ queryKey });

      const previousShowcase = queryClient.getQueryData<ProfileShowcaseDto>(queryKey);

      if (previousShowcase) {
        queryClient.setQueryData<ProfileShowcaseDto>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            ...(newDto.accentColor && { accentColor: newDto.accentColor }),
            ...(newDto.privacyMeta && { privacyMeta: newDto.privacyMeta }),
            ...(newDto.privacyActivity && { privacyActivity: newDto.privacyActivity }),
            ...(newDto.privacyShowcase && { privacyShowcase: newDto.privacyShowcase }),
            ...(newDto.privacyLinks && { privacyLinks: newDto.privacyLinks }),
            ...(newDto.showAge !== undefined && { showAge: newDto.showAge }),
            ...(newDto.showBirthdate !== undefined && { showBirthdate: newDto.showBirthdate }),
            ...(newDto.showGender !== undefined && { showGender: newDto.showGender }),
            ...(newDto.showTimezone !== undefined && { showTimezone: newDto.showTimezone }),
            ...(newDto.pronouns !== undefined && { pronouns: newDto.pronouns }),
            ...(newDto.timezone !== undefined && { timezone: newDto.timezone }),
            ...(newDto.connectedAccounts !== undefined && {
              connectedAccounts: newDto.connectedAccounts
                ? { ...old.connectedAccounts, ...newDto.connectedAccounts }
                : null,
            }),
            ...(newDto.activityStatus !== undefined && {
              activityStatus: newDto.activityStatus,
            }),
            ...(newDto.spotlightMedia !== undefined && {
              spotlightMedia: newDto.spotlightMedia,
            }),
            ...(newDto.anthemTrack !== undefined && {
              anthemTrack: newDto.anthemTrack,
            }),
            ...(newDto.mediaItems !== undefined && {
              mediaItems: newDto.mediaItems.map((item, idx) => ({
                id: item.id || `temp-${idx}`,
                type: item.type,
                isWishlist: item.isWishlist ?? false,
                title: item.title,
                posterUrl: item.posterUrl,
                externalId: item.externalId,
                externalUrl: item.externalUrl,
                rating: item.rating,
                userComment: item.userComment,
                tags: item.tags || [],
                releaseYear: item.releaseYear,
                position: item.position ?? idx,
              })),
            }),
          };
        });
      }

      return { previousShowcase, queryKey };
    },
    onError: (_err, _newDto, context) => {
      if (context?.queryKey && context?.previousShowcase) {
        queryClient.setQueryData(context.queryKey, context.previousShowcase);
      }
    },
    onSettled: () => {
      const myUsername = currentUser?.username;
      if (myUsername) {
        void queryClient.invalidateQueries({ queryKey: [SHOWCASE_QUERY_KEY, myUsername] });
      }
    },
  });
}

export function useMediaSearch(query: string, type: ShowcaseMediaType) {
  return useQuery({
    queryKey: [MEDIA_SEARCH_QUERY_KEY, type, query],
    queryFn: () => showcaseApi.searchMedia(query, type),
    staleTime: 1000 * 60 * 30, // 30 minutes
    placeholderData: (previousData) => previousData,
  });
}

export function useTrackSearch(query: string) {
  return useQuery({
    queryKey: [TRACK_SEARCH_QUERY_KEY, query],
    queryFn: () => showcaseApi.searchTracks(query),
    staleTime: 1000 * 60 * 30, // 30 minutes
    placeholderData: (previousData) => previousData,
  });
}

export function useShowcasePresenceSync(targetUserId?: string, targetUsername?: string) {
  const socket = useChatSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !targetUserId || !targetUsername) return;

    socket.emit('subscribeShowcase', { targetUserId });

    const handlePresenceUpdate = (payload: { userId: string; activityStatus: unknown }) => {
      if (payload.userId === targetUserId) {
        queryClient.setQueryData<ProfileShowcaseDto>(
          [SHOWCASE_QUERY_KEY, targetUsername],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              activityStatus: payload.activityStatus as any,
            };
          },
        );
      }
    };

    socket.on('showcase:presence:update', handlePresenceUpdate);

    return () => {
      socket.emit('unsubscribeShowcase', { targetUserId });
      socket.off('showcase:presence:update', handlePresenceUpdate);
    };
  }, [socket, targetUserId, targetUsername, queryClient]);
}
