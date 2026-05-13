import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/audit-log";
import { requireCustomerApiSession } from "@/lib/customer-auth";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { isTriageEnabled } from "@/lib/triage-runtime";

const MAX_FILES = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(request: NextRequest) {
  if (!isTriageEnabled()) {
    return NextResponse.json({ error: "Triage is temporarily unavailable" }, { status: 503 });
  }

  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = checkRateLimit(`${getRequestIp(request)}:${session.customerId}:api:ai:triage:upload`, 15, 60_000);

  if (!rateLimitResult.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart payload" }, { status: 400 });
  }

  const fileEntries = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!fileEntries.length) {
    return NextResponse.json({ error: "At least one image file is required" }, { status: 400 });
  }

  if (fileEntries.length > MAX_FILES) {
    return NextResponse.json({ error: `Too many files. Maximum ${MAX_FILES} images allowed.` }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob uploads are not configured" }, { status: 503 });
  }

  const uploaded = [] as Array<{ url: string; pathname: string; contentType: string; size: number }>;

  for (const file of fileEntries) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type || "unknown"}` }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 });
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "jpg";
    const safeExtension = extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
    const pathname = `triage/${session.customerId}/${Date.now()}-${randomUUID()}.${safeExtension}`;
    const upload = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    uploaded.push({
      url: upload.url,
      pathname: upload.pathname,
      contentType: file.type,
      size: file.size,
    });
  }

  await recordAuditEvent({
    actor: session.email,
    role: "customer",
    action: "triage_photo_uploaded",
    entity: "triage_upload",
    entityId: `${session.customerId}:${Date.now()}`,
    after: {
      count: uploaded.length,
      paths: uploaded.map((item) => item.pathname),
    },
  });

  return NextResponse.json({
    ok: true,
    customerId: session.customerId,
    files: uploaded,
  });
}