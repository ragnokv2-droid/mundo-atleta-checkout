import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

export type CheckoutConfig = {
  logoUrl: string;
  bannerText: string;
  bannerBgColor: string;
  bannerTextColor: string;
  primaryColor: string;
  primaryHover: string;
};

const DEFAULT_CONFIG: CheckoutConfig = {
  logoUrl: "",
  bannerText: "PIX ou Cartão — envio prioritário",
  bannerBgColor: "#0f172a",
  bannerTextColor: "#ffffff",
  primaryColor: "#0d9488",
  primaryHover: "#0f766e",
};

const CONFIG_PATH = "checkout-config.json";

async function readConfig(): Promise<CheckoutConfig> {
  try {
    const { blobs } = await list({ prefix: CONFIG_PATH, limit: 1 });
    const file = blobs.find((b) => b.pathname === CONFIG_PATH);
    if (!file?.url) return DEFAULT_CONFIG;

    const res = await fetch(file.url, { cache: "no-store" });
    if (!res.ok) return DEFAULT_CONFIG;
    const json = await res.json();
    return { ...DEFAULT_CONFIG, ...json };
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function writeConfig(config: CheckoutConfig) {
  await put(CONFIG_PATH, JSON.stringify(config, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/** Público — checkout lê sem senha */
export async function GET() {
  const config = await readConfig();
  return NextResponse.json({ ok: true, config });
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

    const current = await readConfig();
    const next: CheckoutConfig = {
      logoUrl: String(body.logoUrl ?? current.logoUrl ?? ""),
      bannerText: String(body.bannerText ?? current.bannerText),
      bannerBgColor: String(body.bannerBgColor ?? current.bannerBgColor),
      bannerTextColor: String(body.bannerTextColor ?? current.bannerTextColor),
      primaryColor: String(body.primaryColor ?? current.primaryColor),
      primaryHover: String(body.primaryHover ?? current.primaryHover),
    };

    await writeConfig(next);
    return NextResponse.json({ ok: true, config: next });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar config" }, { status: 500 });
  }
}
