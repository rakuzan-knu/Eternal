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
      className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors disabled:opacity-40 ${
        checked ? 'bg-white' : 'bg-[#333]'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full transition-transform ${
          checked ? 'bg-black translate-x-5' : 'bg-gray-400 translate-x-0'
        }`}
      />
    </button>
  );
}
