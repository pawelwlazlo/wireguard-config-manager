/**
 * Password strength checklist component
 * Displays visual indicators for password requirements
 */

interface PasswordChecklistProps {
  password: string;
}

interface CriterionItemProps {
  met: boolean;
  label: string;
}

function CriterionItem({ met, label }: CriterionItemProps) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
          met
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
        }`}
        aria-hidden="true"
      >
        {met ? (
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </span>
      <span className={met ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </li>
  );
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  const criteria = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const allMet = Object.values(criteria).every((criterion) => criterion);

  return (
    <div
      className="rounded-lg border bg-muted/50 p-4"
      role="status"
      aria-live="polite"
      aria-label="Wymagania dotyczące hasła"
    >
      <p className="mb-3 text-sm font-medium">Hasło musi zawierać:</p>
      <ul className="space-y-2" aria-label="Lista kryteriów hasła">
        <CriterionItem
          met={criteria.length}
          label="Co najmniej 8 znaków"
        />
        <CriterionItem
          met={criteria.upper}
          label="Co najmniej jedną wielką literę (A-Z)"
        />
        <CriterionItem
          met={criteria.lower}
          label="Co najmniej jedną małą literę (a-z)"
        />
        <CriterionItem met={criteria.number} label="Co najmniej jedną cyfrę (0-9)" />
        <CriterionItem
          met={criteria.special}
          label="Co najmniej jeden znak specjalny (!@#$%...)"
        />
      </ul>
      {allMet && (
        <p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400">
          ✓ Wszystkie wymagania spełnione
        </p>
      )}
    </div>
  );
}

