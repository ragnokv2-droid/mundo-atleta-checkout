import { NextRequest, NextResponse } from "next/server";

export type CheckoutConfig = {
  purchaseOnPixGenerate: boolean;
  cardEnabled: boolean;
};

const DEFAULT_CONFIG: CheckoutConfig = {
  purchaseOnPixGenerate: false,
  cardEnabled: false,
};

function getWebhook() {
  return process.env.LEADS_WEBHOOK_URL;
}


/**
 * Lê configuração direto do Apps Script.
 *
 * Não usa Vercel Blob.
 */
async function readConfig(): Promise<CheckoutConfig> {
  try {
    const webhook = getWebhook();

    if (!webhook) {
      console.error(
        "[config] LEADS_WEBHOOK_URL não configurada"
      );

      return DEFAULT_CONFIG;
    }

    const separator = webhook.includes("?") ? "&" : "?";

    const url =
      `${webhook}${separator}action=get_config`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        "[config] Apps Script respondeu:",
        res.status
      );

      return DEFAULT_CONFIG;
    }

    const json = await res.json();

    if (!json?.ok || !json?.config) {
      console.error(
        "[config] resposta inválida:",
        json
      );

      return DEFAULT_CONFIG;
    }

    return {
      purchaseOnPixGenerate:
        json.config.purchaseOnPixGenerate === true,

      cardEnabled:
        json.config.cardEnabled === true,
    };

  } catch (error) {

    console.error(
      "[config] readConfig:",
      error
    );

    return DEFAULT_CONFIG;
  }
}


/**
 * Salva configuração no Apps Script.
 */
async function writeConfig(
  config: CheckoutConfig
): Promise<CheckoutConfig> {

  const webhook = getWebhook();

  if (!webhook) {
    throw new Error(
      "LEADS_WEBHOOK_URL não configurada"
    );
  }

  const res = await fetch(webhook, {
    method: "POST",

    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },

    body: JSON.stringify({
      action: "set_config",

      purchaseOnPixGenerate:
        config.purchaseOnPixGenerate,

      cardEnabled:
        config.cardEnabled,
    }),

    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json?.ok) {
    console.error(
      "[config] erro Apps Script:",
      json
    );

    throw new Error(
      json?.error ||
      "Erro ao salvar configuração"
    );
  }

  return {
    purchaseOnPixGenerate:
      json.config?.purchaseOnPixGenerate === true,

    cardEnabled:
      json.config?.cardEnabled === true,
  };
}


/**
 * Público.
 * Checkout consulta essa rota.
 */
export async function GET() {

  const config = await readConfig();

  return NextResponse.json(
    {
      ok: true,
      config,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    }
  );
}


/**
 * Dashboard salva as configurações.
 */
export async function POST(
  req: NextRequest
) {
  try {

    const body = await req.json();

    const expected =
      process.env.DASHBOARD_PASSWORD ||
      "mundoatleta";

    if (body.password !== expected) {

      return NextResponse.json(
        {
          error: "Não autorizado",
        },
        {
          status: 401,
        }
      );
    }

    const current = await readConfig();

    const next: CheckoutConfig = {

      purchaseOnPixGenerate:
        typeof body.purchaseOnPixGenerate ===
        "boolean"
          ? body.purchaseOnPixGenerate
          : current.purchaseOnPixGenerate,

      cardEnabled:
        typeof body.cardEnabled ===
        "boolean"
          ? body.cardEnabled
          : current.cardEnabled,
    };

    const saved =
      await writeConfig(next);

    return NextResponse.json({
      ok: true,
      config: saved,
    });

  } catch (error) {

    console.error(
      "[config] POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao salvar configuração",
      },
      {
        status: 500,
      }
    );
  }
}
