import React from 'react';

interface GroupAvatarCollageProps {
  avatars: (string | null | undefined)[];
  size?: number;
  className?: string;
}

export default function GroupAvatarCollage({
  avatars,
  size = 56,
  className = '',
}: GroupAvatarCollageProps) {
  const items = avatars.slice(0, 4);
  const style = { width: size, height: size };

  if (items.length <= 1) {
    return (
      <div
        className={`rounded-full overflow-hidden bg-white/10 flex-shrink-0 ${className}`}
        style={style}
      >
        {items[0] && <img src={items[0]} alt="" className="w-full h-full object-cover" />}
      </div>
    );
  }

  if (items.length === 2) {
    return (
      <div className={`rounded-full overflow-hidden flex flex-shrink-0 ${className}`} style={style}>
        {items.map((src, i) => (
          <div key={i} className="w-1/2 h-full bg-white/10">
            {src && <img src={src} alt="" className="w-full h-full object-cover" />}
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 3) {
    return (
      <div
        className={`rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 flex-shrink-0 ${className}`}
        style={style}
      >
        <div className="row-span-2 bg-white/10">
          {items[0] && <img src={items[0]} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="bg-white/10">
          {items[1] && <img src={items[1]} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="bg-white/10">
          {items[2] && <img src={items[2]} alt="" className="w-full h-full object-cover" />}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 flex-shrink-0 ${className}`}
      style={style}
    >
      {items.map((src, i) => (
        <div key={i} className="bg-white/10">
          {src && <img src={src} alt="" className="w-full h-full object-cover" />}
        </div>
      ))}
    </div>
  );
}
