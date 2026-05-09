export type LeadPayload = {
  source?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  addressOrZip?: string;
  serviceNeeded?: string;
  details?: string;
};

export type LeadRoutingContext = {
  ipAddress?: string;
  userAgent?: string;
};

const ROUTES = [
  { key: "email", url: process.env.LEAD_EMAIL_WEBHOOK_URL },
  { key: "sms", url: process.env.LEAD_SMS_WEBHOOK_URL },
  { key: "crm", url: process.env.LEAD_CRM_WEBHOOK_URL },
] as const;

export function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function hasRequiredLeadFields(payload: LeadPayload) {
  return hasValue(payload.fullName) && hasValue(payload.phone) && hasValue(payload.addressOrZip) && hasValue(payload.details);
}

export async function routeLeadPayload(payload: LeadPayload, context: LeadRoutingContext = {}) {
  const lead = {
    ...payload,
    createdAt: new Date().toISOString(),
    ipAddress: context.ipAddress ?? "unknown",
    userAgent: context.userAgent ?? "unknown",
  };

  const configuredRoutes = ROUTES.filter((route) => hasValue(route.url));

  if (configuredRoutes.length === 0) {
    console.info("Lead captured with no webhooks configured", lead);

    return {
      successful: [] as string[],
      configuredRouteCount: 0,
      lead,
    };
  }

  const routeResults = await Promise.allSettled(
    configuredRoutes.map(async (route) => {
      const response = await fetch(route.url as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lead-source": payload.source ?? "unknown",
        },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`Routing failed for ${route.key}`);
      }

      return route.key;
    }),
  );

  const successful: string[] = [];

  for (const result of routeResults) {
    if (result.status === "fulfilled") {
      successful.push(result.value);
    }
  }

  return {
    successful,
    configuredRouteCount: configuredRoutes.length,
    lead,
  };
}
