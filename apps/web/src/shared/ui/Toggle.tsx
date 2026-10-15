interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export default function Toggle({ checked, onChange, disabled, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      onClick={onChange}
      disabled={disabled}
      className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors disabled:opacity-40 cursor-pointer ${
        checked ? 'bg-gray-950 dark:bg-white' : 'bg-black/20 dark:bg-white/20'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full transition-transform ${
          checked
            ? 'bg-white dark:bg-black translate-x-5'
            : 'bg-white dark:bg-gray-400 translate-x-0'
        }`}
      />
    </button>
  );
}
