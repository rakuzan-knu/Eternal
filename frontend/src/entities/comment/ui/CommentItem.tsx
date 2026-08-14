import React from 'react';
import Avatar from '../../../shared/ui/Avatar';
import { CommentType } from '../../../shared/model/useUIStore';
import { Link } from 'react-router-dom';
import { FormattedText } from '@/shared/ui/FormattedText';
import { UserNameWithBadges } from '@/entities/profile/ui/UserNameWithBadges';
import { MiniProfileHoverCard } from '@/entities/profile/ui/MiniProfileHoverCard';

export function CommentItem({ comment }: { comment: CommentType }) {
  return (
    <div className="flex gap-3 items-start py-3 border-b border-white/[0.03] animate-fadeIn">
      <MiniProfileHoverCard username={comment.handle}>
        <Link to={`/profile/${comment.handle}`}>
          <Avatar size="sm" src={comment.avatar} />
        </Link>
      </MiniProfileHoverCard>
      <div className="flex flex-col flex-1 bg-white/[0.02] p-3 rounded-2xl border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <MiniProfileHoverCard username={comment.handle}>
            <Link to={`/profile/${comment.handle}`} className="hover:underline inline-block">
              <UserNameWithBadges
                displayName={comment.author}
                username={comment.handle}
                isVerified={comment.isVerified}
                primaryBadge={comment.primaryBadge}
                size="sm"
              />
            </Link>
          </MiniProfileHoverCard>
          <span className="text-[10px] text-gray-500">
            @{comment.handle} • {comment.time}
          </span>
        </div>
        <div className="text-gray-300 text-sm mt-1">
          <FormattedText text={comment.text} />
        </div>
      </div>
    </div>
  );
}
