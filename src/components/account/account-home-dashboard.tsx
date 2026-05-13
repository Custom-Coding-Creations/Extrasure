import Link from "next/link";
import { AccountHomeTimeline } from "@/components/account/account-home-timeline";
import {
  DashboardCard,
  IconCalendar,
  IconReceipt,
  IconShield,
  IconWave,
  QuickActionCard,
  StatusBadge,
} from "@/components/account/protection-ui";
import type { AccountHomeIntelligence } from "@/lib/account-home-intelligence";

type AccountHomeDashboardProps = {
  intelligence: AccountHomeIntelligence;
  planLabel: string;
  customerName: string;
  openBalanceLabel: string;
  eventCount: number;
};

function buildTrendPath(points: AccountHomeIntelligence["protectionTrend"]) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 100;
      const y = 100 - point.value;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

function RecommendationTone({ priority }: { priority: AccountHomeIntelligence["recommendations"][number]["priority"] }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
      priority === "High"
        ? "bg-[#f5d1c9] text-[#7c2e23] dark:bg-[#4d2d28] dark:text-[#ffc5bc]"
        : priority === "Medium"
          ? "bg-[#f4e1be] text-[#7a4f16] dark:bg-[#443522] dark:text-[#f7d58f]"
          : "bg-[#d9ead6] text-[#27553d] dark:bg-[#20382c] dark:text-[#bbdfc7]"
    }`}>
      {priority}
    </span>
  );
}

function TrendChart({ points }: { points: AccountHomeIntelligence["protectionTrend"] }) {
  const path = buildTrendPath(points);

  return (
    <div className="rounded-[1.75rem] border border-[#d8cbaf] bg-[linear-gradient(180deg,rgba(255,252,245,0.9),rgba(245,235,214,0.84))] p-4 dark:border-[#4e6852] dark:bg-[linear-gradient(180deg,rgba(30,47,38,0.94),rgba(25,40,32,0.86))]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#667d70] dark:text-[#c7bba0]">Protection confidence trend</p>
          <p className="mt-1 text-sm text-[#385143] dark:text-[#d4c8ad]">Derived from treatment recency, billing continuity, and operational stability.</p>
        </div>
        <StatusBadge tone="info" label="Modeled" />
      </div>
      <div className="mt-4">
        <svg viewBox="0 0 100 100" className="h-44 w-full" aria-label="Protection confidence trend chart" role="img">
          <defs>
            <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d48534" />
              <stop offset="55%" stopColor="#6f9b6e" />
              <stop offset="100%" stopColor="#1e6f42" />
            </linearGradient>
          </defs>
          <path d="M0 84 H100 M0 60 H100 M0 36 H100" stroke="rgba(22,53,38,0.12)" strokeDasharray="2 4" fill="none" />
          <path d={`${path} L100 100 L0 100 Z`} fill="url(#trendArea)" />
          <defs>
            <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(58,126,83,0.22)" />
              <stop offset="100%" stopColor="rgba(58,126,83,0.03)" />
            </linearGradient>
          </defs>
          <path d={path} stroke="url(#trendLine)" strokeWidth="3" fill="none" strokeLinecap="round" />
          {points.map((point, index) => {
            const x = (index / Math.max(1, points.length - 1)) * 100;
            const y = 100 - point.value;

            return (
              <g key={point.label}>
                <circle cx={x} cy={y} r={point.emphasis ? 3.6 : 2.3} fill={point.emphasis ? "#163526" : "#d48534"} />
                <text x={x} y="99" textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} className="fill-[#60776a] text-[5px] font-semibold uppercase tracking-[0.12em] dark:fill-[#ccbfa4]">
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ProtectionDial({ score, tone }: { score: number; tone: AccountHomeIntelligence["protectionTone"] }) {
  const accent = tone === "success" ? "#2f7d4b" : tone === "warning" ? "#d48534" : "#a44838";

  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full" style={{ background: `conic-gradient(${accent} ${score * 3.6}deg, rgba(22,53,38,0.12) 0deg)` }}>
      <div className="absolute inset-[12px] rounded-full bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(246,236,216,0.92))] dark:bg-[linear-gradient(180deg,rgba(24,40,32,0.98),rgba(30,46,38,0.94))]" />
      <div className="relative z-10 text-center">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#61786b] dark:text-[#c5baa0]">Protection</p>
        <p className="mt-2 text-5xl font-semibold text-[#183227] dark:text-[#f0e7d2]">{score}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#60786b] dark:text-[#c5baa0]">Confidence index</p>
      </div>
      <span className="protection-orb absolute left-0 top-5 h-5 w-5 rounded-full bg-[#ecd39f] blur-[2px]" />
      <span className="protection-orb absolute bottom-7 right-1 h-6 w-6 rounded-full bg-[#88b48f] blur-[2px]" />
    </div>
  );
}

function PropertyMap({ intelligence }: { intelligence: AccountHomeIntelligence }) {
  const hotspotCount = intelligence.heatmap.filter((item) => item.level !== "low").length;

  return (
    <DashboardCard title="Protection zones" subtitle="A home-centered view of where attention is concentrated">
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative overflow-hidden rounded-[1.9rem] border border-[#d7cab0] bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.56),transparent_30%),linear-gradient(180deg,#f8f1df,#efe3c3)] p-5 dark:border-[#4c6550] dark:bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,#23392d,#1d3026)]">
          <div className="absolute inset-4 rounded-[1.6rem] border border-dashed border-[#d7bb8c] dark:border-[#6c7b67]" />
          <div className="relative mx-auto mt-6 h-48 w-56 rounded-[2rem] border border-[#d9ccb1] bg-[#fffaf0] shadow-[0_14px_30px_rgba(20,40,30,0.12)] dark:border-[#516b55] dark:bg-[#22382d]">
            <div className="absolute left-1/2 top-6 h-20 w-24 -translate-x-1/2 rounded-2xl border border-[#d7c8aa] bg-[#f2ead5] dark:border-[#58715b] dark:bg-[#2a4335]" />
            <div className="absolute left-7 top-20 h-20 w-16 rounded-2xl border border-[#dccfb4] bg-[#f7efdd] dark:border-[#58715b] dark:bg-[#294134]" />
            <div className="absolute right-7 top-20 h-20 w-16 rounded-2xl border border-[#dccfb4] bg-[#f7efdd] dark:border-[#58715b] dark:bg-[#294134]" />
            <span className="absolute left-5 top-12 flex h-5 w-5 items-center justify-center rounded-full bg-[#d48534] text-[0.6rem] font-bold text-white">1</span>
            <span className="absolute bottom-8 left-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#6b9c74] text-[0.6rem] font-bold text-white">2</span>
            <span className="absolute bottom-12 right-9 flex h-5 w-5 items-center justify-center rounded-full bg-[#a54e3f] text-[0.6rem] font-bold text-white">3</span>
          </div>
          <div className="mt-5 grid gap-2 text-sm text-[#395243] dark:text-[#d6caaf]">
            <p>Hotspots detected: <span className="font-semibold text-[#193226] dark:text-[#f0e7d2]">{hotspotCount}</span></p>
            <p>Primary focus: <span className="font-semibold text-[#193226] dark:text-[#f0e7d2]">foundation edges, shaded perimeter, moisture zones</span></p>
          </div>
        </div>

        <div className="grid gap-3">
          {intelligence.heatmap.slice(0, 3).map((item, index) => (
            <div key={item.id} className="rounded-[1.5rem] border border-[#d9ccb2] bg-[#fffaf1] p-4 dark:border-[#506955] dark:bg-[#22382d]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#677e71] dark:text-[#c8bda1]">Zone {index + 1}</p>
                  <p className="mt-1 text-base font-semibold text-[#193226] dark:text-[#f1e8d3]">{item.label}</p>
                </div>
                <StatusBadge tone={item.level === "high" ? "danger" : item.level === "elevated" ? "warning" : "success"} label={item.level} />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#41594b] dark:text-[#d2c6aa]">{item.rationale}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

export function AccountHomeDashboard({ intelligence, planLabel, customerName, openBalanceLabel, eventCount }: AccountHomeDashboardProps) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="dashboard-atmosphere premium-card animated-entry overflow-hidden rounded-[2rem] p-6 sm:p-7">
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={intelligence.protectionTone} label={intelligence.activeRiskHeadline} />
                  <span className="rounded-full border border-[#d8caad] bg-[rgba(255,250,240,0.72)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#335043] dark:border-[#536d57] dark:bg-[rgba(35,55,44,0.74)] dark:text-[#e0d4bc]">AI home intelligence</span>
                </div>
                <h2 className="mt-4 max-w-2xl text-3xl leading-tight text-[#152b21] dark:text-[#f3ead7] sm:text-4xl">{intelligence.spotlight}</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#365042] dark:text-[#d6caaf]">{intelligence.summary}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Next visit</p>
                  <p className="mt-2 text-xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{intelligence.nextServiceLabel}</p>
                  <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Protection continuity stays strongest when the next treatment remains inside the preferred cadence.</p>
                </div>
                <div className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Coverage streak</p>
                  <p className="mt-2 text-xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{intelligence.continuityMonths} months</p>
                  <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Tasteful retention tracking reinforces continuity without turning the dashboard into a game.</p>
                </div>
                <div className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Trust signal</p>
                  <p className="mt-2 text-xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{intelligence.trustScore}/100</p>
                  <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Billing clarity, visit stability, and operational traceability are being monitored together.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/account/services" className="elevated-action rounded-full bg-[#163526] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f4936]">Review protection visits</Link>
                <Link href="/account/notes" className="elevated-action rounded-full border border-[#d4c6a8] bg-[#fff8ea] px-5 py-3 text-sm font-semibold text-[#173126] hover:bg-[#f3e8d2] dark:border-[#4d6650] dark:bg-[#20352b] dark:text-[#f0e5cf]">Open AI guidance</Link>
              </div>
            </div>

            <div className="grid gap-4">
              <ProtectionDial score={intelligence.protectionScore} tone={intelligence.protectionTone} />
              <div className="rounded-[1.75rem] border border-[#d9ccb1] bg-[rgba(255,252,244,0.76)] p-4 dark:border-[#4e6852] dark:bg-[rgba(30,47,38,0.84)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[#687f72] dark:text-[#c7bca1]">AI summary engine</p>
                <p className="mt-3 text-lg font-semibold text-[#163126] dark:text-[#f1e8d3]">{customerName}, your {planLabel.toLowerCase()} plan is being actively monitored.</p>
                <p className="mt-3 text-sm leading-6 text-[#425b4c] dark:text-[#d4c8ac]">The system is prioritizing service continuity, billing clarity, and seasonal risk moderation so your home stays inside a dependable protection envelope.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <DashboardCard title="Recommended next moves" subtitle="Action-oriented guidance ranked by urgency and confidence">
            <div className="grid gap-3">
              {intelligence.recommendations.map((recommendation) => (
                <article key={recommendation.id} className="rounded-[1.6rem] border border-[#d8cbb0] bg-[#fffaf0] p-4 dark:border-[#4d6651] dark:bg-[#22382d]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <RecommendationTone priority={recommendation.priority} />
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#667d70] dark:text-[#c6bba0]">{recommendation.confidenceLabel}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-[#1a3327] dark:text-[#f1e8d3]">{recommendation.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#41594b] dark:text-[#d3c7ab]">{recommendation.detail}</p>
                  <Link href={recommendation.href} className="mt-4 inline-flex rounded-full border border-[#d4c6a8] bg-[#fff4de] px-4 py-2 text-sm font-semibold text-[#193226] hover:bg-[#f1e1c1] dark:border-[#506955] dark:bg-[#2b4134] dark:text-[#efe4ce]">
                    {recommendation.actionLabel}
                  </Link>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Protection health" subtitle="A compact view of momentum, billing posture, and operational confidence">
            <TrendChart points={intelligence.protectionTrend} />
          </DashboardCard>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardCard title="Pest pressure heatmap" subtitle="AI-informed activity modeling based on season, cadence, and property signals">
          <div className="grid gap-3 sm:grid-cols-5">
            {intelligence.heatmap.map((item) => (
              <div key={item.id} className="group rounded-[1.55rem] border border-[#d9ccb1] bg-[#fffaf0] p-4 dark:border-[#506955] dark:bg-[#22382d]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#183126] dark:text-[#f1e8d3]">{item.shortLabel}</p>
                  <span className={`h-3 w-3 rounded-full ${item.level === "high" ? "bg-[#b35a48]" : item.level === "elevated" ? "bg-[#d7923b]" : "bg-[#5a8d61]"}`} />
                </div>
                <div className="mt-4 h-28 rounded-[1.2rem] bg-[linear-gradient(180deg,#f6ecd7,#efe1bf)] p-2 dark:bg-[linear-gradient(180deg,#2a4032,#1f3228)]">
                  <div className="flex h-full items-end rounded-[1rem] bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.45),transparent_38%)] p-2">
                    <div className="w-full rounded-[0.8rem] bg-[linear-gradient(180deg,rgba(27,67,47,0.15),rgba(27,67,47,0.05))]" style={{ height: `${item.score}%` }} />
                  </div>
                </div>
                <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#6a8174] dark:text-[#c5baa0]">{item.level}</p>
                <p className="mt-1 text-xs leading-5 text-[#475f51] dark:text-[#d0c4a8]">{item.rationale}</p>
              </div>
            ))}
          </div>
        </DashboardCard>

        <PropertyMap intelligence={intelligence} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardCard title="Operational timeline" subtitle="A live protection feed across visits, billing, support, and AI reviews" ctaHref="/account/activity" ctaLabel="Open full timeline">
          <AccountHomeTimeline filters={intelligence.timeline.filters} items={intelligence.timeline.items} />
        </DashboardCard>

        <section className="grid gap-4">
          <DashboardCard title="Trust and safety" subtitle="Operational proof points that reinforce reliability and care">
            <div className="grid gap-3">
              <article className="rounded-[1.5rem] border border-[#d9ccb2] bg-[#fffaf0] p-4 dark:border-[#506955] dark:bg-[#22382d]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#687f72] dark:text-[#c7bca1]">Technician accountability</p>
                <p className="mt-2 text-base font-semibold text-[#183126] dark:text-[#f1e8d3]">Documented visit history and treatment context</p>
                <p className="mt-2 text-sm leading-6 text-[#425b4c] dark:text-[#d2c6aa]">Every completed service, billing update, and support note can be reconstructed from the customer timeline.</p>
              </article>
              <article className="rounded-[1.5rem] border border-[#d9ccb2] bg-[#fffaf0] p-4 dark:border-[#506955] dark:bg-[#22382d]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#687f72] dark:text-[#c7bca1]">EPA-aligned protocol</p>
                <p className="mt-2 text-base font-semibold text-[#183126] dark:text-[#f1e8d3]">Family and pet preparation guidance remains visible before each visit</p>
                <p className="mt-2 text-sm leading-6 text-[#425b4c] dark:text-[#d2c6aa]">Safety expectations are embedded into the service flow rather than buried inside static portal content.</p>
              </article>
              <article className="rounded-[1.5rem] border border-[#d9ccb2] bg-[#fffaf0] p-4 dark:border-[#506955] dark:bg-[#22382d]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#687f72] dark:text-[#c7bca1]">Platform continuity</p>
                <p className="mt-2 text-base font-semibold text-[#183126] dark:text-[#f1e8d3]">{eventCount} logged account events and {openBalanceLabel} open balance visibility</p>
                <p className="mt-2 text-sm leading-6 text-[#425b4c] dark:text-[#d2c6aa]">Protection operations, service cadence, and billing state are surfaced together so interruptions are harder to miss.</p>
              </article>
            </div>
          </DashboardCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <QuickActionCard
              href="/account/services"
              eyebrow="Home protection"
              title="Visit operations"
              description="Track next treatments, service outcomes, and perimeter readiness from one place."
              icon={<IconShield />}
            />
            <QuickActionCard
              href="/account/activity"
              eyebrow="Protection timeline"
              title="Operational feed"
              description={`${eventCount} live events across service, billing, support, and AI monitoring.`}
              icon={<IconCalendar />}
            />
            <QuickActionCard
              href="/account/billing"
              eyebrow="Protection plan"
              title={planLabel}
              description={`Open balance visibility: ${openBalanceLabel}. Keep plan continuity and payments aligned.`}
              icon={<IconReceipt />}
            />
            <QuickActionCard
              href="/account/notes"
              eyebrow="AI guidance"
              title="Property intelligence"
              description="Ask what to watch for this month, how to prepare, or how to reduce outdoor pest pressure."
              icon={<IconWave />}
            />
          </div>
        </section>
      </section>
    </div>
  );
}