import { buildCheckoutInitializationPayload, buildCheckoutOutcomePayload } from "@/lib/checkout-analytics";

describe("checkout analytics helpers", () => {
  it("defaults missing preferred payment method to none", () => {
    expect(buildCheckoutInitializationPayload()).toEqual({
      source: "stripe_checkout_elements",
      preferredMethod: "none",
    });
  });

  it("preserves the preferred payment method when provided", () => {
    expect(buildCheckoutInitializationPayload("card_wallet")).toEqual({
      source: "stripe_checkout_elements",
      preferredMethod: "card_wallet",
    });
  });

  it("builds the shared checkout outcome payload", () => {
    expect(buildCheckoutOutcomePayload()).toEqual({
      source: "stripe_checkout_elements",
    });
  });
});
