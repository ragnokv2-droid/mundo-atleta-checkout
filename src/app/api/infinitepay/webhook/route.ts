import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[infinitepay/webhook]", body);

    const orderNsu = body.order_nsu || "";
    const paidAmount = body.paid_amount ?? body.amount ?? 10990;
    const valueReais =
      typeof paidAmount === "number" ? paidAmount / 100 : 109.9;

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://mundo-atleta-checkout.vercel.app";

    // Marca como pago na planilha (novo registro pago)
    await fetch(`${origin}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: body.customer_name || body.name || "Cliente cartão",
        email: body.customer_email || body.email || "",
        telefone: body.customer_phone || body.phone || "",
        endereco: "",
        frete: orderNsu,
        valor: valueReais.toFixed(2),
        status: "pago",
        etapa: 3,
      }),
    }).catch((e) => console.error("[webhook] leads error", e));

    // CAPI Purchase
    const eventId = `card_${orderNsu || Date.now()}`;
    await fetch(`${origin}/api/meta/capi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "Purchase",
        eventId,
        value: valueReais,
        currency: "BRL",
        contentName: "Aparelho Abdominal AB Tomic",
        contentIds: ["ab-tomic"],
        email: body.customer_email || body.email,
        phone: body.customer_phone || body.phone,
        name: body.customer_name || body.name,
      }),
    }).catch((e) => console.error("[webhook] capi error", e));

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[infinitepay/webhook] error", err);
    // InfinitePay retenta se 400; em dúvida responda 200 para não loop infinito
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
