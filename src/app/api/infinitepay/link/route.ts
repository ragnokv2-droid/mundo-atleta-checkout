import { NextRequest, NextResponse } from "next/server";
import { PRODUCT } from "@/lib/product";

const DEFAULT_CARD_PRICE_CENTS = 10990;

function normalizeAmount(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return DEFAULT_CARD_PRICE_CENTS;
  }

  const cents = Math.round(amount);

  if (cents < DEFAULT_CARD_PRICE_CENTS) {
    return DEFAULT_CARD_PRICE_CENTS;
  }

  return cents;
}

export async function POST(req: NextRequest) {
  try {
    const rawHandle = process.env.INFINITEPAY_HANDLE;

    if (!rawHandle) {
      return NextResponse.json(
        { error: "INFINITEPAY_HANDLE não configurado" },
        { status: 500 }
      );
    }

    const handle = rawHandle.trim().replace(/^\$/, "");

    if (!handle) {
      return NextResponse.json(
        { error: "INFINITEPAY_HANDLE inválido" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { customer, address, shipping, amount } = body;

    if (!customer?.name || !customer?.email) {
      return NextResponse.json(
        { error: "Dados do cliente incompletos" },
        { status: 400 }
      );
    }

    const totalCents = normalizeAmount(amount);
    const shippingCents = Math.max(
      0,
      totalCents - DEFAULT_CARD_PRICE_CENTS
    );

    const orderNsu = `card-${Date.now()}`;

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      req.headers.get("origin")?.replace(/\/$/, "") ||
      "https://mundo-atleta-checkout.vercel.app";

    // Payload enxuto conforme a documentação oficial da InfinitePay.
    // Dados de cliente/endereço são opcionais e foram removidos daqui
    // para evitar "Invalid checkout link params" por algum campo inválido.
    const payload = {
      handle,
      order_nsu: orderNsu,
      redirect_url: `${origin}/pagamento-ok`,
      webhook_url: `${origin}/api/infinitepay/webhook`,
      items: [
        {
          quantity: 1,
          price: totalCents,
          description: PRODUCT.name || "Aparelho Abdominal AB Tomic",
        },
      ],
    };

    console.log("[infinitepay/link] payload", JSON.stringify(payload));

    const res = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const rawResponse = await res.text();

    let json: Record<string, unknown> = {};

    try {
      json = rawResponse ? JSON.parse(rawResponse) : {};
    } catch {
      json = {};
    }

    if (!res.ok) {
      console.error("[infinitepay/link] InfinitePay error", {
        status: res.status,
        response: rawResponse,
        payload,
      });

      const apiMessage =
        typeof json.message === "string"
          ? json.message
          : typeof json.error === "string"
          ? json.error
          : rawResponse || "Falha ao criar link InfinitePay";

      return NextResponse.json(
        {
          error: apiMessage,
          infinitePayStatus: res.status,
        },
        { status: 502 }
      );
    }

    const checkoutUrl =
      typeof json.url === "string"
        ? json.url
        : typeof json.checkout_url === "string"
        ? json.checkout_url
        : "";

    if (!checkoutUrl) {
      console.error("[infinitepay/link] URL não retornada", {
        response: rawResponse,
        payload,
      });

      return NextResponse.json(
        {
          error: "A InfinitePay não retornou o link de pagamento",
        },
        { status: 502 }
      );
    }

    // Registra o lead somente depois que o link foi criado com sucesso.
    await fetch(`${origin}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: customer.name,
        email: customer.email,
        telefone: customer.cellphone || "",
        endereco: address
          ? `${address.street || ""}, ${address.number || ""} - ${
              address.neighborhood || ""
            }, ${address.city || ""}/${address.state || ""} - CEP ${
              address.zipCode || ""
            }`
          : "",
        frete: shipping || "",
        valor: (totalCents / 100).toFixed(2),
        status: "aguardando_cartao",
        etapa: 3,
      }),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      url: checkoutUrl,
      orderNsu,
      totalCents,
      shippingCents,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro inesperado";

    console.error("[infinitepay/link]", err);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
