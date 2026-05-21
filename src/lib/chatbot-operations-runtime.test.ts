import { isChatbotOperationsUiEnabled } from "@/lib/chatbot-operations-runtime";

describe("chatbot-operations-runtime", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED;
  });

  it("enables operations UI by default", () => {
    delete process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED;
    expect(isChatbotOperationsUiEnabled()).toBe(true);
  });

  it("disables operations UI for off-like values", () => {
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
  });
});
