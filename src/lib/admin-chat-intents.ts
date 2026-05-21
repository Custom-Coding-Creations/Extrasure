import type { AiLanguage } from "@/lib/ai-policy";

export type AdminMetrics = {
  totalCustomers: number;
  totalTechnicians: number;
  totalJobs: number;
  totalInvoices: number;
  openInvoices: number;
  succeededPaymentsLast30: number;
  paidInvoicesLast30: number;
  revenueLast30: number;
};

type ResolveArgs = {
  message: string;
  language: AiLanguage;
  metrics: AdminMetrics;
};

function normalizeIntentInput(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveAdminDirectAnswer(args: ResolveArgs) {
  const input = normalizeIntentInput(args.message);
  const isSpanish = args.language === "es";

  if (/\b(host|hosted|hosting|where.*website.*host|where.*site.*host|alojado|alojada|donde.*sitio|donde.*web)\b/i.test(input)) {
    return isSpanish
      ? "Este sitio web esta alojado en Vercel. Administra despliegues, logs, variables de entorno y dominios en https://vercel.com/dashboard."
      : "This website is hosted on Vercel. Manage deployments, logs, environment variables, and domains in the Vercel dashboard at https://vercel.com/dashboard.";
  }

  if (/\b(how many|total).*(customer|customers|client|clients)\b/i.test(input)) {
    return isSpanish
      ? `Actualmente tienes ${args.metrics.totalCustomers} clientes en el sistema.`
      : `You currently have ${args.metrics.totalCustomers} customers in the system.`;
  }

  if (/\b(how much|revenue|money|sales).*(last month|last 30 days|this month)\b/i.test(input)) {
    const revenue = (args.metrics.revenueLast30 / 100).toFixed(2);
    return isSpanish
      ? `En los ultimos 30 dias, los pagos exitosos suman $${revenue}.`
      : `In the last 30 days, succeeded payments total $${revenue}.`;
  }

  if (/\b(create|make).*(estimate|quote)\b/i.test(input)) {
    return isSpanish
      ? "Para crear un estimado: 1) Ve a /admin/estimates. 2) Clic en Create/New Estimate. 3) Selecciona el cliente. 4) Agrega servicios y precios. 5) Guarda y envia para aprobacion."
      : "To create an estimate: 1) Go to /admin/estimates. 2) Click Create/New Estimate. 3) Select the customer. 4) Add services and pricing. 5) Save and send for approval.";
  }

  if (/(\b(sign in|signin|login|log in|auth|authentication).*(problem|issue|wrong|fail|failing|troubleshoot))|(\btroubleshoot.*(sign in|signin|login|log in)\b)/i.test(input)) {
    return isSpanish
      ? "Pasos para diagnosticar inicio de sesion: 1) Verifica ADMIN_AUTH_SECRET en Vercel. 2) Confirma callback URLs de Google/Microsoft OAuth. 3) Revisa estado de las apps OAuth. 4) Prueba login por credenciales de owner para aislar OAuth. 5) Revisa logs de Vercel Functions para errores de auth."
      : "Sign-in troubleshooting steps: 1) Verify ADMIN_AUTH_SECRET in Vercel. 2) Confirm Google/Microsoft OAuth callback URLs. 3) Check OAuth app status. 4) Test owner credential login to isolate OAuth issues. 5) Review Vercel Function logs for auth errors.";
  }

  if (/(\b(google cloud).*(username|password|credential|login))|(\b(find|where).*(google cloud).*(username|password|credential)\b)/i.test(input)) {
    return isSpanish
      ? "No puedo mostrar credenciales en chat. Para credenciales de Google Cloud, abre el vault en Admin Manual y luego verifica configuracion en https://console.cloud.google.com."
      : "I cannot reveal credentials in chat. For Google Cloud credentials, open the credential vault in Admin Manual, then verify settings in https://console.cloud.google.com.";
  }

  if (/(\b(create|make).*(invoice))|(\binvoice.*(susan edwards|customer|where do i go|where to go)\b)/i.test(input)) {
    return isSpanish
      ? "Para crear una factura: 1) Ve a /admin/invoices. 2) Clic en Create/New Invoice. 3) Busca y selecciona el cliente (ejemplo: Susan Edwards). 4) Agrega line items, monto y fecha de vencimiento. 5) Emite la factura."
      : "To create an invoice: 1) Go to /admin/invoices. 2) Click Create/New Invoice. 3) Search and select the customer (for example Susan Edwards). 4) Add line items, amount, and due date. 5) Issue the invoice.";
  }

  if (/(\b(dns|domain|nameserver).*(problem|issue|fix|managed|problema|falla|error|arreglo|solucion|gestionado))|(\bwhere.*dns.*managed\b)|(\bdonde.*dns.*(gestionado|arreglo|solucion)\b)/i.test(input)) {
    return isSpanish
      ? "Tu DNS esta gestionado en Vercel Domains. Revisa en Vercel Dashboard > Project > Domains. Verifica nameservers, registros DNS y SSL. Si hay outage, confirma que el dominio apunta al proyecto correcto."
      : "Your DNS is managed in Vercel Domains. Check Vercel Dashboard > Project > Domains. Verify nameservers, DNS records, and SSL. If there is an outage, confirm the domain points to the correct project.";
  }

  if (/\b(environment variable|env var|env vars|environment variables|where.*env|change.*env)\b/i.test(input)) {
    return isSpanish
      ? "Las variables de entorno se administran en Vercel: Project > Settings > Environment Variables. Despues de cambios, vuelve a desplegar o promueve un nuevo deployment para aplicar los valores."
      : "Environment variables are managed in Vercel at Project > Settings > Environment Variables. After changes, redeploy or promote a new deployment so values take effect.";
  }

  if (/\b(deployment logs?|build logs?|function logs?|where.*logs?|check.*logs?|vercel logs?)\b/i.test(input)) {
    return isSpanish
      ? "Para logs de despliegue y funciones: Vercel Dashboard > tu proyecto > Deployments (build logs) y Functions (runtime logs). Empieza con el primer error y su timestamp."
      : "For deployment and function logs: Vercel Dashboard > your project > Deployments (build logs) and Functions (runtime logs). Start with the first error and timestamp.";
  }

  if (/(\b(stripe).*(rotate|key|api key|secret key))|(\b(rotate|change).*(stripe).*(key|keys)\b)/i.test(input)) {
    return isSpanish
      ? "Para rotar claves de Stripe: 1) Abre Stripe Dashboard > Developers > API keys. 2) Crea nueva clave restringida o secreta segun necesidad. 3) Actualiza STRIPE_SECRET_KEY en Vercel Environment Variables. 4) Vuelve a desplegar. 5) Verifica webhooks y cobros de prueba antes de revocar la clave anterior."
      : "To rotate Stripe keys: 1) Open Stripe Dashboard > Developers > API keys. 2) Create the new restricted or secret key as needed. 3) Update STRIPE_SECRET_KEY in Vercel Environment Variables. 4) Redeploy. 5) Verify webhooks and test charges before revoking the old key.";
  }

  if (/(\b(stripe).*(webhooks?).*(replay|retry|failed|fail))|(\b(replay|retry).*(webhooks?)\b)/i.test(input)) {
    return isSpanish
      ? "Para reintentar webhooks de Stripe: 1) Stripe Dashboard > Developers > Webhooks > endpoint de produccion. 2) Filtra eventos fallidos. 3) Abre el evento y usa Replay. 4) Confirma que la factura/pago se reconcilie en Admin > Payments/Invoicing. 5) Si vuelve a fallar, valida STRIPE_WEBHOOK_SECRET y URL del endpoint."
      : "To replay Stripe webhooks: 1) Stripe Dashboard > Developers > Webhooks > production endpoint. 2) Filter failed events. 3) Open the event and click Replay. 4) Confirm invoice/payment reconciliation in Admin > Payments/Invoicing. 5) If it fails again, validate STRIPE_WEBHOOK_SECRET and endpoint URL.";
  }

  if (/(\b(github).*(rollback|revert|bad deploy|bad merge))|(\b(rollback|revert).*(deploy|deployment|merge|commit|bad deploy|bad merge)\b)|(\b(bad deploy|bad merge).*(rollback|revert)\b)/i.test(input)) {
    return isSpanish
      ? "Para rollback por cambio defectuoso: 1) Identifica el merge/commit en GitHub. 2) En Vercel, promueve el ultimo deployment estable o redeploy del commit sano. 3) Si aplica, crea PR de revert en GitHub para mantener historial limpio. 4) Verifica salud en /admin y rutas criticas."
      : "For rollback after a bad change: 1) Identify the merge/commit in GitHub. 2) In Vercel, promote the last stable deployment or redeploy the known-good commit. 3) If needed, open a revert PR in GitHub to keep history consistent. 4) Verify health in /admin and critical routes.";
  }

  if (/(\b(database|postgres|prisma).*(down|issue|error|cannot connect|can't connect|p1001|connectivity))|(\btroubleshoot.*(database|postgres|prisma)\b)/i.test(input)) {
    return isSpanish
      ? "Para diagnostico de base de datos: 1) Verifica DATABASE_URL en Vercel. 2) Confirma acceso de red/SSL al host Postgres. 3) Revisa errores Prisma en logs (ejemplo P1001). 4) Valida schema y cliente Prisma sincronizados. 5) Si hay drift de migraciones, corrige schema y vuelve a desplegar."
      : "For database troubleshooting: 1) Verify DATABASE_URL in Vercel. 2) Confirm network/SSL access to the Postgres host. 3) Check Prisma errors in logs (for example P1001). 4) Ensure Prisma schema and generated client are in sync. 5) If migrations drifted, reconcile schema and redeploy.";
  }

  return null;
}
