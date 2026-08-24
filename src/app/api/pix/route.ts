import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, customer, metadata } = body;

    if (!amount || amount < 100) {
      return NextResponse.json(
        { success: false, error: "Valor inválido" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ABACATEPAY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Chave da AbacatePay não configurada. Defina ABACATEPAY_API_KEY no .env",
        },
        { status: 500 }
      );
    }

    const payload = {
      method: "PIX",
      data: {
        amount: Number(amount),
        expiresIn: 1800, // 30 minutos
        description: "Aparelho Abdominal AB Tomic - Mundo Atleta",
        customer: customer
          ? {
              name: customer.name,
              email: customer.email,
              taxId: customer.taxId,
              cellphone: customer.cellphone,
            }
          : undefined,
        metadata: metadata || {},
      },
    };

    const response = await fetch(
      "https://api.abacatepay.com/v2/transparents/create",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok || result.error || result.success === false) {
  console.error("AbacatePay error completo:", JSON.stringify(result, null, 2));
  return NextResponse.json(
    {
      success: false,
      error:
        result.error ||
        result.message ||
        (typeof result === "object" ? JSON.stringify(result) : "Erro ao criar cobrança PIX"),
      details: result,
    },
    { status: response.status || 400 }
  );
}

    return NextResponse.json({
      success: true,
      data: {
        id: result.data.id,
        amount: result.data.amount,
        status: result.data.status,
        brCode: result.data.brCode,
        brCodeBase64: result.data.brCodeBase64,
        expiresAt: result.data.expiresAt,
      },
    });
  } catch (err) {
    console.error("API /pix error:", err);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
