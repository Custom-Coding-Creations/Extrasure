export type Service = {
  slug: string;
  name: string;
  summary: string;
  signs: string[];
  process: string[];
  startingAt: string;
};

export const company = {
  name: "ExtraSure Pest Control",
  city: "Syracuse, NY",
  phoneDisplay: "(516) 943-2318",
  phoneHref: "tel:+15169432318",
  smsHref: "sms:+15169432318",
  email: "help@extrasurepest.com",
  emergencyPolicy: "Extended evening response available for urgent pest issues.",
  hours: [
    "Mon-Fri: 8:00 AM - 6:00 PM",
    "Sat: 9:00 AM - 2:00 PM",
    "Sun: Closed",
  ],
  ctaPrimary: "Call Now",
  ctaSecondary: "Request Free Inspection",
};

export const trustBadges = [
  "Licensed & Insured",
  "Satisfaction Guarantee",
  "Top-Rated Syracuse Team",
  "Certified Technicians",
  "Pet & Child-Safe Treatment Options",
];

export const services: Service[] = [
  {
    slug: "general-pest-prevention",
    name: "General Pest Prevention",
    summary: "Year-round protection plans that keep common pests out before they become infestations.",
    signs: ["Recurring sightings", "Droppings in storage areas", "Entry points around doors/windows"],
    process: ["Inspection and risk mapping", "Barrier treatment", "Follow-up monitoring"],
    startingAt: "$49/mo",
  },
  {
    slug: "ant-control",
    name: "Ant Control",
    summary: "Targeted ant treatment for kitchens, foundations, and nest activity around your property.",
    signs: ["Ant trails", "Winged ants indoors", "Mounds near walkways"],
    process: ["Species identification", "Nest disruption", "Perimeter defense"],
    startingAt: "$179",
  },
  {
    slug: "rodent-control",
    name: "Rodent Control",
    summary: "Fast rodent removal with exclusion work to prevent repeat entry.",
    signs: ["Gnaw marks", "Noises in walls/attic", "Droppings"],
    process: ["Entry-point seal-up", "Trap and monitor", "Sanitation guidance"],
    startingAt: "$199",
  },
  {
    slug: "bed-bug-treatment",
    name: "Bed Bug Treatment",
    summary: "Discreet, room-by-room treatment plans to eliminate bed bugs and eggs.",
    signs: ["Bites in lines", "Rust-colored spots on sheets", "Live bugs near mattress seams"],
    process: ["Detailed inspection", "Targeted treatment", "Recheck and prevention"],
    startingAt: "$349",
  },
  {
    slug: "termite-treatment",
    name: "Termite Treatment",
    summary: "Protect structural integrity with advanced termite control and prevention.",
    signs: ["Mud tubes", "Hollow-sounding wood", "Discarded wings"],
    process: ["Damage-risk assessment", "Treatment barrier", "Ongoing monitoring"],
    startingAt: "$699",
  },
  {
    slug: "mosquito-tick-treatments",
    name: "Mosquito & Tick Treatments",
    summary: "Seasonal yard treatments for safer outdoor living in Central New York.",
    signs: ["High backyard activity", "Tick-prone brush lines", "Standing water zones"],
    process: ["Yard assessment", "Targeted application", "Scheduled retreatments"],
    startingAt: "$89/visit",
  },
  {
    slug: "wildlife-exclusion",
    name: "Wildlife Exclusion",
    summary: "Humane removal and sealing plans for squirrels, raccoons, and nuisance wildlife.",
    signs: ["Noises in attic", "Exterior damage", "Nesting debris"],
    process: ["Entry analysis", "Safe removal", "Exclusion repairs"],
    startingAt: "$249",
  },
  {
    slug: "commercial-pest-management",
    name: "Commercial Pest Management",
    summary: "Documentation-ready service programs for offices, restaurants, and facilities.",
    signs: ["Audit concerns", "Repeat pest pressure", "Sanitation vulnerabilities"],
    process: ["Site protocol setup", "Routine service", "Reporting and compliance support"],
    startingAt: "Custom",
  },
];

export const serviceAreas = [
  "Syracuse",
  "Liverpool",
  "Baldwinsville",
  "Clay",
  "North Syracuse",
  "Fayetteville",
  "Manlius",
  "Camillus",
  "East Syracuse",
  "DeWitt",
  "Cicero",
  "Skaneateles",
];

export const testimonials = [
  {
    name: "Megan R.",
    area: "Syracuse",
    quote: "They were at our house the same day and explained every step in plain language.",
  },
  {
    name: "Paul T.",
    area: "Liverpool",
    quote: "Professional team, fair pricing, and no more rodent noise in the attic.",
  },
  {
    name: "Lena K.",
    area: "Camillus",
    quote: "Our technician was kind, punctual, and great with our kids and pets in the home.",
  },
];

export const faqs = [
  {
    question: "How quickly can you come out?",
    answer: "We offer same-day appointments when available and extended evening response for urgent issues.",
  },
  {
    question: "Are treatments safe for pets and children?",
    answer: "Yes. We use EPA-guided products and treatment plans with clear safety instructions for every home.",
  },
  {
    question: "Do you service both homes and businesses?",
    answer: "Yes. We handle residential and commercial properties across Syracuse and surrounding communities.",
  },
];
