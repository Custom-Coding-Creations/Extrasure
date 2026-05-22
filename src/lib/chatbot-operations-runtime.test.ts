import { isChatbotOperationsUiEnabled } from "@/lib/chatbot-operations-runtime";

describe("chatbot-operations-runtime", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED;
  });

  it("keeps operations UI disabled by default", () => {
    delete process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED;
    expect(isChatbotOperationsUiEnabled()).toBe(false);
  });

  it("keeps operations UI disabled for off-like values", () => {
    process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED = "off";
    expect(isChatbotOperationsUiEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED = "false";
    expect(isChatbotOperationsUiEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED = "0";
    expect(isChatbotOperationsUiEnabled()).toBe(false);
  });

  it("keeps operations UI enabled for explicit true values", () => {
    process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED = "true";
    expect(isChatbotOperationsUiEnabled()).toBe(true);

    process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED = "enabled";
    expect(isChatbotOperationsUiEnabled()).toBe(true);
  });
});
