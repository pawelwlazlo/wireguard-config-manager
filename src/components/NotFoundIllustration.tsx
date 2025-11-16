import { Button } from "@/components/ui/button";

/**
 * NotFoundIllustration - Component displaying 404 error page
 * Shows an illustration, message, and navigation button
 */
export function NotFoundIllustration() {
  const handleGoHome = () => {
    // Check if there's a referrer and it's from the same origin
    if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md space-y-6">
        {/* 404 Illustration */}
        <div className="mx-auto mb-8 flex items-center justify-center">
          <svg
            className="h-48 w-48 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 15C8.91212 16.2144 10.3643 17 12 17C13.6357 17 15.0879 16.2144 16 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 9H9.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 9H15.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          404
        </h1>

        {/* Description */}
        <p className="text-lg text-muted-foreground">
          Strona nie znaleziona
        </p>
        <p className="text-sm text-muted-foreground">
          Przepraszamy, ale strona, której szukasz, nie istnieje lub została przeniesiona.
        </p>

        {/* Action Button */}
        <div className="pt-4">
          <Button
            onClick={handleGoHome}
            variant="default"
            size="lg"
            className="w-full sm:w-auto"
          >
            Powrót do strony głównej
          </Button>
        </div>
      </div>
    </div>
  );
}

