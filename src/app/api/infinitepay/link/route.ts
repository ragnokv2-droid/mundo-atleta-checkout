import { NextRequest, NextResponse } from "next/server";
import { PRODUCT } from "@/lib/product";

const CARD_PRICE_CENTS = 10990; // R$ 109,90

function parseShippingCents(shipping: unknown): number {
if (shipping === null || shipping === undefined) {
return 0;
}

if (typeof shipping === "number") {
if (!Number.isFinite(shipping) || shipping <= 0) {
return 0;
}

```
// 8.4 = R$ 8,40
// 840 = 840 centavos
if (shipping < 100) {
  return Math.round(shipping * 100);
}

return Math.round(shipping);
```

}

const raw = String(shipping).trim().toLowerCase();

if (!raw) {
return 0;
}

if (
raw.includes("grátis") ||
raw.includes("gratis") ||
raw === "0" ||
raw === "0,00" ||
raw === "r$ 0,00"
) {
return 0;
}

const cleaned = raw
.replace(/r$/g, "")
.replace(/\s/g, "")
.replace(/[^\d,.-]/g, "");

if (!cleaned) {
return 0;
}

let value: number;

if (cleaned.includes(",") && cleaned.includes(".")) {
value = Number(
cleaned
.replace(/./g, "")
.replace(",", ".")
);
} else if (cleaned.includes(",")) {
value = Number(cleaned.replace(",", "."));
} else {
value = Number(cleaned);
}

if (!Number.isFinite(value) || value <= 0) {
return 0;
}

return Math.round(value * 100);
}

function normalizePhone(phone: unknown): string | undefined {
if (!phone) {
return undefined;
}

const digits = String(phone).replace(/\D/g, "");

if (!digits) {
return undefined;
}

if (digits.startsWith("55")) {
return `+${digits}`;
}

return `+55${digits}`;
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
    description:
      PRODUCT.name || "Aparelho Abdominal AB Tomic",
  },
];

if (shippingCents > 0) {
  items.push({
    quantity: 1,
    price: shippingCents,
    description: "Frete",
  });
}

const customerPayload: Record<string, string> = {
  name: String(customer.name).trim(),
  email: String(customer.email).trim(),
};

const phone = normalizePhone(customer.cellphone);

if (phone) {
  customerPayload.phone_number = phone;
}

const payload: Record<string, unknown> = {
  handle,
  order_nsu: orderNsu,
  redirect_url: `${origin}/pagamento-ok`,
  webhook_url: `${origin}/api/infinitepay/webhook`,
  items,
  customer: customerPayload,
};

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
      addressPayload.complement = String(
        address.complement
      ).trim();
    }

    payload.address = addressPayload;
  }
}

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

const res = await fetch(
  "https://api.checkout.infinitepay.io/links",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }
);

const json = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("[infinitepay/link] InfinitePay error", {
    status: res.status,
    response: json,
    orderNsu,
    totalCents,
    shippingCents,
  });

  return NextResponse.json(
    {
      error:
        json?.message ||
        json?.error ||
        "Falha ao criar link InfinitePay",
      details: json,
    },
    { status: 502 }
  );
}

const checkoutUrl =
  json?.url ||
  json?.checkout_url;

if (!checkoutUrl) {
  console.error(
    "[infinitepay/link] URL não retornada",
    json
  );

  return NextResponse.json(
    {
      error:
        "A InfinitePay não retornou o link de pagamento",
      details: json,
    },
    { status: 502 }
  );
}

return NextResponse.json({
  success: true,
  url: checkoutUrl,
  orderNsu,
  totalCents,
  shippingCents,
});
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
