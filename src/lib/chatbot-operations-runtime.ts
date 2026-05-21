function isDisabledFlag(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "off" || normalized === "disabled";
}

export function isChatbotOperationsUiEnabled() {
  return !isDisabledFlag(process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED);
}
