import { NextRequest, NextResponse } from "next/server";
import { ParamBuilder } from "capi-param-builder-nodejs";

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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const pixelId = process.env.META_PIXEL_ID;
    const token = process.env.META_CAPI_ACCESS_TOKEN;

    if (!pixelId || !token) {
      return NextResponse.json(
        {
          error:
            "META_PIXEL_ID ou META_CAPI_ACCESS_TOKEN não configurados",
        },
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

    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp =
      forwardedFor?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const userAgent =
      body.userAgent ||
      req.headers.get("user-agent") ||
      undefined;

    const host =
      req.headers.get("host") ||
      new URL(req.url).hostname;

    const referer =
      req.headers.get("referer") ||
      undefined;

    const queryParams: Record<string, string> = {};

    try {
      const requestUrl = new URL(body.sourceUrl || req.url);

      requestUrl.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
    } catch {
      // ignora URL inválida
    }

    const cookies: Record<string, string> = {};

    req.cookies.getAll().forEach((cookie) => {
      cookies[cookie.name] = cookie.value;
    });

    const builder = new ParamBuilder();

    try {
      builder.processRequest(
        host,
        queryParams,
        cookies,
        referer,
        forwardedFor || null,
        clientIp || null
      );
    } catch (error) {
      console.warn(
        "[CAPI] Parameter Builder processRequest falhou, usando fallback:",
        error
      );
    }

    const builderFbp = builder.getFbp?.() || undefined;
    const builderFbc = builder.getFbc?.() || undefined;
    const builderIp =
      builder.getClientIpAddress?.() || undefined;

    const userData: Record<
      string,
      string | string[] | undefined
    > = {
      client_ip_address:
        builderIp || clientIp,
      client_user_agent: userAgent,

      // mantém prioridade para os cookies já capturados no navegador
      fbp:
        body.fbp ||
        builderFbp ||
        cookies["_fbp"] ||
        undefined,

      fbc:
        body.fbc ||
        builderFbc ||
        cookies["_fbc"] ||
        undefined,
    };

    if (body.email) {
      try {
        const hashedEmail =
          builder.getNormalizedAndHashedPII(
            body.email,
            "email"
          );

        if (hashedEmail) {
          userData.em = [hashedEmail];
        }
      } catch (error) {
        console.warn(
          "[CAPI] Falha ao processar email:",
          error
        );
      }
    }

    if (body.phone) {
      try {
        let phone = onlyDigits(body.phone);

        if (phone && !phone.startsWith("55")) {
          phone = `55${phone}`;
        }

        if (phone) {
          const hashedPhone =
            builder.getNormalizedAndHashedPII(
              phone,
              "phone"
            );

          if (hashedPhone) {
            userData.ph = [hashedPhone];
          }
        }
      } catch (error) {
        console.warn(
          "[CAPI] Falha ao processar telefone:",
          error
        );
      }
    }

    if (body.name) {
      const parts = body.name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (parts[0]) {
        try {
          const hashedFirstName =
            builder.getNormalizedAndHashedPII(
              parts[0],
              "first_name"
            );

          if (hashedFirstName) {
            userData.fn = [hashedFirstName];
          }
        } catch (error) {
          console.warn(
            "[CAPI] Falha ao processar primeiro nome:",
            error
          );
        }
      }

      if (parts.length > 1) {
        try {
          const lastName =
            parts[parts.length - 1];

          const hashedLastName =
            builder.getNormalizedAndHashedPII(
              lastName,
              "last_name"
            );

          if (hashedLastName) {
            userData.ln = [hashedLastName];
          }
        } catch (error) {
          console.warn(
            "[CAPI] Falha ao processar sobrenome:",
            error
          );
        }
      }
    }

    const customData: Record<string, unknown> = {
      currency: body.currency || "BRL",
    };

    if (typeof body.value === "number") {
      customData.value = body.value;
    }

    if (body.contentName) {
      customData.content_name =
        body.contentName;
    }

    if (body.contentIds?.length) {
      customData.content_ids =
        body.contentIds;
      customData.content_type = "product";
    }

    const event: Record<string, unknown> = {
      event_name: body.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.eventId,

      event_source_url:
        body.sourceUrl || undefined,

      action_source: "website",
      user_data: userData,
      custom_data: customData,
    };

    const referrerUrl =
      builder.getReferrerUrl?.();

    if (referrerUrl) {
      event.referrer_url = referrerUrl;
    }

    const payload: Record<
      string,
      unknown
    > = {
      data: [event],
    };

    if (
      process.env.META_TEST_EVENT_CODE
    ) {
      payload.test_event_code =
        process.env.META_TEST_EVENT_CODE;
    }

    const url =
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(
        token
      )}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error(
        "[CAPI] erro Meta:",
        json
      );

      return NextResponse.json(
        {
          error:
            "Falha ao enviar evento CAPI",
          details: json,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      result: json,
    });
  } catch (err) {
    console.error(
      "[CAPI] exception:",
      err
    );

    return NextResponse.json(
      { error: "Erro interno CAPI" },
      { status: 500 }
    );
  }
}
