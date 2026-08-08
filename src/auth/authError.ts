type ErrorRecord = Record<string, unknown>;

export type SafeErrorDiagnostic = {
  category: string;
  message: string;
};

function isErrorRecord(value: unknown): value is ErrorRecord {
  return Boolean(value && typeof value === 'object');
}

function readString(record: ErrorRecord, key: string) {
  return typeof record[key] === 'string' ? record[key] : undefined;
}

export function redactAuthenticationDetails(
  value: string,
  sensitiveValues: readonly (string | undefined)[] = [],
) {
  let redacted = value;

  sensitiveValues.forEach((sensitiveValue) => {
    if (sensitiveValue) {
      redacted = redacted.replaceAll(sensitiveValue, '<redacted>');
    }
  });

  return redacted
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, '<redacted-key>')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '<redacted-token>')
    .replace(/Bearer\s+\S+/gi, 'Bearer <redacted-token>')
    .replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, '<supabase-url>');
}

export function getSafeErrorDiagnostic(
  error: unknown,
  fallbackMessage: string,
  sensitiveValues: readonly (string | undefined)[] = [],
): SafeErrorDiagnostic {
  if (error instanceof Error) {
    const record = error as Error & ErrorRecord;
    const category = readString(record, 'code') ?? error.name ?? 'Error';

    return {
      category: redactAuthenticationDetails(category, sensitiveValues),
      message: redactAuthenticationDetails(
        error.message || fallbackMessage,
        sensitiveValues,
      ),
    };
  }

  if (isErrorRecord(error)) {
    const category =
      readString(error, 'code') ??
      readString(error, 'name') ??
      (typeof error.status === 'number' ? `HTTP ${error.status}` : 'Unknown');
    const message =
      readString(error, 'message') ??
      readString(error, 'error_description') ??
      fallbackMessage;

    return {
      category: redactAuthenticationDetails(category, sensitiveValues),
      message: redactAuthenticationDetails(message, sensitiveValues),
    };
  }

  return { category: 'Unknown', message: fallbackMessage };
}

export function formatSafeError(
  error: unknown,
  fallbackMessage: string,
  options: {
    includeCategory?: boolean;
    sensitiveValues?: readonly (string | undefined)[];
  } = {},
) {
  const diagnostic = getSafeErrorDiagnostic(
    error,
    fallbackMessage,
    options.sensitiveValues,
  );

  return options.includeCategory
    ? `[${diagnostic.category}] ${diagnostic.message}`
    : diagnostic.message;
}
