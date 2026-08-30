import { NextRequest, NextResponse } from "next/server";
import { formatMoneyLabel, sendPushNotification } from "@/lib/notify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[infinitepay/webhook]", JSON.stringify(body));

    const status = String(
      body.status || body.payment_status || body.order_status || ""
    ).toLowerCase();

    const paid =
      status.includes("paid") ||
      status.includes("approved") ||
      status.includes("aprov") ||
      status === "captured" ||
      body.paid === true;

    const nome =
      body.customer?.name ||
      body.customer_name ||
      body.nome ||
      "Cliente";

    const valor =
      body.amount ||
      body.value ||
      body.valor ||
      body.order_amount ||
      "";

    let valorLabel = valor;
    if (typeof valor === "number" && valor > 500) {
      valorLabel = (valor / 100).toFixed(2);
    }

    if (paid) {
      await sendPushNotification({
        title: "Venda Aprovada!",
        body: `Valor: ${formatMoneyLabel(valorLabel)}`,
        data: { type: "cartao_aprovado" },
      });

      const webhook = process.env.LEADS_WEBHOOK_URL;
      if (webhook) {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: String(nome),
            email: body.customer?.email || body.email || "",
            telefone: body.customer?.phone || body.phone || "",
            endereco: "",
            frete: "",
            valor:
              typeof valorLabel === "number"
                ? valorLabel.toFixed(2)
                : String(valorLabel),
            status: "pago",
            etapa: 3,
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[infinitepay/webhook] error", err);
    return NextResponse.json({ ok: true });
  }
}
