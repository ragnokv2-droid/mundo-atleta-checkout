import { NextRequest, NextResponse } from "next/server";
import { PRODUCT } from "@/lib/product";

const CARD_PRICE_CENTS = 10990; // R$ 109,90

export async function POST(req: NextRequest) {
  try {
    const handle = process.env.INFINITEPAY_HANDLE;
    if (!handle) {
      return NextResponse.json(
        { error: "INFINITEPAY_HANDLE não configurado" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { customer, address, shipping } = body;

    if (!customer?.name || !customer?.email) {
      return NextResponse.json(
        { error: "Dados do cliente incompletos" },
        { status: 400 }
      );
    }

    const orderNsu = `card_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://mundo-atleta-checkout.vercel.app";

    const payload: Record<string, unknown> = {
      handle,
      order_nsu: orderNsu,
      redirect_url: `${origin}/pagamento-ok`,
      webhook_url: `${origin}/api/infinitepay/webhook`,
      items: [
        {
          quantity: 1,
          price: CARD_PRICE_CENTS,
          description: PRODUCT.name || "Aparelho Abdominal AB Tomic",
        },
      ],
      customer: {
        name: customer.name,
        email: customer.email,
        phone_number: customer.cellphone
          ? `+55${String(customer.cellphone).replace(/\D/g, "")}`
          : undefined,
      },
    };

    if (address?.zipCode) {
      payload.address = {
        cep: String(address.zipCode).replace(/\D/g, ""),
        street: address.street || "",
        neighborhood: address.neighborhood || "",
        number: address.number || "",
        complement: address.complement || "",
      };
    }

    // Lead: aguardando cartão
    await fetch(`${origin}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: customer.name,
        email: customer.email,
        telefone: customer.cellphone || "",
        endereco: address
          ? `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state} - CEP ${address.zipCode}`
          : "",
        frete: shipping || orderNsu,
        valor: "109.90",
        status: "aguardando_cartao",
        etapa: 3,
      }),
    }).catch(() => {});

    const endpoints = [
      "https://api.checkout.infinitepay.io/links",
      "https://api.infinitepay.io/invoices/public/checkout/links",
    ];

    let lastError = "Falha ao criar link InfinitePay";
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();

        if (res.ok && (json.url || json.checkout_url)) {
          return NextResponse.json({
            success: true,
            url: json.url || json.checkout_url,
            orderNsu,
          });
        }
        lastError = json.message || json.error || JSON.stringify(json);
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }

    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    console.error("[infinitepay/link]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
