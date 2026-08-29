import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";

export type MetaSettings = {
  /** true = Purchase ao gerar PIX | false = só ao marcar pago */
  purchaseOnPix: boolean;
};

const DEFAULT: MetaSettings = {
  purchaseOnPix: false,
};

const PREFIX = "meta-settings";

async function readSettings(): Promise<MetaSettings> {
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 20 });
    if (!blobs.length) return DEFAULT;

    const sorted = [...blobs].sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    const file = sorted[0];
    if (!file?.url) return DEFAULT;

    const res = await fetch(file.url, { cache: "no-store" });
    if (!res.ok) return DEFAULT;
    const json = await res.json();
    return { ...DEFAULT, ...json };
  } catch {
    return DEFAULT;
  }
}

async function writeSettings(settings: MetaSettings) {
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 50 });
    await Promise.all(
      blobs.map((b) => del(b.url).catch(() => {}))
    );
  } catch {
    // ignore
  }

  await put(`${PREFIX}.json`, JSON.stringify(settings, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: true,
  });
}

/** Público — checkout lê sem senha */
export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({ ok: true, settings });
}

/** Salvar — exige senha do dashboard */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = body.password;
    const expected = process.env.DASHBOARD_PASSWORD || "mundoatleta";

    if (password !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const settings: MetaSettings = {
      purchaseOnPix: Boolean(body.purchaseOnPix),
    };

    await writeSettings(settings);
    return NextResponse.json({ ok: true, settings });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro ao salvar settings";
    console.error("[meta/settings]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
