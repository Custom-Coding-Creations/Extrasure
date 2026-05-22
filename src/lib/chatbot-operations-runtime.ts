function isEnabledFlag(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "enabled";
}

const CHATBOT_OPERATION_UI_ALLOWED_ROLES = new Set(["owner", "dispatch", "accountant", "admin"]);

export function isChatbotOperationsUiEnabled() {
  return isEnabledFlag(process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED);
}

export function canRenderChatbotOperationsUiForRole(role: string | null | undefined) {
  if (!role) {
    return false;
  }

  return CHATBOT_OPERATION_UI_ALLOWED_ROLES.has(role.trim().toLowerCase());
}
