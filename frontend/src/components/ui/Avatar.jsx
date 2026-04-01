import React from 'react';

const COLORS = [
  'bg-cyan-500','bg-violet-500','bg-emerald-500','bg-amber-500',
  'bg-rose-500','bg-sky-500','bg-fuchsia-500','bg-teal-500',
];

function colorFor(str = '') {
  let n = 0;
  for (const c of str) n += c.charCodeAt(0);
  return COLORS[n % COLORS.length];
}

export default function Avatar({ user, size = 'md', showOnline = false }) {
  const sizes = { xs:'w-6 h-6 text-xs', sm:'w-8 h-8 text-xs', md:'w-9 h-9 text-sm', lg:'w-11 h-11 text-base', xl:'w-14 h-14 text-lg' };
  const dotSizes = { xs:'w-1.5 h-1.5', sm:'w-2 h-2', md:'w-2.5 h-2.5', lg:'w-3 h-3', xl:'w-3.5 h-3.5' };
  const initial = (user?.username || '?')[0].toUpperCase();
  const color   = colorFor(user?.username);

  return (
    <div className="relative inline-flex flex-shrink-0">
      {user?.avatar_url ? (
        <img src={user.avatar_url} alt={user.username}
          className={`${sizes[size]} rounded-full object-cover ring-1 ring-border`} />
      ) : (
        <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-display font-700 text-white ring-1 ring-border`}>
          {initial}
        </div>
      )}
      {showOnline && (
        <span className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-panel
          ${user?.is_online ? 'bg-emerald-400' : 'bg-muted'}`} />
      )}
    </div>
  );
}
