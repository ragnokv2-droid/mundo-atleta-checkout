import { list, put, del, head } from "@vercel/blob";

const TOKEN_PATH = "push-tokens.json";
const LEGACY_TOKEN_PREFIX = "push-tokens";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

/**
 * Grava os tokens em um único arquivo fixo.
 */
async function writeTokens(tokens: string[]) {
  try {
    await del(TOKEN_PATH).catch(() => undefined);

    const blob = await put(
      TOKEN_PATH,
      JSON.stringify(
        {
          tokens,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      }
    );

    console.log("[notify] tokens salvos:", blob.url);

    return blob;
  } catch (err) {
    console.error("[notify] writeTokens error:", err);
    throw err;
  }
}

/**
 * Migra automaticamente o arquivo antigo.
 *
 * list() só será usado enquanto o novo
 * push-tokens.json ainda não existir.
 */
async function migrateLegacyTokens(): Promise<string[]> {
  try {
    console.log("[notify] procurando tokens antigos...");

    const { blobs } = await list({
      prefix: LEGACY_TOKEN_PREFIX,
      limit: 50,
    });

    if (!blobs.length) {
      return [];
    }

    const legacyBlobs = blobs
      .filter((blob) => blob.pathname !== TOKEN_PATH)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() -
          new Date(a.uploadedAt).getTime()
      );

    const latest = legacyBlobs[0];

    if (!latest?.url) {
      return [];
    }

    const response = await fetch(latest.url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const json = await response.json();

    const tokens = Array.isArray(json.tokens)
      ? json.tokens.filter(
          (token: unknown) =>
            typeof token === "string" &&
            token.length > 10
        )
      : [];

    if (tokens.length) {
      await writeTokens(tokens);
    }

    // Remove blobs antigos
    await Promise.all(
      legacyBlobs.map((blob) =>
        del(blob.url).catch(() => undefined)
      )
    );

    console.log(
      "[notify] migração concluída:",
      tokens.length,
      "tokens"
    );

    return tokens;
  } catch (err) {
    console.error(
      "[notify] migrateLegacyTokens error:",
      err
    );

    return [];
  }
}

/**
 * Lê os tokens.
 *
 * Agora usa head() ao invés de list().
 */
async function readTokens(): Promise<string[]> {
  try {
    let blob;

    try {
      blob = await head(TOKEN_PATH);
    } catch {
      blob = null;
    }

    /**
     * Primeira execução após a atualização:
     * migra automaticamente o arquivo antigo.
     */
    if (!blob?.url) {
      return await migrateLegacyTokens();
    }

    const res = await fetch(blob.url, {
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();

    const tokens = Array.isArray(json.tokens)
      ? json.tokens
      : [];

    return tokens.filter(
      (token: unknown) =>
        typeof token === "string" &&
        token.length > 10
    );
  } catch (err) {
    console.error("[notify] readTokens error:", err);

    return [];
  }
}

/**
 * Salva token do aplicativo.
 */
export async function savePushToken(token: string) {
  const clean = String(token || "").trim();

  if (!clean) {
    throw new Error("Token vazio");
  }

  const prev = await readTokens();

  /**
   * Mantém até 3 dispositivos.
   * Também evita token duplicado.
   */
  const tokens = [
    clean,
    ...prev.filter((t) => t !== clean),
  ].slice(0, 3);

  await writeTokens(tokens);

  return tokens;
}

/**
 * Envia notificação para os dispositivos.
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

      // Som personalizado de caixa registradora
      sound: "cash_register.wav",

      title: payload.title,
      body: payload.body,
      data: payload.data || {},

      priority: "high" as const,

      // Canal Android
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

/**
 * Formatação do valor exibido
 * na notificação.
 */
export function formatMoneyLabel(valor: unknown) {
  const raw = String(valor ?? "").trim();

  if (!raw) {
    return "R$ —";
  }

  if (raw.includes("R$")) {
    return raw;
  }

  return `R$ ${raw}`;
}
