import { NextRequest, NextResponse } from "next/server";
import { savePushToken } from "@/lib/notify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = body.password;
    const token = body.token;
    const expected = process.env.DASHBOARD_PASSWORD || "mundoatleta";

    if (password !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    await savePushToken(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications/register]", err);
    return NextResponse.json(
      { error: "Erro ao registrar token" },
      { status: 500 }
    );
  }
}
