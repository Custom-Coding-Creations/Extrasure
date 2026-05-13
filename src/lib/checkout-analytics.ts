import type { PaymentMethodType } from "@/types/payment-preferences";

export function buildCheckoutInitializationPayload(preferredPaymentMethod?: PaymentMethodType) {
  return {
    source: "stripe_checkout_elements",
    preferredMethod: preferredPaymentMethod ?? "none",
  };
}

export function buildCheckoutOutcomePayload() {
  return {
    source: "stripe_checkout_elements",
  };
}
