import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from './Input';

export interface PasswordStrengthInfo {
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
  feedback?: string[];
}

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightElement'> {
  showStrengthMeter?: boolean;
  strengthInfo?: PasswordStrengthInfo;
}

const strengthColors: Record<PasswordStrengthInfo['strength'], string> = {
  weak: 'bg-red-500',
  fair: 'bg-amber-500',
  good: 'bg-blue-500',
  strong: 'bg-emerald-500',
};

const strengthLabels: Record<PasswordStrengthInfo['strength'], string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

export function PasswordInput({
  showStrengthMeter = false,
  strengthInfo,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="flex flex-col gap-2 w-full">
      <Input
        {...props}
        type={showPassword ? 'text' : 'password'}
        rightElement={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors focus:outline-none"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      {showStrengthMeter && strengthInfo && (
        <div className="flex flex-col gap-1 px-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 font-medium">Password strength</span>
            <span
              className={
                strengthInfo.strength === 'strong'
                  ? 'text-emerald-400 font-semibold'
                  : strengthInfo.strength === 'good'
                    ? 'text-blue-400 font-semibold'
                    : strengthInfo.strength === 'fair'
                      ? 'text-amber-400 font-semibold'
                      : 'text-red-400 font-semibold'
              }
            >
              {strengthLabels[strengthInfo.strength]}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-neutral-800/80 rounded-full overflow-hidden p-0.5">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-full rounded-full transition-colors duration-200 ${
                  strengthInfo.score >= step
                    ? strengthColors[strengthInfo.strength]
                    : 'bg-neutral-800'
                }`}
              />
            ))}
          </div>

          {strengthInfo.feedback && strengthInfo.feedback.length > 0 && (
            <p className="text-[10px] text-neutral-500 leading-tight">
              Suggestion: {strengthInfo.feedback[0]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
