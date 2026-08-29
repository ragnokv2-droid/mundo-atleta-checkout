import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function sha256(value: string) {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

type CapiBody = {
  eventName: string;
  eventId: string;
  value?: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
  email?: string;
  phone?: string;
  name?: string;
  fbp?: string;
  fbc?: string;
  sourceUrl?: string;
  userAgent?: string;
};

export async function POST(req: NextRequest) {
  try {
    const pixelId = process.env.META_PIXEL_ID;
    const token = process.env.META_CAPI_ACCESS_TOKEN;

    if (!pixelId || !token) {
      return NextResponse.json(
        { error: "META_PIXEL_ID ou META_CAPI_ACCESS_TOKEN não configurados" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as CapiBody;

    if (!body.eventName || !body.eventId) {
      return NextResponse.json(
        { error: "eventName e eventId são obrigatórios" },
        { status: 400 }
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const userAgent =
      body.userAgent || req.headers.get("user-agent") || undefined;

    const userData: Record<string, string | string[] | undefined> = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
      fbp: body.fbp || undefined,
      fbc: body.fbc || undefined,
    };

    if (body.email) {
      userData.em = [sha256(body.email)];
    }

    if (body.phone) {
      let phone = onlyDigits(body.phone);
      if (phone && !phone.startsWith("55")) phone = `55${phone}`;
      if (phone) userData.ph = [sha256(phone)];
    }

    if (body.name) {
      const parts = body.name.trim().split(/\s+/);
      if (parts[0]) userData.fn = [sha256(parts[0])];
      if (parts.length > 1) {
        userData.ln = [sha256(parts[parts.length - 1])];
      }
    }

    const customData: Record<string, unknown> = {
      currency: body.currency || "BRL",
    };

    if (typeof body.value === "number") {
      customData.value = body.value;
    }
    if (body.contentName) {
      customData.content_name = body.contentName;
    }
    if (body.contentIds?.length) {
      customData.content_ids = body.contentIds;
      customData.content_type = "product";
    }

    const event = {
      event_name: body.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.eventId,
      event_source_url: body.sourceUrl || undefined,
      action_source: "website",
      user_data: userData,
      custom_data: customData,
    };

    const payload: Record<string, unknown> = {
      data: [event],
    };

    if (process.env.META_TEST_EVENT_CODE) {
      payload.test_event_code = process.env.META_TEST_EVENT_CODE;
    }

    const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${token}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("[CAPI] erro Meta:", json);
      return NextResponse.json(
        { error: "Falha ao enviar evento CAPI", details: json },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, result: json });
  } catch (err) {
    console.error("[CAPI] exception:", err);
    return NextResponse.json({ error: "Erro interno CAPI" }, { status: 500 });
  }
}
