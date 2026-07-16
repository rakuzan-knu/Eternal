import React from 'react';
import Avatar from '../../../shared/ui/Avatar';
import { CommentType } from '../../../shared/model/useUIStore';
import { Link } from 'react-router-dom';

export function CommentItem({ comment }: { comment: CommentType }) {
  return (
    <div className="flex gap-3 items-start py-3 border-b border-white/[0.03] animate-fadeIn">
      <Link to={`/profile/${comment.handle}`}>
        <Avatar size="sm" src={comment.avatar} />
      </Link>
      <div className="flex flex-col flex-1 bg-white/[0.02] p-3 rounded-2xl border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Link to={`/profile/${comment.handle}`} className="font-semibold text-white text-xs">
            {comment.author}
          </Link>
          <span className="text-[10px] text-gray-500">
            @{comment.handle} • {comment.time}
          </span>
        </div>
        <p className="text-gray-300 text-sm mt-1 whitespace-pre-line">{comment.text}</p>
      </div>
    </div>
  );
}
