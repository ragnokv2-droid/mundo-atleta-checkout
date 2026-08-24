import { NextRequest, NextResponse } from "next/server";
import { generatePixBrCode } from "@/lib/pix";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amountCents = Number(body.amount) || 10440; // R$ 104,40
    const amountReais = amountCents / 100;

    // Sua chave PIX (CNPJ)
    const brCode = generatePixBrCode({
      key: "66372751000147",
      name: "MUNDO ATLETA", // ajuste se o nome no banco for outro
      city: "SAO PAULO", // ajuste para a cidade da sua empresa
      amount: amountReais,
      txid: `PED${Date.now().toString().slice(-8)}`,
    });

    // Gera a imagem do QR Code em base64
    const brCodeBase64 = await QRCode.toDataURL(brCode, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 300,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: `pix_static_${Date.now()}`,
        amount: amountCents,
        status: "PENDING",
        brCode,
        brCodeBase64,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    });
  } catch (err) {
    console.error("Erro ao gerar PIX:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao gerar QR Code PIX" },
      { status: 500 }
    );
  }
}
