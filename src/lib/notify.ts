import { list, put, del } from "@vercel/blob";

const TOKEN_PREFIX = "push-tokens";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

async function readTokens(): Promise<string[]> {
  try {
    const { blobs } = await list({ prefix: TOKEN_PREFIX, limit: 20 });
    if (!blobs.length) return [];

    const sorted = [...blobs].sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    const file = sorted[0];
    if (!file?.url) return [];

    const res = await fetch(file.url, { cache: "no-store" });

    if (!res.ok) return [];

    const json = await res.json();

    const tokens = Array.isArray(json.tokens) ? json.tokens : [];

    return tokens.filter(
      (t: unknown) => typeof t === "string" && t.length > 10
    );
  } catch (err) {
    console.error("[notify] readTokens", err);
    return [];
  }
}

export async function savePushToken(token: string) {
  const clean = String(token || "").trim();

  if (!clean) {
    throw new Error("Token vazio");
  }

  const prev = await readTokens();

  const tokens = [
    clean,
    ...prev.filter((t) => t !== clean),
  ].slice(0, 3);

  try {
    const { blobs } = await list({
      prefix: TOKEN_PREFIX,
      limit: 50,
    });

    await Promise.all(
      blobs.map((b) =>
        del(b.url).catch(() => undefined)
      )
    );
  } catch {
    /* ignore */
  }

  await put(
    `${TOKEN_PREFIX}.json`,
    JSON.stringify({
      tokens,
      updatedAt: new Date().toISOString(),
    }),
    {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: true,
    }
  );

  return tokens;
}

export async function sendPushNotification(
  payload: PushPayload
) {
  try {
    const tokens = await readTokens();

    if (!tokens.length) {
      console.log("[notify] nenhum token registrado");
      return { sent: 0 };
    }

    const messages = tokens.map((to) => ({
      to,

      // Som personalizado de caixa registradora
      sound: "cash-register.wav",

      title: payload.title,
      body: payload.body,
      data: payload.data || {},

      priority: "high" as const,

      // Canal Android com o novo som
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

    const json = await res.json().catch(() => null);

    console.log(
      "[notify] expo response",
      res.status,
      json
    );

    return {
      sent: tokens.length,
      json,
    };
  } catch (err) {
    console.error("[notify] send error", err);

    return {
      sent: 0,
      error: true,
    };
  }
}

export function formatMoneyLabel(valor: unknown) {
  const raw = String(valor ?? "").trim();

  if (!raw) return "R$ —";

  if (raw.includes("R$")) {
    return raw;
  }

  return `R$ ${raw}`;
}