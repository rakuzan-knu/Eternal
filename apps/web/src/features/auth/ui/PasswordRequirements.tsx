import { CheckCircle2, XCircle } from 'lucide-react';

type RequirementStatus = 'empty' | 'partial' | 'complete' | 'error';

const statusLabels: Record<RequirementStatus, string> = {
  empty: 'Not met',
  partial: 'Partially met',
  complete: 'Met',
  error: 'Invalid',
};

function Requirement({ label, status }: { label: string; status: RequirementStatus }) {
  return (
    <li
      className="flex items-center gap-2 text-xs"
      aria-label={`${label}: ${statusLabels[status]}`}
    >
      {status === 'complete' ? (
        <CheckCircle2 size={13} className="text-emerald-500" aria-hidden="true" />
      ) : status === 'error' ? (
        <XCircle size={13} className="text-red-500" aria-hidden="true" />
      ) : status === 'partial' ? (
        <span
          className="flex size-[13px] items-center justify-center rounded-full border border-yellow-500"
          aria-hidden="true"
        >
          <span className="size-[5px] rounded-full bg-yellow-500" />
        </span>
      ) : (
        <span className="size-[13px] rounded-full border border-neutral-600" aria-hidden="true" />
      )}
      <span
        className={
          status === 'complete'
            ? 'text-emerald-500'
            : status === 'error'
              ? 'text-red-500'
              : status === 'partial'
                ? 'text-yellow-500'
                : 'text-neutral-500'
        }
      >
        {label}
      </span>
    </li>
  );
}

export function PasswordRequirements({ password }: { password: string }) {
  const hasNonLatinLetter = Array.from(password).some(
    (character) => /\p{L}/u.test(character) && !/[a-zA-Z]/.test(character),
  );
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const casesStatus: RequirementStatus = !password
    ? 'empty'
    : hasNonLatinLetter
      ? 'error'
      : hasLowercase && hasUppercase
        ? 'complete'
        : hasLowercase || hasUppercase
          ? 'partial'
          : 'empty';
  // Match mobile: a digit or a special symbol completes this recommendation.
  const hasDigitOrSymbol =
    /[0-9]/.test(password) ||
    /[^\p{L}\s0-9]/u.test(password) ||
    /[^a-zA-Zа-яА-ЯёЁ0-9\s]/.test(password);

  return (
    <ul
      id="register-password-requirements"
      aria-label="Password recommendations"
      className="flex flex-col gap-1.5"
    >
      <Requirement
        label="8+ characters"
        status={!password ? 'empty' : password.length >= 8 ? 'complete' : 'partial'}
      />
      <Requirement label="Latin letters (A-Z, a-z)" status={casesStatus} />
      <Requirement label="Number or symbol" status={hasDigitOrSymbol ? 'complete' : 'empty'} />
    </ul>
  );
}
