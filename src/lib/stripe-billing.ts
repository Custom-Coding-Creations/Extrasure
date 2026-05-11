import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createInvoiceAccessToken } from "@/lib/customer-billing-access";
import { getBaseUrl, stripe } from "@/lib/stripe";

type CheckoutContext = "admin" | "customer";

type CheckoutSessionOptions = {
  successPath?: string;
  cancelPath?: string;
  context?: CheckoutContext;
};

type BillingPortalOptions = {
  returnUrl?: string;
};

type BillingInterval = {
  interval: "month" | "year";
  intervalCount: number;
};

function toUnitAmount(amount: number) {
  return Math.round(amount * 100);
}

function mapPaymentMethod(methods: string[] | null | undefined) {
  if (methods?.includes("us_bank_account")) {
    return "ach" as const;
  }

  return "card" as const;
}

function getBillingInterval(billingCycle: "monthly" | "quarterly" | "annual") : BillingInterval {
  if (billingCycle === "quarterly") {
    return { interval: "month", intervalCount: 3 };
  }

  if (billingCycle === "annual") {
    return { interval: "year", intervalCount: 1 };
  }

  return { interval: "month", intervalCount: 1 };
}

async function ensureStripeCustomer(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });

  if (!customer) {
    throw new Error("Customer not found");
  }

  if (customer.stripeCustomerId) {
    return {
      localCustomer: customer,
      stripeCustomerId: customer.stripeCustomerId,
    };
  }

  const stripeCustomer = await stripe.customers.create({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    metadata: {
      localCustomerId: customer.id,
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      stripeCustomerId: stripeCustomer.id,
    },
  });

  return {
    localCustomer: customer,
    stripeCustomerId: stripeCustomer.id,
  };
}

/**
 * Phase 1: Create Payment Intent for one-time payments (Payment Element flow)
 * Replaces checkout sessions for one-time payments
 */
export async function createPaymentIntentForInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "paid" || invoice.status === "refunded") {
    throw new Error("Invoice is not eligible for payment");
  }

  const { localCustomer, stripeCustomerId } = await ensureStripeCustomer(invoice.customerId);

  const paymentIntent = await stripe.paymentIntents.create({
    customer: stripeCustomerId,
    amount: toUnitAmount(invoice.amount),
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      localInvoiceId: invoice.id,
      localCustomerId: localCustomer.id,
      billingCycle: invoice.billingCycle,
    },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      stripeCustomerId,
      stripePaymentIntentId: paymentIntent.id,
      paymentStatusUpdatedAt: new Date(),
    },
  });

  return paymentIntent;
}

/**
 * Phase 1: Create Subscription directly via Subscriptions API (not checkout)
 * Auto-renewing subscriptions without manual checkout each cycle
 */
export async function createDirectSubscriptionForInvoice(invoiceId: string, trialDays?: number) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.billingCycle === "one_time") {
    throw new Error("Cannot create subscription for one-time invoice");
  }

  const { localCustomer, stripeCustomerId } = await ensureStripeCustomer(invoice.customerId);

  // Create a Price in Stripe (per-invoice pricing)
  const price = await stripe.prices.create({
    product_data: {
      name: `${invoice.billingCycle} service plan`,
      metadata: {
        localInvoiceId: invoice.id,
        localCustomerId: localCustomer.id,
      },
    },
    unit_amount: toUnitAmount(invoice.amount),
    currency: "usd",
    recurring: getBillingInterval(invoice.billingCycle as "monthly" | "quarterly" | "annual"),
    metadata: {
      localInvoiceId: invoice.id,
    },
  });

  // Create subscription (direct API, not checkout)
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: price.id }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      payment_method_types: ["card", "us_bank_account"],
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice.payment_intent"],
    metadata: {
      localInvoiceId: invoice.id,
      localCustomerId: localCustomer.id,
      billingCycle: invoice.billingCycle,
    },
    ...(trialDays ? { trial_period_days: trialDays } : {}),
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripeInvoiceId: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : (subscription.latest_invoice as Stripe.Invoice)?.id ?? null,
      paymentStatusUpdatedAt: new Date(),
    },
  });

  await prisma.customer.update({
    where: { id: invoice.customerId },
    data: {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
    },
  });

  return subscription;
}

/**
 * Phase 1: Get client secret for Payment Element
 * Returns either PaymentIntent or Subscription's PaymentIntent client secret
 */
export async function getPaymentClientSecret(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // If already has payment intent, retrieve it
  if (invoice.stripePaymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(invoice.stripePaymentIntentId);
    return { clientSecret: paymentIntent.client_secret, type: "payment_intent" as const };
  }

  // If already has subscription, get its latest invoice payment intent
  if (invoice.stripeSubscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(invoice.stripeSubscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    });
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;
    return { clientSecret: paymentIntent.client_secret, type: "subscription" as const };
  }

  // Create new based on billing cycle
  if (invoice.billingCycle === "one_time") {
    const paymentIntent = await createPaymentIntentForInvoice(invoiceId);
    return { clientSecret: paymentIntent.client_secret, type: "payment_intent" as const };
  } else {
    const subscription = await createDirectSubscriptionForInvoice(invoiceId);
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;
    return { clientSecret: paymentIntent.client_secret, type: "subscription" as const };
  }
}

export async function getCustomerInvoiceSnapshot(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    return null;
  }

  const customer = await prisma.customer.findUnique({ where: { id: invoice.customerId } });

  if (!customer) {
    return null;
  }

  const latestPayment = await prisma.payment.findFirst({
    where: { invoiceId: invoice.id },
    orderBy: { createdAt: "desc" },
  });

  return {
    invoice,
    customer,
    latestPayment,
  };
}

export function createCustomerPaymentLink(invoiceId: string) {
  const token = createInvoiceAccessToken(invoiceId);
  return `${getBaseUrl()}/pay/${token}`;
}

export async function createInvoiceCheckoutSession(invoiceId: string, options?: CheckoutSessionOptions) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "paid" || invoice.status === "refunded") {
    throw new Error("Invoice is not eligible for checkout");
  }

  const { localCustomer, stripeCustomerId } = await ensureStripeCustomer(invoice.customerId);
  const baseUrl = getBaseUrl();
  const context = options?.context ?? "admin";
  const successUrl = `${baseUrl}${options?.successPath ?? "/admin/payments?stripe=success&session_id={CHECKOUT_SESSION_ID}"}`;
  const cancelUrl = `${baseUrl}${options?.cancelPath ?? `/admin/payments?stripe=cancelled&invoice=${invoice.id}`}`;
  const isRecurring = invoice.billingCycle !== "one_time";
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    client_reference_id: invoice.id,
    mode: isRecurring ? "subscription" : "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      localInvoiceId: invoice.id,
      localCustomerId: localCustomer.id,
      billingCycle: invoice.billingCycle,
      checkoutContext: context,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: {
            name: isRecurring ? `${invoice.billingCycle} service plan` : `Invoice ${invoice.id}`,
            description: `ExtraSure Pest Control billing for ${localCustomer.name}`,
          },
          unit_amount: toUnitAmount(invoice.amount),
          ...(isRecurring
            ? {
                recurring: getBillingInterval(invoice.billingCycle as "monthly" | "quarterly" | "annual"),
              }
            : {}),
        },
      },
    ],
    ...(isRecurring
      ? {
          subscription_data: {
            metadata: {
              localInvoiceId: invoice.id,
              localCustomerId: localCustomer.id,
              billingCycle: invoice.billingCycle,
            },
          },
        }
      : {
          payment_intent_data: {
            metadata: {
              localInvoiceId: invoice.id,
              localCustomerId: localCustomer.id,
              billingCycle: invoice.billingCycle,
            },
          },
        }),
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      stripeCustomerId,
      stripeCheckoutSessionId: session.id,
      checkoutUrl: session.url,
      paymentStatusUpdatedAt: new Date(),
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session;
}

export async function createBillingPortalSession(customerId: string, options?: BillingPortalOptions) {
  const { stripeCustomerId } = await ensureStripeCustomer(customerId);
  const defaultReturnUrl = `${getBaseUrl()}/admin/payments?stripe=portal_return`;
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: options?.returnUrl ?? defaultReturnUrl,
  });

  return session;
}

export async function refundPaymentById(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (!payment.stripePaymentIntentId && !payment.stripeChargeId) {
    throw new Error("Payment is not linked to Stripe yet");
  }

  const refund = await stripe.refunds.create({
    ...(payment.stripePaymentIntentId
      ? { payment_intent: payment.stripePaymentIntentId }
      : { charge: payment.stripeChargeId as string }),
    metadata: {
      localPaymentId: payment.id,
      localInvoiceId: payment.invoiceId,
    },
  });

  const refundedAt = new Date();
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "refunded",
        stripeRefundId: refund.id,
        refundedAt,
      },
    }),
    prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        status: "refunded",
        refundedAt,
        paymentStatusUpdatedAt: refundedAt,
      },
    }),
  ]);

  return refund;
}

async function upsertPaymentFromCheckoutSession(
  session: Stripe.Checkout.Session,
  status: "succeeded" | "failed" | "pending",
) {
  const invoiceId = session.metadata?.localInvoiceId;

  if (!invoiceId) {
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;

  const paymentIntent = paymentIntentId
    ? await stripe.paymentIntents.retrieve(paymentIntentId)
    : null;

  const existingPayment = await prisma.payment.findFirst({
    where: {
      OR: [
        { stripeCheckoutSessionId: session.id },
        ...(paymentIntentId ? [{ stripePaymentIntentId: paymentIntentId }] : []),
        { invoiceId },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const chargeId =
    paymentIntent && typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : null;
  const paymentMethod = mapPaymentMethod(paymentIntent?.payment_method_types);
  const invoiceStatus = status === "succeeded" ? "paid" : status === "failed" ? "past_due" : "open";
  const timestamp = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: invoiceStatus,
        stripeCustomerId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeSubscriptionId,
        checkoutUrl: session.url ?? undefined,
        paidAt: status === "succeeded" ? timestamp : null,
        paymentStatusUpdatedAt: timestamp,
      },
    });

    const paymentData = {
      invoiceId,
      method: paymentMethod,
      status,
      amount: Math.round((session.amount_total ?? 0) / 100),
      createdAt: timestamp,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId: chargeId,
      failureCode: status === "failed" ? paymentIntent?.last_payment_error?.code ?? "payment_failed" : null,
      refundedAt: null,
      stripeRefundId: null,
    } as const;

    if (existingPayment) {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: paymentData,
      });
    } else {
      await tx.payment.create({
        data: {
          id: randomUUID(),
          ...paymentData,
        },
      });
    }

    if (stripeCustomerId) {
      await tx.customer.updateMany({
        where: { id: session.metadata?.localCustomerId },
        data: {
          stripeCustomerId,
          stripeSubscriptionId,
          stripeSubscriptionStatus: status === "succeeded" && stripeSubscriptionId ? "active" : undefined,
        },
      });
    }
  });
}

async function handleStripeInvoiceEvent(invoice: Stripe.Invoice, status: "paid" | "past_due") {
  const localInvoiceId = invoice.metadata?.localInvoiceId;

  if (!localInvoiceId) {
    return;
  }

  await prisma.invoice.updateMany({
    where: { id: localInvoiceId },
    data: {
      status,
      stripeInvoiceId: invoice.id,
      stripeCustomerId: typeof invoice.customer === "string" ? invoice.customer : null,
      stripeSubscriptionId: (() => { const sub = invoice.parent?.subscription_details?.subscription; return typeof sub === "string" ? sub : (sub?.id ?? null); })(),
      paidAt: status === "paid" ? new Date() : null,
      paymentStatusUpdatedAt: new Date(),
    },
  });
}

async function handleStripeSubscriptionEvent(subscription: Stripe.Subscription, status: string) {
  const localCustomerId = subscription.metadata?.localCustomerId;

  if (!localCustomerId) {
    return;
  }

  await prisma.customer.updateMany({
    where: { id: localCustomerId },
    data: {
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: status,
    },
  });
}

async function handleRefundEvent(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;

  if (!paymentIntentId) {
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [{ stripeChargeId: charge.id }, { stripePaymentIntentId: paymentIntentId }],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!payment) {
    return;
  }

  const refundId = charge.refunds?.data[0]?.id ?? null;
  const refundedAt = new Date();
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "refunded",
        stripeChargeId: charge.id,
        stripeRefundId: refundId,
        refundedAt,
      },
    }),
    prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        status: "refunded",
        refundedAt,
        paymentStatusUpdatedAt: refundedAt,
      },
    }),
  ]);
}

async function handlePaymentIntentFailure(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.localInvoiceId;

  if (!invoiceId) {
    return;
  }

  const timestamp = new Date();
  const existingPayment = await prisma.payment.findFirst({
    where: {
      OR: [{ stripePaymentIntentId: paymentIntent.id }, { invoiceId }],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "past_due",
        stripePaymentIntentId: paymentIntent.id,
        paymentStatusUpdatedAt: timestamp,
      },
    });

    const paymentData = {
      invoiceId,
      method: mapPaymentMethod(paymentIntent.payment_method_types),
      status: "failed" as const,
      amount: Math.round((paymentIntent.amount ?? 0) / 100),
      createdAt: timestamp,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId:
        typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null,
      failureCode: paymentIntent.last_payment_error?.code ?? "payment_failed",
      refundedAt: null,
      stripeRefundId: null,
    };

    if (existingPayment) {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: paymentData,
      });
    } else {
      await tx.payment.create({
        data: {
          id: randomUUID(),
          ...paymentData,
        },
      });
    }
  });
}

/**
 * Phase 1: Handle PaymentIntent success from Payment Element flow
 */
async function handlePaymentIntentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.localInvoiceId;

  if (!invoiceId) {
    return;
  }

  const timestamp = new Date();
  const chargeId = typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null;
  const customerId = typeof paymentIntent.customer === "string" ? paymentIntent.customer : null;

  const existingPayment = await prisma.payment.findFirst({
    where: {
      OR: [{ stripePaymentIntentId: paymentIntent.id }, { invoiceId }],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "paid",
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customerId,
        paidAt: timestamp,
        paymentStatusUpdatedAt: timestamp,
      },
    });

    const paymentData = {
      invoiceId,
      method: mapPaymentMethod(paymentIntent.payment_method_types),
      status: "succeeded" as const,
      amount: Math.round(paymentIntent.amount / 100),
      createdAt: timestamp,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: chargeId,
      failureCode: null,
      refundedAt: null,
      stripeRefundId: null,
    };

    if (existingPayment) {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: paymentData,
      });
    } else {
      await tx.payment.create({
        data: {
          id: randomUUID(),
          ...paymentData,
        },
      });
    }

    // Update customer record with Stripe customer ID
    if (customerId) {
      await tx.customer.updateMany({
        where: { id: paymentIntent.metadata?.localCustomerId },
        data: {
          stripeCustomerId: customerId,
        },
      });
    }
  });
}

/**
 * Phase 1: Handle invoice.created for auto-generated subscription invoices
 */
async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  // Only handle subscription invoices (auto-generated)
  if (!invoice.subscription) {
    return;
  }

  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;

  // Check if this is a known subscription
  const customer = await prisma.customer.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!customer) {
    return;
  }

  // Check if we already have a local invoice for this Stripe invoice
  const existingInvoice = await prisma.invoice.findFirst({
    where: { stripeInvoiceId: invoice.id },
  });

  if (existingInvoice) {
    return; // Already synced
  }

  // Get the subscription to determine billing cycle
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const billingCycle = subscription.metadata?.billingCycle ?? "monthly";

  // Create local invoice record
  await prisma.invoice.create({
    data: {
      id: `inv_auto_${randomUUID()}`,
      customerId: customer.id,
      amount: Math.round(invoice.total / 100),
      dueDate: new Date(invoice.due_date ? invoice.due_date * 1000 : Date.now()),
      status: invoice.status === "paid" ? "paid" : "open",
      billingCycle: billingCycle as "one_time" | "monthly" | "quarterly" | "annual",
      stripeInvoiceId: invoice.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      paidAt: invoice.status_transitions.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
      paymentStatusUpdatedAt: new Date(),
    },
  });
}

export async function recordStripeWebhookEvent(event: Stripe.Event) {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        id: event.id,
        type: event.type,
        livemode: event.livemode,
        payloadJson: JSON.stringify(event),
        createdAt: new Date(event.created * 1000),
      },
    });

    return { duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { duplicate: true };
    }

    throw error;
  }
}

export async function reconcileInvoiceFromStripe(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    return {
      ok: false,
      error: "Invoice not found",
    } as const;
  }

  if (!invoice.stripeCheckoutSessionId && !invoice.stripePaymentIntentId && !invoice.stripeInvoiceId) {
    return {
      ok: false,
      error: "Invoice has no Stripe linkage yet",
    } as const;
  }

  let paymentStatus: "succeeded" | "failed" | "pending" = "pending";
  let paymentIntentId = invoice.stripePaymentIntentId ?? null;
  const checkoutSessionId = invoice.stripeCheckoutSessionId ?? null;
  let stripeCustomerId = invoice.stripeCustomerId ?? null;
  let stripeSubscriptionId = invoice.stripeSubscriptionId ?? null;
  const stripeInvoiceId = invoice.stripeInvoiceId ?? null;
  let paidAt: Date | null = null;
  let amount = invoice.amount;
  let paymentMethod: "card" | "ach" = "card";
  let chargeId: string | null = null;
  let failureCode: string | null = null;

  if (checkoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ["payment_intent"],
    });

    paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    stripeCustomerId = typeof session.customer === "string" ? session.customer : stripeCustomerId;
    stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? stripeSubscriptionId;
    amount = Math.round((session.amount_total ?? invoice.amount * 100) / 100);

    const sessionStatus = session.payment_status;

    if (sessionStatus === "paid") {
      paymentStatus = "succeeded";
      paidAt = new Date();
    } else if (sessionStatus === "unpaid") {
      paymentStatus = "failed";
    } else {
      paymentStatus = "pending";
    }
  }

  if (paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    chargeId = typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null;
    paymentMethod = mapPaymentMethod(paymentIntent.payment_method_types);
    failureCode = paymentIntent.last_payment_error?.code ?? null;
    amount = Math.round((paymentIntent.amount ?? amount * 100) / 100);

    if (paymentIntent.status === "succeeded") {
      paymentStatus = "succeeded";
      paidAt = new Date();
    } else if (paymentIntent.status === "requires_payment_method" || paymentIntent.status === "canceled") {
      paymentStatus = "failed";
    } else if (paymentIntent.status === "processing") {
      paymentStatus = "pending";
    }

    if (!stripeCustomerId && typeof paymentIntent.customer === "string") {
      stripeCustomerId = paymentIntent.customer;
    }
  }

  if (stripeInvoiceId) {
    const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId);

    if (stripeInvoice.status === "paid") {
      paymentStatus = "succeeded";
      paidAt = stripeInvoice.status_transitions.paid_at ? new Date(stripeInvoice.status_transitions.paid_at * 1000) : paidAt;
    } else if (stripeInvoice.status === "open" || stripeInvoice.status === "uncollectible") {
      paymentStatus = "failed";
    }

    stripeCustomerId = typeof stripeInvoice.customer === "string" ? stripeInvoice.customer : stripeCustomerId;
    const sub = stripeInvoice.parent?.subscription_details?.subscription;
    stripeSubscriptionId = typeof sub === "string" ? sub : sub?.id ?? stripeSubscriptionId;
  }

  const invoiceStatus =
    paymentStatus === "succeeded"
      ? "paid"
      : paymentStatus === "failed"
        ? "past_due"
        : "open";

  const timestamp = new Date();
  const existingPayment = await prisma.payment.findFirst({
    where: {
      OR: [
        { invoiceId },
        ...(checkoutSessionId ? [{ stripeCheckoutSessionId: checkoutSessionId }] : []),
        ...(paymentIntentId ? [{ stripePaymentIntentId: paymentIntentId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: invoiceStatus,
        stripeCustomerId,
        stripeCheckoutSessionId: checkoutSessionId,
        stripePaymentIntentId: paymentIntentId,
        stripeSubscriptionId,
        stripeInvoiceId,
        paidAt: paymentStatus === "succeeded" ? paidAt ?? timestamp : null,
        paymentStatusUpdatedAt: timestamp,
      },
    });

    const paymentData = {
      invoiceId,
      method: paymentMethod,
      status: paymentStatus,
      amount,
      createdAt: timestamp,
      stripeCheckoutSessionId: checkoutSessionId,
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId: chargeId,
      failureCode,
      refundedAt: null,
      stripeRefundId: null,
    } as const;

    if (existingPayment) {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: paymentData,
      });
    } else {
      await tx.payment.create({
        data: {
          id: randomUUID(),
          ...paymentData,
        },
      });
    }
  });

  return {
    ok: true,
    invoiceId,
    invoiceStatus,
    paymentStatus,
    paymentIntentId,
    checkoutSessionId,
  } as const;
}

export async function replayWebhookEventById(eventId: string) {
  const webhookEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { id: eventId },
  });

  if (!webhookEvent) {
    return {
      ok: false,
      error: "Webhook event not found",
    } as const;
  }

  let event: Stripe.Event;

  try {
    event = JSON.parse(webhookEvent.payloadJson) as Stripe.Event;
  } catch {
    return {
      ok: false,
      error: "Stored webhook payload is invalid JSON",
    } as const;
  }

  await handleStripeEvent(event);

  await prisma.stripeWebhookEvent.update({
    where: { id: webhookEvent.id },
    data: {
      processedAt: new Date(),
    },
  });

  return {
    ok: true,
    eventId: webhookEvent.id,
    eventType: webhookEvent.type,
  } as const;
}

function eventMatchesInvoiceId(event: Stripe.Event, invoiceId: string) {
  const dataObject = event.data.object as {
    client_reference_id?: string;
    metadata?: Record<string, string | undefined>;
  };

  if (dataObject.client_reference_id === invoiceId) {
    return true;
  }

  const metadata = dataObject.metadata;

  if (!metadata) {
    return false;
  }

  return metadata.localInvoiceId === invoiceId || metadata.invoiceId === invoiceId;
}

export async function replayLatestWebhookForInvoice(invoiceId: string) {
  const webhookEvents = await prisma.stripeWebhookEvent.findMany({
    where: {
      payloadJson: {
        contains: invoiceId,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
  });

  for (const webhookEvent of webhookEvents) {
    try {
      const event = JSON.parse(webhookEvent.payloadJson) as Stripe.Event;

      if (!eventMatchesInvoiceId(event, invoiceId)) {
        continue;
      }

      return replayWebhookEventById(webhookEvent.id);
    } catch {
      continue;
    }
  }

  if (!webhookEvents.length) {
    return {
      ok: false,
      error: "No webhook events found containing invoice identifier",
    } as const;
  }

  return {
    ok: false,
    error: "No matching webhook event found for invoice",
  } as const;
}

type SubscriptionLifecycleAction = "pause" | "resume" | "cancel";

export async function setCustomerSubscriptionLifecycle(
  customerId: string,
  action: SubscriptionLifecycleAction,
) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || !customer.stripeSubscriptionId) {
    return {
      ok: false,
      error: "Customer does not have a Stripe subscription",
    } as const;
  }

  const current = await stripe.subscriptions.retrieve(customer.stripeSubscriptionId);

  if (current.status === "canceled" && action === "resume") {
    return {
      ok: false,
      error: "Canceled subscriptions cannot be resumed. Create a new subscription checkout.",
    } as const;
  }

  const updated = await stripe.subscriptions.update(customer.stripeSubscriptionId, {
    ...(action === "pause"
      ? {
          pause_collection: {
            behavior: "void",
          },
          cancel_at_period_end: false,
        }
      : action === "resume"
        ? {
            pause_collection: null,
            cancel_at_period_end: false,
          }
        : {
            pause_collection: null,
            cancel_at_period_end: true,
          }),
    metadata: {
      ...(current.metadata ?? {}),
      localCustomerId: customer.id,
      lifecycleAction: action,
    },
  });

  const statusLabel =
    action === "pause"
      ? "paused"
      : action === "cancel"
        ? "canceling"
        : updated.status;

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      stripeSubscriptionId: updated.id,
      stripeSubscriptionStatus: statusLabel,
    },
  });

  return {
    ok: true,
    customerId: customer.id,
    subscriptionId: updated.id,
    status: statusLabel,
  } as const;
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      await upsertPaymentFromCheckoutSession(event.data.object as Stripe.Checkout.Session, "succeeded");
      return;
    }
    case "checkout.session.async_payment_failed": {
      await upsertPaymentFromCheckoutSession(event.data.object as Stripe.Checkout.Session, "failed");
      return;
    }
    case "payment_intent.succeeded": {
      // Phase 1: Handle Payment Element success
      await handlePaymentIntentSuccess(event.data.object as Stripe.PaymentIntent);
      return;
    }
    case "payment_intent.payment_failed": {
      await handlePaymentIntentFailure(event.data.object as Stripe.PaymentIntent);
      return;
    }
    case "charge.refunded": {
      await handleRefundEvent(event.data.object as Stripe.Charge);
      return;
    }
    case "invoice.created": {
      // Phase 1: Auto-sync subscription invoices
      await handleInvoiceCreated(event.data.object as Stripe.Invoice);
      return;
    }
    case "invoice.paid": {
      await handleStripeInvoiceEvent(event.data.object as Stripe.Invoice, "paid");
      return;
    }
    case "invoice.payment_failed": {
      await handleStripeInvoiceEvent(event.data.object as Stripe.Invoice, "past_due");
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleStripeSubscriptionEvent(subscription, subscription.status);
      return;
    }
    case "customer.subscription.deleted": {
      await handleStripeSubscriptionEvent(event.data.object as Stripe.Subscription, "canceled");
      return;
    }
    default:
      return;
  }
}