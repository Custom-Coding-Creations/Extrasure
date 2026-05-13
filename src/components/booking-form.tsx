"use client";

import { useEffect, useRef, useState } from "react";
import { type AvailableSlot, AvailabilityPicker } from "@/components/availability-picker";
import { startBookingCheckoutAction } from "@/app/book/actions";
import { getNextSlotIndex } from "@/lib/availability-navigation";
import { buildBookingAiEventPayload } from "@/lib/booking-ai-analytics";
import { trackEvent } from "@/lib/analytics";
import { buildBookingAiContext } from "@/lib/booking-ai-context";
import { saveBookingAiHandoff } from "@/lib/booking-assistant-handoff";
import { buildBookingReviewSummary } from "@/lib/booking-review-summary";
import { isBookingSubmitReady } from "@/lib/booking-submit-readiness";
import { buildContactHiddenFields, buildCoreHiddenFields } from "@/lib/booking-submission-payload";
import { canProceedStep, nextWizardStep, previousWizardStep } from "@/lib/booking-wizard-logic";
import {
  loadWizardState,
  normalizeWizardStep,
  resolveServiceId,
  saveWizardState,
} from "@/lib/booking-wizard-storage";
import { testimonials, trustBadges } from "@/lib/site";

type AiChatPayload = {
  ok: true;
  sessionId: string;
  answer: string;
};

const stepLabels = [
  "Pest details",
  "Protection plan",
  "Appointment",
  "Home details",
  "Review",
] as const;

const pestCategories = [
  {
    id: "ants",
    label: "Ants",
    icon: "A",
    note: "High spring activity in local neighborhoods.",
  },
  {
    id: "rodents",
    label: "Rodents",
    icon: "R",
    note: "Most urgent when sightings are indoors at night.",
  },
  {
    id: "termites",
    label: "Termites",
    icon: "T",
    note: "Protect structural wood before peak season.",
  },
  {
    id: "mosquitoes",
    label: "Mosquitoes",
    icon: "M",
    note: "Best results from recurring exterior defense.",
  },
  {
    id: "bed_bugs",
    label: "Bed Bugs",
    icon: "B",
    note: "Fast treatment reduces spread risk significantly.",
  },
  {
    id: "not_sure",
    label: "Not sure",
    icon: "?",
    note: "Our AI helps identify symptoms and recommend plans.",
  },
] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getDayPart(dateString: string) {
  const hour = new Date(dateString).getHours();

  if (hour < 11) {
    return "Morning";
  }

  if (hour < 14) {
    return "Midday";
  }

  if (hour < 18) {
    return "Afternoon";
  }

  return "Evening";
}

function getPlanBadge(item: BookingFormProps["activeItems"][number], index: number) {
  if (index === 0) {
    return "Most Popular";
  }

  if (item.kind === "subscription" && item.billingCycle === "quarterly") {
    return "Best Value";
  }

  if (item.kind === "subscription") {
    return "Recommended";
  }

  return "Family Safe";
}

function getContextByStep(step: number, selectedServiceName: string, selectedPestLabel: string, selectedSlot: AvailableSlot | null) {
  if (step === 0) {
    return {
      title: "AI-guided diagnosis",
      message: "Not sure what is causing activity? Ask our assistant for signs to check and the safest response.",
      bullets: [
        "High pest activity alerts by season",
        "Pet and child-safe treatment guidance",
        "Instant human handoff when needed",
      ],
    };
  }

  if (step === 1) {
    return {
      title: "Protection recommendations",
      message: `Based on ${selectedPestLabel.toLowerCase()} concerns, ${selectedServiceName || "our most trusted"} plan is often chosen by local homeowners.`,
      bullets: [
        "Recurring plans reduce repeat outbreaks",
        "Transparent coverage with no surprise fees",
        "EPA-compliant products and protocols",
      ],
    };
  }

  if (step === 2) {
    return {
      title: "Smart scheduling",
      message: selectedSlot
        ? `Selected ${getDayPart(selectedSlot.start).toLowerCase()} window with ${selectedSlot.technicianName || "next available technician"}.`
        : "Choose from grouped time windows designed to reduce decision fatigue and speed checkout.",
      bullets: [
        "Fastest slots highlighted first",
        "Technician matching shown inline",
        "Convenience tags for quicker decisions",
      ],
    };
  }

  if (step === 3) {
    return {
      title: "Trusted home care",
      message: "Your details are used only for scheduling, routing, and treatment safety instructions.",
      bullets: [
        "Background-checked local technicians",
        "Secure customer profile and invoicing",
        "Preparation reminders before arrival",
      ],
    };
  }

  return {
    title: "Secure checkout",
    message: "Review your booking before entering payment details powered by Stripe.",
    bullets: [
      "PCI-compliant payment processing",
      "Clear recurring billing disclosures",
      "Invoice history available in your account",
    ],
  };
}

function getAiPromptsForStep(step: number, selectedPestLabel: string, selectedServiceName: string) {
  if (step === 0) {
    return [
      `I am not sure if this is ${selectedPestLabel.toLowerCase()} activity. What should I check first?`,
      "What are the safest first steps with pets and children in the home?",
    ];
  }

  if (step === 1) {
    return [
      `Which plan is best for recurring ${selectedPestLabel.toLowerCase()} issues?`,
      `Why would I choose ${selectedServiceName || "a recurring plan"} over one-time treatment?`,
    ];
  }

  if (step === 2) {
    return [
      "Which appointment window is usually most convenient for families?",
      "How should I prepare my home before the technician arrives?",
    ];
  }

  if (step === 3) {
    return [
      "What address and access details should I include for a smooth visit?",
      "What preparation notes reduce delays on treatment day?",
    ];
  }

  return [
    "Can you summarize what happens after I complete checkout?",
    "What guarantees and safety standards are included with service?",
  ];
}

interface BookingFormProps {
  activeItems: Array<{
    id: string;
    name: string;
    description: string;
    kind: "subscription" | "one_time";
    billingCycle?: string;
    amount: number;
  }>;
  prefill?: {
    fullName?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    stateProvince?: string;
  };
}

export function BookingForm({ activeItems, prefill }: BookingFormProps) {
  const [storedState] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return loadWizardState(window.sessionStorage);
  });

  const availableServiceIds = activeItems.map((item) => item.id);
  const [step, setStep] = useState(() => {
    return normalizeWizardStep(storedState?.step, stepLabels.length - 1);
  });
  const [selectedPestId, setSelectedPestId] = useState<(typeof pestCategories)[number]["id"]>(storedState?.selectedPestId ?? "not_sure");
  const [selectedServiceId, setSelectedServiceId] = useState(() => resolveServiceId(storedState?.selectedServiceId, availableServiceIds, activeItems[0]?.id || ""));
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(storedState?.selectedSlot ?? null);
  const [contactName, setContactName] = useState(storedState?.contactName ?? prefill?.fullName ?? "");
  const [contactEmail, setContactEmail] = useState(storedState?.contactEmail ?? prefill?.email ?? "");
  const [contactPhone, setContactPhone] = useState(storedState?.contactPhone ?? prefill?.phone ?? "");
  const [addressLine1, setAddressLine1] = useState(storedState?.addressLine1 ?? prefill?.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(storedState?.addressLine2 ?? prefill?.addressLine2 ?? "");
  const [city, setCity] = useState(storedState?.city ?? prefill?.city ?? "");
  const [postalCode, setPostalCode] = useState(storedState?.postalCode ?? prefill?.postalCode ?? "");
  const [stateProvince, setStateProvince] = useState(storedState?.stateProvince ?? prefill?.stateProvince ?? "");
  const [notes, setNotes] = useState(storedState?.notes ?? "");
  const [aiSessionId, setAiSessionId] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const pestButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const planButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedService = activeItems.find((item) => item.id === selectedServiceId) ?? null;
  const selectedPest = pestCategories.find((pest) => pest.id === selectedPestId) ?? pestCategories[pestCategories.length - 1];
  const progress = ((step + 1) / stepLabels.length) * 100;
  const preferredDate = selectedSlot ? selectedSlot.start.slice(0, 10) : "";
  const preferredWindow = selectedSlot ? getDayPart(selectedSlot.start) : "";
  const isFinalStep = step === stepLabels.length - 1;
  const primaryCtaLabel = isFinalStep ? "Continue to secure checkout" : "Continue";
  const aiPrompts = getAiPromptsForStep(step, selectedPest.label, selectedService?.name ?? "");
  const bookingAiEventPayload = buildBookingAiEventPayload(step, stepLabels[step]);
  const bookingAiContext = buildBookingAiContext({
    step,
    stepLabel: stepLabels[step],
    city,
    propertyAddress: addressLine1 || undefined,
  });

  const contextPanel = getContextByStep(step, selectedService?.name ?? "", selectedPest.label, selectedSlot);
  const reviewSummary = buildBookingReviewSummary({
    pestLabel: selectedPest.label,
    serviceName: selectedService?.name,
    selectedSlot,
    amount: selectedService?.amount,
    notes,
    formatCurrency,
    formatAppointment: (slot) => `${new Date(slot.start).toLocaleString()} with ${slot.technicianName || "next available technician"}`,
  });

  useEffect(() => {
    trackEvent("booking_wizard_step_viewed", { step: step + 1, stepLabel: stepLabels[step] });
  }, [step]);

  useEffect(() => {
    if (selectedService) {
      trackEvent("booking_service_selected", { serviceId: selectedService.id, serviceName: selectedService.name });
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedSlot) {
      trackEvent("booking_slot_selected", {
        technician: selectedSlot.technicianName || "unassigned",
        slotStart: selectedSlot.start,
      });
    }
  }, [selectedSlot]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    saveWizardState(window.sessionStorage, {
        step,
        selectedPestId,
        selectedServiceId,
        selectedSlot,
        contactName,
        contactEmail,
        contactPhone,
        addressLine1,
        addressLine2,
        city,
        postalCode,
        stateProvince,
        notes,
      });
  }, [
    addressLine1,
    addressLine2,
    city,
    contactEmail,
    contactName,
    contactPhone,
    notes,
    postalCode,
    selectedPestId,
    selectedServiceId,
    selectedSlot,
    stateProvince,
    step,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const updateKeyboardState = () => {
      const viewport = window.visualViewport;

      if (!viewport) {
        setKeyboardOpen(false);
        return;
      }

      const heightGap = window.innerHeight - viewport.height;
      setKeyboardOpen(heightGap > 140);
    };

    updateKeyboardState();
    window.visualViewport.addEventListener("resize", updateKeyboardState);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardState);
    };
  }, []);

  const canProceed = canProceedStep(step, {
    selectedServiceId,
    hasSelectedSlot: Boolean(selectedSlot),
    contactName,
    contactEmail,
    contactPhone,
    addressLine1,
    city,
    postalCode,
    stateProvince,
  });
  const isSubmitReady = isBookingSubmitReady({
    selectedServiceId,
    hasSelectedSlot: Boolean(selectedSlot),
    contactName,
    contactEmail,
    contactPhone,
    addressLine1,
    city,
    postalCode,
    stateProvince,
  });

  const coreHiddenFields = buildCoreHiddenFields({
    serviceCatalogItemId: selectedServiceId,
    preferredDate,
    preferredWindow,
    preferredDateTime: selectedSlot?.start ?? "",
    preferredTechnicianId: selectedSlot?.technicianId ?? "",
    notes,
    contactName,
    contactEmail,
    contactPhone,
    addressLine1,
    addressLine2,
    city,
    postalCode,
    stateProvince,
  });

  const contactHiddenFields = buildContactHiddenFields({
    serviceCatalogItemId: selectedServiceId,
    preferredDate,
    preferredWindow,
    preferredDateTime: selectedSlot?.start ?? "",
    preferredTechnicianId: selectedSlot?.technicianId ?? "",
    notes,
    contactName,
    contactEmail,
    contactPhone,
    addressLine1,
    addressLine2,
    city,
    postalCode,
    stateProvince,
  });

  function goNextStep() {
    if (!canProceed) {
      return;
    }

    setStep((current) => nextWizardStep(current, stepLabels.length - 1));
  }

  function goPreviousStep() {
    setStep((current) => previousWizardStep(current));
  }

  function handleSelectableOptionKeyDown(
    index: number,
    total: number,
    event: React.KeyboardEvent<HTMLButtonElement>,
    refs: React.MutableRefObject<Array<HTMLButtonElement | null>>,
    onSelect: (nextIndex: number) => void,
  ) {
    const nextIndex = getNextSlotIndex(index, total, event.key);

    if (nextIndex === -1 || nextIndex === index) {
      return;
    }

    event.preventDefault();
    onSelect(nextIndex);
    refs.current[nextIndex]?.focus();
  }

  async function askAi(prompt: string) {
    setAiLoading(true);
    setAiAnswer("");
    trackEvent("booking_ai_prompt_sent", bookingAiEventPayload);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: aiSessionId || undefined,
          message: prompt,
          context: bookingAiContext,
        }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const data = (await response.json()) as AiChatPayload;
      setAiSessionId(data.sessionId);
      setAiAnswer(data.answer);
      if (typeof window !== "undefined") {
        saveBookingAiHandoff(window.sessionStorage, {
          prompt,
          context: bookingAiContext,
        });
      }
      trackEvent("booking_ai_prompt_answered", bookingAiEventPayload);
    } catch {
      setAiAnswer("AI guidance is temporarily unavailable. You can continue booking and our team will confirm details.");
      trackEvent("booking_ai_prompt_failed", bookingAiEventPayload);
    } finally {
      setAiLoading(false);
    }
  }

  function openFullAssistant() {
    if (typeof window !== "undefined") {
      saveBookingAiHandoff(window.sessionStorage, {
        prompt: aiAnswer || aiPrompts[0],
        context: bookingAiContext,
      });
      window.dispatchEvent(new CustomEvent("extrasure:open-site-chatbot"));
    }

    trackEvent("booking_ai_open_full_assistant", bookingAiEventPayload);
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <aside className="space-y-4 rounded-[1.75rem] border border-[#d7c8ab] bg-[linear-gradient(160deg,#fffaf0_0%,#f6ecd7_58%,#efe2c3_100%)] p-6 shadow-[0_18px_40px_rgba(22,53,38,0.16)]">
        <p className="text-xs uppercase tracking-[0.14em] text-[#5d5a40]">Step {step + 1} of {stepLabels.length}</p>
        <h2 className="font-serif text-3xl text-[#1d2f25]">{contextPanel.title}</h2>
        <p className="text-sm text-[#425247]">{contextPanel.message}</p>
        <ul className="space-y-2 text-sm text-[#2d4135]">
          {contextPanel.bullets.map((bullet) => (
            <li key={bullet} className="rounded-xl border border-[#d8caaf] bg-white/70 px-3 py-2">
              {bullet}
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {trustBadges.slice(0, 4).map((badge) => (
            <p key={badge} className="rounded-full border border-[#c8b58f] bg-[#f8ebce] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5d4a24]">
              {badge}
            </p>
          ))}
        </div>
        <article className="rounded-2xl border border-[#d7c8ac] bg-white/75 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Customer voice</p>
          <p className="mt-2 text-sm text-[#30453a]">&ldquo;{testimonials[0]?.quote}&rdquo;</p>
          <p className="mt-2 text-xs font-semibold text-[#1b2f25]">{testimonials[0]?.name} - {testimonials[0]?.area}</p>
        </article>
      </aside>

      <section className="rounded-[1.75rem] border border-[#dbcdae] bg-[#fffdf6] p-6 pb-24 shadow-[0_14px_34px_rgba(21,45,34,0.12)] sm:p-7 sm:pb-7">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[#5f6e63]">AI-Powered Home Protection Booking</p>
            <p className="text-xs font-semibold text-[#375343]">{stepLabels[step]}</p>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={stepLabels.length}
            aria-valuenow={step + 1}
            aria-label="Booking progress"
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {stepLabels.map((label, index) => (
              <span
                key={label}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  step === index
                    ? "bg-[#163526] text-white"
                    : index < step
                      ? "bg-[#e4f3ea] text-[#1f5537]"
                      : "bg-[#f3ecdb] text-[#5f6e63]"
                }`}
              >
                {index + 1}. {label}
              </span>
            ))}
          </div>
        </div>

        <form id="book-checkout-form" action={startBookingCheckoutAction} className="mt-6 grid gap-4">
          {Object.entries(coreHiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {step !== 3 ? (
            <>
              {Object.entries(contactHiddenFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
            </>
          ) : null}

          {step === 0 ? (
            <div className="space-y-3">
              <h3 className="font-serif text-2xl text-[#1d2f25]">What are you dealing with?</h3>
              <p className="text-sm text-[#556a5f]">
                Select the closest match. Not sure? Continue and we will personalize recommendations.
              </p>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Pest category">
                {pestCategories.map((pest) => {
                  const selected = selectedPestId === pest.id;
                  const index = pestCategories.findIndex((candidate) => candidate.id === pest.id);

                  return (
                    <button
                      key={pest.id}
                      type="button"
                      onClick={() => setSelectedPestId(pest.id)}
                      onKeyDown={(event) => handleSelectableOptionKeyDown(index, pestCategories.length, event, pestButtonRefs, (nextIndex) => setSelectedPestId(pestCategories[nextIndex].id))}
                      ref={(element) => {
                        pestButtonRefs.current[index] = element;
                      }}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-[#163526] bg-[#eff7f1] shadow-[0_8px_20px_rgba(22,53,38,0.14)]"
                          : "border-[#dfd0b3] bg-white hover:border-[#2a5a42] hover:shadow-[0_8px_20px_rgba(22,53,38,0.08)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4e4c2] text-sm font-bold text-[#5f4b25]">
                          {pest.icon}
                        </span>
                        <span className="text-sm font-semibold text-[#1e3026]">{pest.label}</span>
                      </div>
                      <p className="mt-2 text-xs text-[#5d7267]">{pest.note}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-3">
              <h3 className="font-serif text-2xl text-[#1d2f25]">Choose your protection plan</h3>
              <p className="text-sm text-[#556a5f]">Most homeowners choose recurring protection for stronger long-term prevention.</p>
              <div className="space-y-3" role="radiogroup" aria-label="Protection plan">
                {activeItems.map((item, index) => {
                  const selected = selectedServiceId === item.id;
                  const badge = getPlanBadge(item, index);
                  const isFocusable = selected || (!selectedServiceId && index === 0);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedServiceId(item.id)}
                      onKeyDown={(event) => handleSelectableOptionKeyDown(index, activeItems.length, event, planButtonRefs, (nextIndex) => setSelectedServiceId(activeItems[nextIndex].id))}
                      ref={(element) => {
                        planButtonRefs.current[index] = element;
                      }}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={isFocusable ? 0 : -1}
                      className={`block rounded-2xl border p-4 transition ${
                        selected
                          ? "border-[#163526] bg-[#eef8f2] shadow-[0_8px_22px_rgba(22,53,38,0.14)]"
                          : "border-[#e0d2b6] bg-white hover:border-[#2b5b44] hover:shadow-[0_8px_16px_rgba(22,53,38,0.08)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#1e3026]">{item.name}</p>
                          <p className="mt-1 text-xs text-[#5d7267]">{item.description}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.1em] text-[#5a6f63]">
                            {item.kind === "subscription" ? `${item.billingCycle} plan` : "one-time service"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="rounded-full border border-[#ceb98c] bg-[#f9e9c8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5d4a24]">
                            {badge}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-[#1d2f25]">{formatCurrency(item.amount)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <h3 className="font-serif text-2xl text-[#1d2f25]">Choose appointment time</h3>
              <p className="text-sm text-[#556a5f]">Grouped windows help you pick quickly without scanning long slot lists.</p>
              <AvailabilityPicker
                serviceId={selectedServiceId}
                onSlotSelected={setSelectedSlot}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <h3 className="font-serif text-2xl text-[#1d2f25]">Home and contact details</h3>
              <p className="text-sm text-[#556a5f]">We will only use this information for service delivery, reminders, and treatment notes.</p>

              <input
                name="contactName"
                required
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Full name"
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="contactEmail"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="Email"
                  className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
                />
                <input
                  name="contactPhone"
                  required
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="Phone"
                  className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
                />
              </div>

              <input
                name="addressLine1"
                required
                value={addressLine1}
                onChange={(event) => setAddressLine1(event.target.value)}
                placeholder="Service address"
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="addressLine2"
                  value={addressLine2}
                  onChange={(event) => setAddressLine2(event.target.value)}
                  placeholder="Apt / suite (optional)"
                  className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
                />
                <input
                  name="city"
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="City"
                  className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="postalCode"
                  required
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  placeholder="Postal code"
                  className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
                />
                <input
                  name="stateProvince"
                  required
                  value={stateProvince}
                  onChange={(event) => setStateProvince(event.target.value)}
                  placeholder="State / Province"
                  className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
                />
              </div>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Access notes, gate codes, parking tips, or treatment concerns"
                className="min-h-24 rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3">
              <h3 className="font-serif text-2xl text-[#1d2f25]">Review and secure checkout</h3>
              <div className="rounded-2xl border border-[#d8c9ac] bg-[#fff8e8] p-4 text-sm text-[#32453a]">
                <p><span className="font-semibold text-[#1b2f25]">Pest concern:</span> {reviewSummary.pestConcern}</p>
                <p className="mt-1"><span className="font-semibold text-[#1b2f25]">Protection plan:</span> {reviewSummary.protectionPlan}</p>
                <p className="mt-1"><span className="font-semibold text-[#1b2f25]">Appointment:</span> {reviewSummary.appointment}</p>
                <p className="mt-1"><span className="font-semibold text-[#1b2f25]">Estimated total:</span> {reviewSummary.estimatedTotal}</p>
                {reviewSummary.notes ? <p className="mt-1"><span className="font-semibold text-[#1b2f25]">Notes:</span> {reviewSummary.notes}</p> : null}
              </div>
              <p className="rounded-xl border border-[#cddfcf] bg-[#edf8ef] px-3 py-2 text-xs text-[#225338]">
                Secure checkout is powered by Stripe. Apple Pay and Google Pay are available on supported devices.
              </p>
              <label className="flex items-center gap-2 rounded-xl border border-[#e0d2b6] bg-white px-4 py-3 text-sm text-[#33453a]">
                <input
                  name="marketingConsent"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4"
                />
                <span>I agree to receive service updates and special offers from Extrasure via email and SMS</span>
              </label>
            </div>
          ) : null}

          <section className="rounded-2xl border border-[#d8caad] bg-[#fff7e6] p-4" aria-label="AI guidance panel">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#536359]">AI guidance</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {aiPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => askAi(prompt)}
                  disabled={aiLoading}
                  className="rounded-full border border-[#ccb68b] bg-[#f8e7c4] px-3 py-1 text-xs font-semibold text-[#5d4a24] transition hover:bg-[#f2dbad] disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {aiLoading ? <p className="mt-3 text-xs text-[#5d7267]" aria-live="polite">Thinking...</p> : null}
            {aiAnswer ? (
              <div className="mt-3 rounded-xl border border-[#d6c6a5] bg-white px-3 py-2 text-sm text-[#33453a]" aria-live="polite">
                <p>{aiAnswer}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setNotes((current) => (current ? `${current}\n${aiAnswer}` : aiAnswer))}
                    className="text-xs font-semibold text-[#1f5537] underline underline-offset-4"
                  >
                    Add guidance to notes
                  </button>
                  <button
                    type="button"
                    onClick={openFullAssistant}
                    className="text-xs font-semibold text-[#1f5537] underline underline-offset-4"
                  >
                    Open full AI assistant
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {step < stepLabels.length - 1 ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPreviousStep}
                disabled={step === 0}
                className="rounded-full border border-[#c9b488] px-4 py-2 text-sm font-semibold text-[#425247] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNextStep}
                disabled={!canProceed}
                className="rounded-full bg-[#163526] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {primaryCtaLabel}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPreviousStep}
                className="rounded-full border border-[#c9b488] px-4 py-2 text-sm font-semibold text-[#425247]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!isSubmitReady}
                className="rounded-full bg-[#163526] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {primaryCtaLabel}
              </button>
            </div>
          )}
        </form>

        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#d8caac] bg-[#fff9eb]/95 px-4 py-3 backdrop-blur transition sm:hidden ${
            keyboardOpen ? "pointer-events-none translate-y-3 opacity-0" : "translate-y-0 opacity-100"
          }`}
          aria-hidden={keyboardOpen}
        >
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2" role="toolbar" aria-label="Booking actions">
            <button
              type="button"
              onClick={goPreviousStep}
              disabled={step === 0}
              className="rounded-full border border-[#c9b488] px-4 py-2 text-sm font-semibold text-[#425247] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Back
            </button>
            {isFinalStep ? (
              <button
                type="submit"
                form="book-checkout-form"
                disabled={!isSubmitReady}
                className="flex-1 rounded-full bg-[#163526] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {primaryCtaLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNextStep}
                disabled={!canProceed}
                className="flex-1 rounded-full bg-[#163526] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {primaryCtaLabel}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
