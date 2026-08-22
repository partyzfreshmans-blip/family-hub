import React from 'react';

interface MemberAvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  avatarUrl?: string | null;
  className?: string;
}

export function MemberAvatar({
  name,
  color = '#0284c7',
  size = 'md',
  avatarUrl,
  className = '',
}: MemberAvatarProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-bold',
    xl: 'w-16 h-16 text-xl font-bold',
  }[size];

  const firstChar = name ? name.trim().charAt(0).toUpperCase() : '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover border-2 border-white dark:border-zinc-800 shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: color }}
      className={`${sizeClasses} rounded-full flex items-center justify-center text-white shadow-sm font-sans flex-shrink-0 ${className}`}
    >
      {firstChar}
    </div>
  );
}
