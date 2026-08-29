"use server";

import { NextRequest, NextResponse } from "next/server";
import { PRODUCT } from "@/lib/product";

const CARD_PRICE_CENTS = 10990; // R$ 109,90

function parseShippingCents(shipping: unknown): number {
if (shipping === null || shipping === undefined) {
return 0;
}

const value = String(shipping).trim().toLowerCase();

if (!value) {
return 0;
}

// Frete grátis
if (
value === "grátis" ||
value === "gratis" ||
value === "grátis" ||
value === "frete grátis" ||
value === "frete gratis" ||
value === "0" ||
value === "0,00" ||
value === "r$ 0,00"
) {
return 0;
}

// Extrai somente números do valor recebido.
// Exemplos:
// "R$ 8,40" -> 840
// "8,40" -> 840
// "8.40" -> 840
const cleaned = value
.replace(/r$/g, "")
.replace(/\s/g, "")
.replace(/./g, "")
.replace(",", ".")
.replace(/[^\d.-]/g, "");

const parsed = Number(cleaned);

if (!Number.isFinite(parsed) || parsed <= 0) {
return 0;
}

return Math.round(parsed * 100);
}

export async function POST(req: NextRequest) {
try {
const rawHandle = process.env.INFINITEPAY_HANDLE;

```
if (!rawHandle) {
  return NextResponse.json(
    { error: "INFINITEPAY_HANDLE não configurado" },
    { status: 500 }
  );
}

// A InfinitePay espera a handle sem o símbolo "$".
const handle = rawHandle.trim().replace(/^\$/, "");

const body = await req.json();

const { customer, address, shipping } = body;

if (!customer?.name || !customer?.email) {
  return NextResponse.json(
    { error: "Dados do cliente incompletos" },
    { status: 400 }
  );
}

const shippingCents = parseShippingCents(shipping);
const totalCents = CARD_PRICE_CENTS + shippingCents;

const orderNsu = `card_${Date.now()}_${Math.random()
  .toString(36)
  .slice(2, 10)}`;

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
      price: totalCents,
      description:
        PRODUCT.name || "Aparelho Abdominal AB Tomic",
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
    valor: (totalCents / 100).toFixed(2).replace(".", ","),
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (res.ok && (json.url || json.checkout_url)) {
      return NextResponse.json({
        success: true,
        url: json.url || json.checkout_url,
        orderNsu,
        totalCents,
      });
    }

    lastError =
      json.message ||
      json.error ||
      JSON.stringify(json);
  } catch (e) {
    lastError =
      e instanceof Error ? e.message : String(e);
  }
}

return NextResponse.json(
  { error: lastError },
  { status: 502 }
);
```

} catch (err: unknown) {
const message =
err instanceof Error
? err.message
: "Erro inesperado";

```
console.error("[infinitepay/link]", err);

return NextResponse.json(
  { error: message },
  { status: 500 }
);
```

}
}
