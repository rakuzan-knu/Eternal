import * as React from 'react';
import { clsx } from 'clsx';

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  scrollable?: boolean;
}

export function Form({ scrollable = true, className, children, ...props }: FormProps) {
  return (
    <form
      className={clsx(
        'w-full flex flex-col gap-4 text-left',
        scrollable && 'overflow-y-auto overscroll-contain pb-safe',
        className,
      )}
      {...props}
    >
      {children}
    </form>
  );
}
