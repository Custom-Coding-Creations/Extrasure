"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BillingAddressElement,
  CheckoutElementsProvider,
  ContactDetailsElement,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import {
  loadStripe,
  type StripeCheckoutElementsSdkOptions,
  type StripeContactDetailsElementOptions,
} from "@stripe/stripe-js";
import { AchDiscountBadge } from "@/components/payment-methods/AchDiscountBadge";
import { SavePaymentMethodCheckbox } from "@/components/payment-methods/SavePaymentMethodCheckbox";
import type { PaymentMethodType } from "@/types/payment-preferences";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

type InitRequestPayload = Record<string, string | number | boolean | null | undefined>;

type StripeCheckoutElementsFormProps = {
  initUrl: string;
  initPayload: InitRequestPayload;
  successPath: string;
  amount: number;
  title?: string;
  defaultCountry?: string;
  showContactDetails?: boolean;
  defaultValues?: {
    email?: string;
    phoneNumber?: string;
    billingName?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    stateProvince?: string;
    country?: string;
  };
};

type CheckoutFormInnerProps = {
  successPath: string;
  showContactDetails: boolean;
  paymentElementOptions?: Record<string, unknown>;
  contactDetailsOptions?: StripeContactDetailsElementOptions;
  achDiscount?: {
    discountedAmount: number;
    savingsAmount: number;
  } | null;
  preferredPaymentMethod?: PaymentMethodType;
  savePaymentMethod: boolean;
  onSavePaymentMethodChange: (next: boolean) => void;
  isRefreshing: boolean;
};

function CheckoutFormInner({
  successPath,
  showContactDetails,
  paymentElementOptions,
  contactDetailsOptions,
  achDiscount,
  preferredPaymentMethod,
  savePaymentMethod,
  onSavePaymentMethodChange,
  isRefreshing,
}: CheckoutFormInnerProps) {
  const checkoutState = useCheckoutElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (checkoutState.type !== "success") {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const result = await checkoutState.checkout.confirm();

      if (result.type === "error") {
        setMessage(result.error.message ?? "Payment failed");
        return;
      }

      if (result.type === "success") {
        const location = successPath.replace(
          "{CHECKOUT_SESSION_ID}",
          encodeURIComponent(result.session.id),
        );
        window.location.assign(location);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      setMessage(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const safePaymentElementOptions = {
    ...(paymentElementOptions ?? {}),
  };
  delete safePaymentElementOptions.defaultValues;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showContactDetails ? <ContactDetailsElement options={contactDetailsOptions} /> : null}
      <BillingAddressElement />
      {achDiscount ? (
        <AchDiscountBadge
          savingsAmount={achDiscount.savingsAmount}
          discountedAmount={achDiscount.discountedAmount}
        />
      ) : null}
      <PaymentElement
        options={{
          layout: "accordion",
          ...safePaymentElementOptions,
        }}
      />
      <SavePaymentMethodCheckbox
        checked={savePaymentMethod}
        onChange={onSavePaymentMethodChange}
        disabled={isRefreshing || isProcessing}
      />
      {isRefreshing ? (
        <p className="text-xs text-[#5d7267]">Refreshing checkout configuration...</p>
      ) : null}
      {preferredPaymentMethod && preferredPaymentMethod !== "none" ? (
        <p className="text-xs text-[#5d7267]">
          Preferred method detected: <span className="font-semibold uppercase">{preferredPaymentMethod}</span>
        </p>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{message}</div>
      ) : null}

      {checkoutState.type === "error" ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {checkoutState.error.message || "Unable to initialize Stripe checkout."}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={checkoutState.type !== "success" || isProcessing}
        className="w-full rounded-full bg-[#163526] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </button>

      <p className="text-center text-xs text-[#5d7267]">
        Secured by Stripe • Card, ACH, wallets, and eligible local methods accepted
      </p>
    </form>
  );
}

export function StripeCheckoutElementsForm({
  initUrl,
  initPayload,
  successPath,
  amount,
  title = "Payment Details",
  defaultCountry = "US",
  showContactDetails = true,
  defaultValues,
}: StripeCheckoutElementsFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentElementOptions, setPaymentElementOptions] = useState<Record<string, unknown> | null>(null);
  const [achDiscount, setAchDiscount] = useState<{ discountedAmount: number; savingsAmount: number } | null>(null);
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<PaymentMethodType | undefined>(undefined);
  const [savePaymentMethod, setSavePaymentMethod] = useState(true);

  const payload = useMemo(() => initPayload, [initPayload]);

  const contactDetailsOptions: StripeContactDetailsElementOptions | undefined = showContactDetails && defaultValues?.email
    ? {
        defaultValues: {
          email: defaultValues.email,
        },
      }
    : undefined;

  useEffect(() => {
    if (!stripePromise) {
      return;
    }

    async function initializeCheckout() {
      try {
        const response = await fetch(initUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            savePaymentMethod,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to initialize payment");
        }

        setClientSecret(data.clientSecret);
        setPaymentElementOptions((data.paymentElementOptions ?? null) as Record<string, unknown> | null);
        setAchDiscount(
          data.achDiscount
            ? {
                discountedAmount: Number(data.achDiscount.discountedAmount),
                savingsAmount: Number(data.achDiscount.savingsAmount),
              }
            : null,
        );
        setPreferredPaymentMethod(data.preferredPaymentMethod as PaymentMethodType | undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load payment form";
        setError(message);
        setClientSecret(null);
      } finally {
        setLoading(false);
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    initializeCheckout();
  }, [initUrl, payload, savePaymentMethod]);

  if (loading) {
    if (!stripePromise) {
      return (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-6">
          <h3 className="text-lg font-semibold text-red-900">Payment Error</h3>
          <p className="mt-2 text-sm text-red-700">Stripe is not configured. Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</p>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-8">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#163526] border-t-transparent"></div>
          <p className="text-sm text-[#5d7267]">Loading secure payment form...</p>
        </div>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-900">Payment Error</h3>
        <p className="mt-2 text-sm text-red-700">{error || "Unable to load payment form"}</p>
      </div>
    );
  }

  const options: StripeCheckoutElementsSdkOptions = {
    clientSecret,
    defaultValues: {
      email: defaultValues?.email,
      phoneNumber: defaultValues?.phoneNumber,
      billingAddress: {
        name: defaultValues?.billingName,
        address: {
          country: defaultValues?.country || defaultCountry,
          line1: defaultValues?.addressLine1,
          line2: defaultValues?.addressLine2,
          city: defaultValues?.city,
          postal_code: defaultValues?.postalCode,
          state: defaultValues?.stateProvince,
        },
      },
    },
    elementsOptions: {
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#163526",
          colorBackground: "#fff9eb",
          colorText: "#1b2f25",
          colorDanger: "#8a3d22",
          borderRadius: "12px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        },
      },
      loader: "auto",
      syncAddressCheckbox: "billing",
    },
  };

  return (
    <div className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-6">
      <h3 className="text-xl font-semibold text-[#1b2f25]">{title}</h3>
      <p className="mt-1 text-sm text-[#5d7267]">Amount: ${amount}</p>
      <div className="mt-6">
        <CheckoutElementsProvider stripe={stripePromise} options={options}>
          <CheckoutFormInner
            successPath={successPath}
            showContactDetails={showContactDetails}
            paymentElementOptions={paymentElementOptions ?? undefined}
            contactDetailsOptions={contactDetailsOptions}
            achDiscount={achDiscount}
            preferredPaymentMethod={preferredPaymentMethod}
            savePaymentMethod={savePaymentMethod}
            onSavePaymentMethodChange={setSavePaymentMethod}
            isRefreshing={loading}
          />
        </CheckoutElementsProvider>
      </div>
    </div>
  );
}
