export interface BasePrimitiveProps {
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export interface DialogProps extends BasePrimitiveProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export interface AvatarProps extends BasePrimitiveProps {
  src?: string | null;
  alt: string;
  fallbackText: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface SwitchProps extends BasePrimitiveProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export interface DropdownItem {
  id: string;
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Derives initial fallback characters from a display name or username
 */
export function getAvatarFallback(name: string): string {
  const clean = name.trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
