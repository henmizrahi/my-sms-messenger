const FIELD_LABELS: Record<string, string> = { to: 'Phone number', body: 'Message' };

// Turns the API's validation errors, such as { to: ['is invalid'] }, into one readable sentence per error.
export function describeValidationErrors(errors: Record<string, string[]>): string {
  const sentences = Object.entries(errors).flatMap(([field, problems]) =>
    problems.map((problem) => `${FIELD_LABELS[field] ?? field} ${problem}.`),
  );

  return sentences.join(' ') || 'The message could not be saved.';
}
