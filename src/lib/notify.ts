export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function getWebhook() {
  return process.env.LEADS_WEBHOOK_URL;
}

/**
 * Lê os tokens de push pelo Google Apps Script.
 * Não usa Vercel Blob.
 */
async function readTokens(): Promise<string[]> {
  try {
    const webhook = getWebhook();

    if (!webhook) {
      console.error(
        "[notify] LEADS_WEBHOOK_URL não configurada"
      );

      return [];
    }

    const separator = webhook.includes("?") ? "&" : "?";

    const url =
      `${webhook}${separator}action=get_push_tokens`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        "[notify] erro ao consultar tokens:",
        res.status
      );

      return [];
    }

    const json = await res.json();

    if (!json?.ok || !Array.isArray(json?.tokens)) {
      console.error(
        "[notify] resposta inválida dos tokens:",
        json
      );

      return [];
    }

    return json.tokens.filter(
      (token: unknown) =>
        typeof token === "string" &&
        token.trim().length > 10
    );
  } catch (err) {
    console.error(
      "[notify] readTokens error:",
      err
    );

    return [];
  }
}

/**
 * Salva tokens no Google Apps Script.
 */
async function writeTokens(tokens: string[]) {
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
      action: "set_push_tokens",
      tokens,
    }),

    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json?.ok) {
    console.error(
      "[notify] erro ao salvar tokens:",
      json
    );

    throw new Error(
      json?.error ||
        "Erro ao salvar push token"
    );
  }

  return Array.isArray(json.tokens)
    ? json.tokens
    : tokens;
}

/**
 * Registra token enviado pelo APK.
 */
export async function savePushToken(
  token: string
) {
  const clean = String(token || "").trim();

  if (!clean) {
    throw new Error("Token vazio");
  }

  const prev = await readTokens();

  /**
   * Evita duplicados.
   * Mantém até 3 dispositivos.
   */
  const tokens = [
    clean,
    ...prev.filter((t) => t !== clean),
  ].slice(0, 3);

  await writeTokens(tokens);

  console.log(
    "[notify] token registrado. Total:",
    tokens.length
  );

  return tokens;
}

/**
 * Envia notificação via Expo Push.
 */
export async function sendPushNotification(
  payload: PushPayload
) {
  try {
    const tokens = await readTokens();

    if (!tokens.length) {
      console.log(
        "[notify] nenhum token registrado"
      );

      return {
        sent: 0,
      };
    }

    const messages = tokens.map((to) => ({
      to,

      sound: "cash_register.wav",

      title: payload.title,
      body: payload.body,

      data: payload.data || {},

      priority: "high" as const,

      channelId: "orders-v2",
    }));

    const res = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",

        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },

        body: JSON.stringify(messages),
      }
    );

    const json = await res
      .json()
      .catch(() => null);

    console.log(
      "[notify] Expo response:",
      res.status,
      json
    );

    if (!res.ok) {
      return {
        sent: 0,
        error: true,
        json,
      };
    }

    return {
      sent: tokens.length,
      json,
    };
  } catch (err) {
    console.error(
      "[notify] send error:",
      err
    );

    return {
      sent: 0,
      error: true,
    };
  }
}

/**
 * Formata valor para notificação.
 */
export function formatMoneyLabel(
  valor: unknown
) {
  const raw = String(valor ?? "").trim();

  if (!raw) {
    return "R$ —";
  }

  if (raw.includes("R$")) {
    return raw;
  }

  return `R$ ${raw}`;
}
