import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const webhook = process.env.LEADS_WEBHOOK_URL;

    if (!webhook) {
      console.warn("LEADS_WEBHOOK_URL não configurada");
      return NextResponse.json({ success: true, skipped: true });
    }

    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro ao salvar lead:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
