import { createHmac } from "node:crypto";
import type { Role, ServiceBookingStatus } from "@prisma/client";
import type { AdminSession } from "@/lib/admin-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { calculateAvailableSlots, validateBookingFitsSchedule } from "@/lib/scheduling-engine";

export type ChatbotOperationAction =
  | "list_appointments"
  | "list_technicians"
  | "get_availability"
  | "schedule_appointment"
  | "reschedule_appointment"
  | "cancel_appointment"
  | "assign_technician";

export type ChatbotOperationRequest = {
  action: ChatbotOperationAction;
  payload?: Record<string, unknown>;
  confirmationToken?: string;
};

export type ChatbotOperationResult = {
  action: ChatbotOperationAction;
  status: "success" | "error" | "requires_confirmation";
  requiresConfirmation: boolean;
  message: string;
  result?: Record<string, unknown>;
  confirmationToken?: string;
};

type OperationContext = {
  operation: ChatbotOperationRequest;
  adminSession: AdminSession | null;
  chatSessionId: string;
};

const WRITE_ACTIONS = new Set<ChatbotOperationAction>([
  "schedule_appointment",
  "reschedule_appointment",
  "cancel_appointment",
  "assign_technician",
]);

const CHATBOT_ACTION_ROLES: Record<ChatbotOperationAction, Role[]> = {
  list_appointments: ["owner", "dispatch", "accountant"],
  list_technicians: ["owner", "dispatch"],
  get_availability: ["owner", "dispatch"],
  schedule_appointment: ["owner", "dispatch"],
  reschedule_appointment: ["owner", "dispatch"],
  cancel_appointment: ["owner", "dispatch"],
  assign_technician: ["owner", "dispatch"],
};

const VALID_BOOKING_STATUSES = new Set<ServiceBookingStatus>([
  "checkout_pending",
  "checkout_completed",
  "requested",
  "scheduled",
  "completed",
  "cancelled",
]);

const ACTION_PAYLOAD_KEYS: Record<ChatbotOperationAction, Set<string>> = {
  list_appointments: new Set(["startDate", "endDate", "status", "technicianId", "limit"]),
  list_technicians: new Set(["includeScheduleDate"]),
  get_availability: new Set(["date", "serviceCatalogItemId", "serviceId", "technicianIds", "customerLocation"]),
  schedule_appointment: new Set([
    "serviceCatalogItemId",
    "customerId",
    "contactName",
    "contactEmail",
    "contactPhone",
    "preferredDate",
    "preferredWindow",
    "addressLine1",
    "addressLine2",
    "city",
    "postalCode",
    "stateProvince",
    "notes",
    "scheduledAt",
    "technicianId",
  ]),
  reschedule_appointment: new Set(["bookingId", "scheduledAt", "technicianId"]),
  cancel_appointment: new Set(["bookingId"]),
  assign_technician: new Set(["bookingId", "technicianId"]),
};

function getAdminAuthSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;

  if (!secret) {
    throw new Error("Missing ADMIN_AUTH_SECRET environment variable");
  }

  return secret;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const normalized: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      normalized[key] = canonicalize((value as Record<string, unknown>)[key]);
    }

    return normalized;
  }

  return value;
}

function payloadHash(payload: Record<string, unknown> | undefined) {
  const canonicalPayload = canonicalize(payload ?? {});
  const serialized = JSON.stringify(canonicalPayload);

  return createHmac("sha256", getAdminAuthSecret()).update(serialized).digest("hex");
}

function signTokenPayload(payload: string) {
  return createHmac("sha256", getAdminAuthSecret()).update(payload).digest("hex");
}

function createConfirmationToken(args: {
  action: ChatbotOperationAction;
  payload: Record<string, unknown> | undefined;
  session: AdminSession;
}) {
  const body = {
    action: args.action,
    hash: payloadHash(args.payload),
    actor: args.session.name,
    role: args.session.role,
    exp: Date.now() + 5 * 60 * 1000,
  };

  const rawBody = JSON.stringify(body);
  const signature = signTokenPayload(rawBody);

  return Buffer.from(`${rawBody}.${signature}`, "utf8").toString("base64url");
}

function verifyConfirmationToken(args: {
  token: string;
  action: ChatbotOperationAction;
  payload: Record<string, unknown> | undefined;
  session: AdminSession;
}) {
  try {
    const decoded = Buffer.from(args.token, "base64url").toString("utf8");
    const splitIndex = decoded.lastIndexOf(".");

    if (splitIndex <= 0) {
      return false;
    }

    const rawBody = decoded.slice(0, splitIndex);
    const providedSignature = decoded.slice(splitIndex + 1);
    const expectedSignature = signTokenPayload(rawBody);

    if (providedSignature !== expectedSignature) {
      return false;
    }

    const tokenBody = JSON.parse(rawBody) as {
      action: ChatbotOperationAction;
      hash: string;
      actor: string;
      role: Role;
      exp: number;
    };

    if (Date.now() >= tokenBody.exp) {
      return false;
    }

    if (tokenBody.action !== args.action) {
      return false;
    }

    if (tokenBody.actor !== args.session.name || tokenBody.role !== args.session.role) {
      return false;
    }

    return tokenBody.hash === payloadHash(args.payload);
  } catch {
    return false;
  }
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

function requireOptionalString(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }

  return value;
}

function requireObject(value: unknown, field: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }

  return value as Record<string, unknown>;
}

function ensureAllowedPayloadKeys(action: ChatbotOperationAction, payload: Record<string, unknown>) {
  const allowed = ACTION_PAYLOAD_KEYS[action];
  const unknownKeys = Object.keys(payload).filter((key) => !allowed.has(key));

  if (unknownKeys.length > 0) {
    throw new Error(`Unsupported payload field(s): ${unknownKeys.join(", ")}`);
  }
}

function requireValidIsoDateString(value: unknown, field: string) {
  const parsed = optionalDate(value);

  if (!parsed) {
    throw new Error(`${field} must be a valid ISO date string`);
  }

  return parsed;
}

function parseOptionalIsoDateString(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${field} must be a valid ISO date string`);
  }

  const parsed = optionalDate(value);
  if (!parsed) {
    throw new Error(`${field} must be a valid ISO date string`);
  }

  return parsed;
}

function validatePayloadForAction(action: ChatbotOperationAction, rawPayload: unknown) {
  if (rawPayload === undefined || rawPayload === null) {
    return undefined;
  }

  const payload = requireObject(rawPayload, "payload");
  ensureAllowedPayloadKeys(action, payload);

  switch (action) {
    case "list_appointments": {
      parseOptionalIsoDateString(payload.startDate, "startDate");
      parseOptionalIsoDateString(payload.endDate, "endDate");
      if (payload.status !== undefined) {
        const status = requireString(payload.status, "status") as ServiceBookingStatus;
        if (!VALID_BOOKING_STATUSES.has(status)) {
          throw new Error("status must be a valid service booking status");
        }
      }
      if (payload.technicianId !== undefined) {
        requireString(payload.technicianId, "technicianId");
      }
      parseLimit(payload.limit, 25);
      break;
    }
    case "list_technicians": {
      parseOptionalIsoDateString(payload.includeScheduleDate, "includeScheduleDate");
      break;
    }
    case "get_availability": {
      requireValidIsoDateString(payload.date, "date");
      requireString(payload.serviceCatalogItemId ?? payload.serviceId, "serviceCatalogItemId");
      if (payload.technicianIds !== undefined) {
        if (!Array.isArray(payload.technicianIds)) {
          throw new Error("technicianIds must be an array of technician ids");
        }
        const invalidTechnicianId = payload.technicianIds.find((value) => typeof value !== "string");
        if (invalidTechnicianId !== undefined) {
          throw new Error("technicianIds must be an array of technician ids");
        }
      }
      requireOptionalString(payload.customerLocation, "customerLocation");
      break;
    }
    case "schedule_appointment": {
      requireString(payload.serviceCatalogItemId, "serviceCatalogItemId");
      requireString(payload.customerId, "customerId");
      requireString(payload.contactName, "contactName");
      requireString(payload.contactEmail, "contactEmail");
      requireString(payload.contactPhone, "contactPhone");
      requireValidIsoDateString(payload.preferredDate, "preferredDate");
      requireString(payload.preferredWindow, "preferredWindow");
      requireString(payload.addressLine1, "addressLine1");
      requireString(payload.city, "city");
      requireOptionalString(payload.addressLine2, "addressLine2");
      requireOptionalString(payload.postalCode, "postalCode");
      requireOptionalString(payload.stateProvince, "stateProvince");
      requireOptionalString(payload.notes, "notes");

      const scheduledAt = parseOptionalIsoDateString(payload.scheduledAt, "scheduledAt");
      const technicianId = payload.technicianId === undefined || payload.technicianId === null ? "" : requireString(payload.technicianId, "technicianId");
      if ((scheduledAt && !technicianId) || (!scheduledAt && technicianId)) {
        throw new Error("scheduledAt and technicianId must be provided together");
      }
      break;
    }
    case "reschedule_appointment": {
      requireString(payload.bookingId, "bookingId");
      requireValidIsoDateString(payload.scheduledAt, "scheduledAt");
      if (payload.technicianId !== undefined) {
        requireString(payload.technicianId, "technicianId");
      }
      break;
    }
    case "cancel_appointment": {
      requireString(payload.bookingId, "bookingId");
      break;
    }
    case "assign_technician": {
      requireString(payload.bookingId, "bookingId");
      requireString(payload.technicianId, "technicianId");
      break;
    }
    default: {
      const neverAction: never = action;
      throw new Error(`Unsupported action: ${neverAction}`);
    }
  }

  return payload;
}

function optionalDate(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseLimit(value: unknown, fallback = 25) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), 100);
}

function isWriteAction(action: ChatbotOperationAction) {
  return WRITE_ACTIONS.has(action);
}

async function listAppointments(payload: Record<string, unknown> | undefined) {
  const startDate = parseOptionalIsoDateString(payload?.startDate, "startDate");
  const endDate = parseOptionalIsoDateString(payload?.endDate, "endDate");
  const status = typeof payload?.status === "string" ? (payload.status as ServiceBookingStatus) : undefined;
  const technicianId = typeof payload?.technicianId === "string" ? payload.technicianId : undefined;
  const limit = parseLimit(payload?.limit, 25);

  const serviceWhere: {
    scheduledAt?: { gte?: Date; lte?: Date };
    status?: ServiceBookingStatus;
    technicianId?: string;
  } = {};

  if (status) {
    serviceWhere.status = status;
  }

  if (technicianId) {
    serviceWhere.technicianId = technicianId;
  }

  if (startDate || endDate) {
    serviceWhere.scheduledAt = {};

    if (startDate) {
      serviceWhere.scheduledAt.gte = startDate;
    }

    if (endDate) {
      serviceWhere.scheduledAt.lte = endDate;
    }
  }

  const jobWhere: {
    scheduledAt?: { gte?: Date; lte?: Date };
    technicianId?: string;
  } = {};

  if (technicianId) {
    jobWhere.technicianId = technicianId;
  }

  if (startDate || endDate) {
    jobWhere.scheduledAt = {};

    if (startDate) {
      jobWhere.scheduledAt.gte = startDate;
    }

    if (endDate) {
      jobWhere.scheduledAt.lte = endDate;
    }
  }

  const [serviceBookings, jobs] = await Promise.all([
    prisma.serviceBooking.findMany({
      where: serviceWhere,
      orderBy: { scheduledAt: "asc" },
      take: limit,
      select: {
        id: true,
        customerId: true,
        contactName: true,
        contactPhone: true,
        serviceCatalogItemId: true,
        scheduledAt: true,
        preferredDate: true,
        preferredWindow: true,
        status: true,
        technicianId: true,
        city: true,
      },
    }),
    prisma.job.findMany({
      where: jobWhere,
      orderBy: { scheduledAt: "asc" },
      take: limit,
      select: {
        id: true,
        customerId: true,
        service: true,
        scheduledAt: true,
        status: true,
        technicianId: true,
        emergency: true,
      },
    }),
  ]);

  return {
    serviceBookings: serviceBookings.map((booking) => ({
      ...booking,
      scheduledAt: booking.scheduledAt?.toISOString() ?? null,
      preferredDate: booking.preferredDate.toISOString(),
    })),
    jobs: jobs.map((job) => ({
      ...job,
      scheduledAt: job.scheduledAt.toISOString(),
    })),
    summary: {
      serviceBookingCount: serviceBookings.length,
      jobCount: jobs.length,
    },
  };
}

async function listTechnicians(payload: Record<string, unknown> | undefined) {
  const includeScheduleDate = parseOptionalIsoDateString(payload?.includeScheduleDate, "includeScheduleDate");

  const technicians = await prisma.technician.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      utilizationPercent: true,
    },
  });

  if (!includeScheduleDate) {
    return { technicians };
  }

  const nextDay = new Date(includeScheduleDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const exceptions = await prisma.technicianScheduleException.findMany({
    where: {
      exceptionDate: {
        gte: includeScheduleDate,
        lt: nextDay,
      },
    },
    select: {
      technicianId: true,
      startTime: true,
      endTime: true,
      isDayOff: true,
    },
  });

  const exceptionByTechnician = new Map(exceptions.map((item) => [item.technicianId, item]));

  return {
    technicians: technicians.map((technician) => {
      const exception = exceptionByTechnician.get(technician.id);
      return {
        ...technician,
        scheduleException: exception
          ? {
              startTime: exception.startTime,
              endTime: exception.endTime,
              isDayOff: exception.isDayOff,
            }
          : null,
      };
    }),
    forDate: includeScheduleDate.toISOString().split("T")[0],
  };
}

async function getAvailability(payload: Record<string, unknown> | undefined) {
  const dateInput = requireString(payload?.date, "date");
  const serviceId = requireString(payload?.serviceCatalogItemId ?? payload?.serviceId, "serviceCatalogItemId");

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new Error("date must be a valid ISO date string");
  }

  const technicianIds = Array.isArray(payload?.technicianIds)
    ? payload?.technicianIds.filter((value): value is string => typeof value === "string" && value.length > 0)
    : undefined;

  const customerLocation = typeof payload?.customerLocation === "string" ? payload.customerLocation : undefined;

  const availability = await calculateAvailableSlots(date, serviceId, technicianIds, customerLocation);

  return {
    date: availability.date.toISOString(),
    isSameDayBooking: availability.isSameDayBooking,
    sameDaySurchargPercent: availability.sameDaySurchargPercent,
    slotCount: availability.availableSlots.length,
    slots: availability.availableSlots.map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      technicianId: slot.technicianId,
      technicianName: slot.technicianName,
      estimatedDriveTimeMinutes: slot.estimatedDriveTimeMinutes,
    })),
  };
}

async function scheduleAppointment(payload: Record<string, unknown> | undefined) {
  const serviceCatalogItemId = requireString(payload?.serviceCatalogItemId, "serviceCatalogItemId");
  const customerId = requireString(payload?.customerId, "customerId");
  const contactName = requireString(payload?.contactName, "contactName");
  const contactEmail = requireString(payload?.contactEmail, "contactEmail");
  const contactPhone = requireString(payload?.contactPhone, "contactPhone");
  const preferredDateInput = requireString(payload?.preferredDate, "preferredDate");
  const preferredWindow = requireString(payload?.preferredWindow, "preferredWindow");
  const addressLine1 = requireString(payload?.addressLine1, "addressLine1");
  const city = requireString(payload?.city, "city");

  const preferredDate = new Date(preferredDateInput);
  if (Number.isNaN(preferredDate.getTime())) {
    throw new Error("preferredDate must be a valid ISO date string");
  }

  const scheduledAt = optionalDate(payload?.scheduledAt);
  const technicianId = typeof payload?.technicianId === "string" ? payload.technicianId.trim() : "";

  if ((scheduledAt && !technicianId) || (!scheduledAt && technicianId)) {
    throw new Error("scheduledAt and technicianId must be provided together");
  }

  if (scheduledAt && technicianId) {
    const service = await prisma.serviceCatalogItem.findUnique({
      where: { id: serviceCatalogItemId },
      select: { durationMinutes: true },
    });

    if (!service) {
      throw new Error("serviceCatalogItemId not found");
    }

    const slotEnd = new Date(scheduledAt);
    slotEnd.setMinutes(slotEnd.getMinutes() + (service.durationMinutes || 90));

    const scheduleValidation = await validateBookingFitsSchedule(
      scheduledAt,
      slotEnd,
      technicianId,
      service.durationMinutes || 90,
    );

    if (!scheduleValidation.valid) {
      throw new Error(scheduleValidation.reason || "Requested slot is not available");
    }
  }

  const booking = await prisma.serviceBooking.create({
    data: {
      id: `book_${crypto.randomUUID()}`,
      customerId,
      serviceCatalogItemId,
      contactName,
      contactEmail,
      contactPhone,
      preferredDate,
      preferredWindow,
      addressLine1,
      addressLine2: typeof payload?.addressLine2 === "string" ? payload.addressLine2 : null,
      city,
      postalCode: typeof payload?.postalCode === "string" ? payload.postalCode : null,
      stateProvince: typeof payload?.stateProvince === "string" ? payload.stateProvince : null,
      notes: typeof payload?.notes === "string" ? payload.notes : null,
      status: scheduledAt && technicianId ? "scheduled" : "requested",
      scheduledAt,
      technicianId: technicianId || null,
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      technicianId: true,
      serviceCatalogItemId: true,
    },
  });

  return {
    bookingId: booking.id,
    status: booking.status,
    scheduledAt: booking.scheduledAt?.toISOString() ?? null,
    technicianId: booking.technicianId,
    serviceCatalogItemId: booking.serviceCatalogItemId,
  };
}

async function rescheduleAppointment(payload: Record<string, unknown> | undefined) {
  const bookingId = requireString(payload?.bookingId, "bookingId");
  const scheduledAtInput = requireString(payload?.scheduledAt, "scheduledAt");
  const scheduledAt = new Date(scheduledAtInput);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("scheduledAt must be a valid ISO date string");
  }

  const booking = await prisma.serviceBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      technicianId: true,
      serviceCatalogItemId: true,
      status: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const technicianId = typeof payload?.technicianId === "string" && payload.technicianId.trim().length > 0
    ? payload.technicianId.trim()
    : booking.technicianId;

  if (!technicianId) {
    throw new Error("technicianId is required to reschedule this appointment");
  }

  const service = await prisma.serviceCatalogItem.findUnique({
    where: { id: booking.serviceCatalogItemId },
    select: { durationMinutes: true },
  });

  if (!service) {
    throw new Error("Service catalog item not found for booking");
  }

  const slotEnd = new Date(scheduledAt);
  slotEnd.setMinutes(slotEnd.getMinutes() + (service.durationMinutes || 90));

  const scheduleValidation = await validateBookingFitsSchedule(
    scheduledAt,
    slotEnd,
    technicianId,
    service.durationMinutes || 90,
  );

  if (!scheduleValidation.valid) {
    throw new Error(scheduleValidation.reason || "Requested slot is not available");
  }

  const updated = await prisma.serviceBooking.update({
    where: { id: bookingId },
    data: {
      scheduledAt,
      technicianId,
      status: "scheduled",
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      technicianId: true,
    },
  });

  return {
    bookingId: updated.id,
    status: updated.status,
    scheduledAt: updated.scheduledAt?.toISOString() ?? null,
    technicianId: updated.technicianId,
  };
}

async function cancelAppointment(payload: Record<string, unknown> | undefined) {
  const bookingId = requireString(payload?.bookingId, "bookingId");

  const updated = await prisma.serviceBooking.update({
    where: { id: bookingId },
    data: {
      status: "cancelled",
      scheduledAt: null,
      technicianId: null,
    },
    select: {
      id: true,
      status: true,
    },
  });

  return {
    bookingId: updated.id,
    status: updated.status,
  };
}

async function assignTechnician(payload: Record<string, unknown> | undefined) {
  const bookingId = requireString(payload?.bookingId, "bookingId");
  const technicianId = requireString(payload?.technicianId, "technicianId");

  const booking = await prisma.serviceBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      scheduledAt: true,
      serviceCatalogItemId: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (!booking.scheduledAt) {
    throw new Error("Booking must have scheduledAt before assigning a technician");
  }

  const service = await prisma.serviceCatalogItem.findUnique({
    where: { id: booking.serviceCatalogItemId },
    select: { durationMinutes: true },
  });

  if (!service) {
    throw new Error("Service catalog item not found for booking");
  }

  const slotEnd = new Date(booking.scheduledAt);
  slotEnd.setMinutes(slotEnd.getMinutes() + (service.durationMinutes || 90));

  const scheduleValidation = await validateBookingFitsSchedule(
    booking.scheduledAt,
    slotEnd,
    technicianId,
    service.durationMinutes || 90,
  );

  if (!scheduleValidation.valid) {
    throw new Error(scheduleValidation.reason || "Technician is not available for this slot");
  }

  const updated = await prisma.serviceBooking.update({
    where: { id: bookingId },
    data: {
      technicianId,
      status: "scheduled",
    },
    select: {
      id: true,
      status: true,
      technicianId: true,
    },
  });

  return {
    bookingId: updated.id,
    status: updated.status,
    technicianId: updated.technicianId,
  };
}

async function performOperation(action: ChatbotOperationAction, payload: Record<string, unknown> | undefined) {
  switch (action) {
    case "list_appointments":
      return listAppointments(payload);
    case "list_technicians":
      return listTechnicians(payload);
    case "get_availability":
      return getAvailability(payload);
    case "schedule_appointment":
      return scheduleAppointment(payload);
    case "reschedule_appointment":
      return rescheduleAppointment(payload);
    case "cancel_appointment":
      return cancelAppointment(payload);
    case "assign_technician":
      return assignTechnician(payload);
    default: {
      const neverAction: never = action;
      throw new Error(`Unsupported action: ${neverAction}`);
    }
  }
}

export async function executeChatbotOperation(context: OperationContext): Promise<ChatbotOperationResult> {
  const { operation, adminSession, chatSessionId } = context;
  let payload: Record<string, unknown> | undefined;

  await recordAuditEvent({
    actor: adminSession?.name ?? "anonymous",
    role: adminSession?.role ?? "anonymous",
    action: "chatbot_operation_requested",
    entity: "chatbot_operation",
    entityId: chatSessionId,
    after: {
      action: operation.action,
      hasPayload: Boolean(operation.payload),
      isWrite: isWriteAction(operation.action),
    },
  });

  if (!adminSession) {
    return {
      action: operation.action,
      status: "error",
      requiresConfirmation: false,
      message: "You must be signed in with an admin session to run operations.",
      result: {
        code: "auth_required",
      },
    };
  }

  const allowedRoles = CHATBOT_ACTION_ROLES[operation.action];

  if (!allowedRoles.includes(adminSession.role)) {
    await recordAuditEvent({
      actor: adminSession.name,
      role: adminSession.role,
      action: "chatbot_operation_denied",
      entity: "chatbot_operation",
      entityId: chatSessionId,
      after: {
        operationAction: operation.action,
        allowedRoles,
      },
    });

    return {
      action: operation.action,
      status: "error",
      requiresConfirmation: false,
      message: `Your role (${adminSession.role}) is not allowed to run ${operation.action}.`,
      result: {
        code: "forbidden",
        allowedRoles,
      },
    };
  }

  try {
    payload = validatePayloadForAction(operation.action, operation.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return {
      action: operation.action,
      status: "error",
      requiresConfirmation: isWriteAction(operation.action),
      message,
      result: {
        code: "invalid_payload",
      },
    };
  }

  if (isWriteAction(operation.action)) {
    if (!operation.confirmationToken) {
      let confirmationToken: string;

      try {
        confirmationToken = createConfirmationToken({
          action: operation.action,
          payload,
          session: adminSession,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create confirmation token";
        return {
          action: operation.action,
          status: "error",
          requiresConfirmation: true,
          message,
          result: {
            code: "confirmation_unavailable",
          },
        };
      }

      return {
        action: operation.action,
        status: "requires_confirmation",
        requiresConfirmation: true,
        confirmationToken,
        message: "Confirmation required. Submit the same action and payload with this confirmation token to execute.",
        result: {
          pendingAction: operation.action,
        },
      };
    }

    let tokenValid = false;

    try {
      tokenValid = verifyConfirmationToken({
        token: operation.confirmationToken,
        action: operation.action,
        payload,
        session: adminSession,
      });
    } catch {
      tokenValid = false;
    }

    if (!tokenValid) {
      return {
        action: operation.action,
        status: "error",
        requiresConfirmation: true,
        message: "Invalid or expired confirmation token. Please request confirmation again.",
        result: {
          code: "invalid_confirmation_token",
        },
      };
    }

    await recordAuditEvent({
      actor: adminSession.name,
      role: adminSession.role,
      action: "chatbot_operation_confirmed",
      entity: "chatbot_operation",
      entityId: chatSessionId,
      after: {
        operationAction: operation.action,
      },
    });
  }

  try {
    const result = await performOperation(operation.action, payload);

    await recordAuditEvent({
      actor: adminSession.name,
      role: adminSession.role,
      action: "chatbot_operation_executed",
      entity: "chatbot_operation",
      entityId: chatSessionId,
      after: {
        operationAction: operation.action,
      },
    });

    return {
      action: operation.action,
      status: "success",
      requiresConfirmation: false,
      message: `${operation.action} completed successfully.`,
      result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected operation failure";

    return {
      action: operation.action,
      status: "error",
      requiresConfirmation: isWriteAction(operation.action),
      message,
      result: {
        code: "operation_failed",
      },
    };
  }
}
