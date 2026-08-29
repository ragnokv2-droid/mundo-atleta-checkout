import { NextRequest, NextResponse } from "next/server";
import { PRODUCT } from "@/lib/product";

const CARD_PRICE_CENTS = 10990; // R$ 109,90

function parseShippingCents(shipping: unknown): number {
if (shipping === null || shipping === undefined) {
return 0;
}

if (typeof shipping === "number") {
if (!Number.isFinite(shipping) || shipping <= 0) return 0;

```
// Se vier como 8.4, trata como R$ 8,40.
// Se vier como 840, trata como centavos.
return shipping < 100 ? Math.round(shipping * 100) : Math.round(shipping);
```

}

const raw = String(shipping).trim();

if (!raw) return 0;

// Remove tudo que não seja número, vírgula ou ponto.
const cleaned = raw.replace(/[^\d.,-]/g, "");

if (!cleaned) return 0;

let value = 0;

if (cleaned.includes(",") && cleaned.includes(".")) {
// Ex.: 1.234,56
value = Number(cleaned.replace(/./g, "").replace(",", "."));
} else if (cleaned.includes(",")) {
// Ex.: 8,40
value = Number(cleaned.replace(",", "."));
} else {
// Ex.: 8.40 ou 8
value = Number(cleaned);
}

if (!Number.isFinite(value) || value <= 0) {
return 0;
}

return Math.round(value * 100);
}

function formatBRLFromCents(cents: number) {
return (cents / 100).toLocaleString("pt-BR", {
minimumFractionDigits: 2,
maximumFractionDigits: 2,
});
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

// A InfinitePay informa que a handle deve ser enviada sem o símbolo "$".
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

const items: Array<{
  quantity: number;
  price: number;
  description: string;
}> = [
  {
    quantity: 1,
    price: CARD_PRICE_CENTS,
    description: PRODUCT.name || "Aparelho Abdominal AB Tomic",
  },
];

// Só adiciona o frete como item quando houver frete pago.
if (shippingCents > 0) {
  items.push({
    quantity: 1,
    price: shippingCents,
    description: "Frete",
  });
}

const payload: Record<string, unknown> = {
  handle,
  order_nsu: orderNsu,
  redirect_url: `${origin}/pagamento-ok`,
  webhook_url: `${origin}/api/infinitepay/webhook`,
  items,
};

// Dados do cliente.
const customerPayload: Record<string, string> = {
  name: String(customer.name).trim(),
  email: String(customer.email).trim(),
};

if (customer.cellphone) {
  const phoneDigits = String(customer.cellphone).replace(/\D/g, "");

  if (phoneDigits) {
    const phoneWithCountry =
      phoneDigits.startsWith("55")
        ? `+${phoneDigits}`
        : `+55${phoneDigits}`;

    customerPayload.phone_number = phoneWithCountry;
  }
}

payload.customer = customerPayload;

// Endereço.
// A documentação da InfinitePay aceita CEP, rua, bairro,
// número e complemento.
if (address?.zipCode) {
  const cep = String(address.zipCode).replace(/\D/g, "");

  if (cep) {
    const addressPayload: Record<string, string> = {
      cep,
      street: String(address.street || "").trim(),
      neighborhood: String(address.neighborhood || "").trim(),
      number: String(address.number || "").trim(),
    };

    if (address.complement) {
      addressPayload.complement = String(address.complement).trim();
    }

    payload.address = addressPayload;
  }
}

// Lead: aguardando cartão.
await fetch(`${origin}/api/leads`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
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
    frete:
      shippingCents > 0
        ? `R$ ${formatBRLFromCents(shippingCents)}`
        : "Grátis",
    valor: formatBRLFromCents(totalCents),
    status: "aguardando_cartao",
    etapa: 3,
  }),
}).catch(() => {});

console.log("[infinitepay/link] Criando checkout:", {
  orderNsu,
  totalCents,
  shippingCents,
  items,
});

// Endpoint oficial do Checkout Integrado InfinitePay.
const res = await fetch("https://api.checkout.infinitepay.io/links", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const json = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("[infinitepay/link] Erro da InfinitePay:", {
    status: res.status,
    response: json,
    payload,
  });

  const errorMessage =
    json?.message ||
    json?.error ||
    "Erro ao criar link de pagamento na InfinitePay";

  return NextResponse.json(
    {
      error: errorMessage,
      details: json,
    },
    { status: 502 }
  );
}

const checkoutUrl = json?.url || json?.checkout_url;

if (!checkoutUrl) {
  console.error(
    "[infinitepay/link] InfinitePay não retornou URL:",
    json
  );

  return NextResponse.json(
    {
      error: "A InfinitePay não retornou um link de checkout.",
      details: json,
    },
    { status: 502 }
  );
}

return NextResponse.json({
  success: true,
  url: checkoutUrl,
  orderNsu,
  amount: totalCents,
  shipping: shippingCents,
});
```

} catch (err: unknown) {
const message =
err instanceof Error ? err.message : "Erro inesperado";

```
console.error("[infinitepay/link]", err);

return NextResponse.json(
  { error: message },
  { status: 500 }
);
```

}
}
