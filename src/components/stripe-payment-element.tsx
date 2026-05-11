"use client";

import { useState, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";

// Load publishable key from env
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PaymentFormProps = {
  token: string;
  onSuccess: () => void;
  onError: (error: string) => void;
};

function PaymentForm({ token, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pay/${token}?status=success`,
        },
      });

      if (error) {
        setMessage(error.message ?? "Payment failed");
        onError(error.message ?? "Payment failed");
      } else {
        onSuccess();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {message && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full rounded-full bg-[#163526] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </button>

      <p className="text-center text-xs text-[#5d7267]">
        Secured by Stripe • Card, ACH, and other payment methods accepted
      </p>
    </form>
  );
}

type StripePaymentElementProps = {
  token: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
};

export function StripePaymentElement({ 
  token, 
  amount,
  onSuccess = () => {},
  onError = () => {},
}: StripePaymentElementProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClientSecret() {
      try {
        const response = await fetch("/api/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to initialize payment");
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load payment form";
        setError(message);
        onError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchClientSecret();
  }, [token, onError]);

  if (loading) {
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

  const options: StripeElementsOptions = {
    clientSecret,
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
  };

  return (
    <div className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-6">
      <h3 className="text-xl font-semibold text-[#1b2f25]">Payment Details</h3>
      <p className="mt-1 text-sm text-[#5d7267]">Amount: ${amount}</p>
      
      <div className="mt-6">
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm token={token} onSuccess={onSuccess} onError={onError} />
        </Elements>
      </div>
    </div>
  );
}
