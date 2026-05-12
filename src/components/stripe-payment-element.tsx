"use client";

import { StripeCheckoutElementsForm } from "@/components/stripe-checkout-elements-form";

type StripePaymentElementProps = {
  token: string;
  amount: number;
};

export function StripePaymentElement({ token, amount }: StripePaymentElementProps) {
  return (
    <StripeCheckoutElementsForm
      initUrl="/api/payment-intent"
      initPayload={{ token }}
      successPath={`/pay/${token}?stripe=success&session_id={CHECKOUT_SESSION_ID}`}
      amount={amount}
      title="Payment Details"
    />
  );
}
