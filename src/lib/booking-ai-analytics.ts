export function buildBookingAiEventPayload(step: number, stepLabel: string) {
  return {
    step: step + 1,
    stepLabel,
  };
}
