/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { ChatbotLayout } from "@/components/chatbot/chatbot-layout";

jest.mock("@/components/chatbot/triage-form", () => ({
  TriageForm: () => <div data-testid="triage-form" />, 
}));

jest.mock("@/components/chatbot/lead-capture-form", () => ({
  LeadCaptureForm: () => null,
}));

const mockUseChatbot = jest.fn();

jest.mock("@/components/chatbot/chatbot-provider", () => ({
  useChatbot: () => mockUseChatbot(),
}));

function makeChatbotContext(overrides?: Record<string, unknown>) {
  return {
    viewMode: "panel",
    toggleFullscreen: jest.fn(),
    triageEnabled: false,
    showTriage: false,
    setShowTriage: jest.fn(),
    showLeadForm: false,
    accountContext: null,
    suggestedPrompts: [],
    sendMessage: jest.fn(),
    sending: false,
    input: "",
    setInput: jest.fn(),
    handoffLinks: {
      callHref: "tel:+15169432318",
      smsHref: "sms:+15169432318",
      contactPath: "/contact",
    },
    messages: [
      {
        id: "m_1",
        role: "assistant",
        content: "Hello",
      },
    ],
    ...overrides,
  };
}

describe("chatbot-layout simplified interface", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows quick action buttons and no operations section", () => {
    mockUseChatbot.mockReturnValue(makeChatbotContext());

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.getByRole("button", { name: /check appointment availability/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /book a service visit/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /reschedule my service/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /pricing and plans/i })).not.toBeNull();
    expect(screen.queryByText(/operations beta/i)).toBeNull();
  });

  it("sends the mapped quick action prompt when clicked", () => {
    const sendMessage = jest.fn();
    mockUseChatbot.mockReturnValue(makeChatbotContext({ sendMessage }));

    render(<ChatbotLayout onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /book a service visit/i }));

    expect(sendMessage).toHaveBeenCalledWith("I want to book a pest control service visit.");
  });

  it("renders and uses suggested prompts", () => {
    const sendMessage = jest.fn();
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        sendMessage,
        suggestedPrompts: ["Do you offer same-day appointments?"],
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /do you offer same-day appointments\?/i }));

    expect(sendMessage).toHaveBeenCalledWith("Do you offer same-day appointments?");
  });

  it("shows and toggles triage when enabled", () => {
    const setShowTriage = jest.fn();
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        triageEnabled: true,
        showTriage: false,
        setShowTriage,
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /start ai pest triage/i }));

    expect(setShowTriage).toHaveBeenCalledWith(true);
  });
});
