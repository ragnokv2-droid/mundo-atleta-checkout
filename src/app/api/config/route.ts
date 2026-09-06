import { NextRequest, NextResponse } from "next/server";
import { put, head, del, list } from "@vercel/blob";

export type CheckoutConfig = {
  purchaseOnPixGenerate: boolean;
  cardEnabled: boolean;
};

const DEFAULT_CONFIG: CheckoutConfig = {
  purchaseOnPixGenerate: false,
  cardEnabled: false,
};

const CONFIG_PATH = "checkout-config.json";
const LEGACY_PREFIX = "checkout-config";

/**
 * Salva sempre no MESMO arquivo.
 *
 * Não usamos mais sufixo aleatório.
 * Antes de gravar, apagamos o arquivo anterior.
 * del() é gratuito no Vercel Blob.
 */
async function writeConfig(config: CheckoutConfig) {
  try {
    await del(CONFIG_PATH).catch(() => undefined);

    const blob = await put(
      CONFIG_PATH,
      JSON.stringify(config, null, 2),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      }
    );

    console.log("[config] config salva:", blob.url);

    return blob;
  } catch (err) {
    console.error("[config] writeConfig error:", err);
    throw err;
  }
}

/**
 * Migração automática da estrutura antiga.
 *
 * Essa função usa list() UMA VEZ apenas caso ainda
 * não exista checkout-config.json.
 *
 * Depois que migrar, nunca mais será necessária.
 */
async function migrateLegacyConfig(): Promise<CheckoutConfig | null> {
  try {
    console.log("[config] procurando configuração antiga para migrar...");

    const { blobs } = await list({
      prefix: LEGACY_PREFIX,
      limit: 50,
    });

    if (!blobs.length) {
      console.log("[config] nenhuma configuração antiga encontrada");
      return null;
    }

    const legacyBlobs = blobs
      .filter((blob) => blob.pathname !== CONFIG_PATH)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() -
          new Date(a.uploadedAt).getTime()
      );

    const latest = legacyBlobs[0];

    if (!latest?.url) {
      return null;
    }

    const response = await fetch(latest.url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();

    const config: CheckoutConfig = {
      purchaseOnPixGenerate: Boolean(
        json.purchaseOnPixGenerate
      ),
      cardEnabled: Boolean(json.cardEnabled),
    };

    // Cria o novo arquivo fixo
    await writeConfig(config);

    // Remove os arquivos antigos
    await Promise.all(
      legacyBlobs.map((blob) =>
        del(blob.url).catch((err) => {
          console.warn(
            "[config] não foi possível apagar blob antigo:",
            blob.pathname,
            err
          );
        })
      )
    );

    console.log("[config] migração concluída");

    return config;
  } catch (err) {
    console.error("[config] migrateLegacyConfig error:", err);
    return null;
  }
}

/**
 * Leitura normal.
 *
 * head() = Simple Operation.
 * NÃO usa list() nas consultas normais.
 */
async function readConfig(): Promise<CheckoutConfig> {
  try {
    let blob;

    try {
      blob = await head(CONFIG_PATH);
    } catch {
      blob = null;
    }

    /**
     * Se ainda não existe o arquivo novo,
     * tenta migrar automaticamente o formato antigo.
     */
    if (!blob?.url) {
      const migrated = await migrateLegacyConfig();

      if (migrated) {
        return migrated;
      }

      return DEFAULT_CONFIG;
    }

    const res = await fetch(blob.url, {
      cache: "no-store",
    });

    if (!res.ok) {
      return DEFAULT_CONFIG;
    }

    const json = await res.json();

    return {
      purchaseOnPixGenerate: Boolean(
        json.purchaseOnPixGenerate
      ),
      cardEnabled: Boolean(json.cardEnabled),
    };
  } catch (err) {
    console.error("[config] readConfig error:", err);
    return DEFAULT_CONFIG;
  }
}

/**
 * Público
 *
 * O checkout consulta essa rota.
 */
export async function GET() {
  const config = await readConfig();

  return NextResponse.json({
    ok: true,
    config,
  });
}

/**
 * Salvar configuração.
 *
 * Exige senha do dashboard.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const password = body.password;
    const expected =
      process.env.DASHBOARD_PASSWORD || "mundoatleta";

    if (password !== expected) {
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
        typeof body.purchaseOnPixGenerate === "boolean"
          ? body.purchaseOnPixGenerate
          : current.purchaseOnPixGenerate,

      cardEnabled:
        typeof body.cardEnabled === "boolean"
          ? body.cardEnabled
          : current.cardEnabled,
    };

    await writeConfig(next);

    return NextResponse.json({
      ok: true,
      config: next,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro desconhecido ao salvar config";

    console.error("[config] POST error:", err);

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
