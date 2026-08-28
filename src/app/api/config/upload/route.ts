import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const password = String(form.get("password") || "");
    const expected = process.env.DASHBOARD_PASSWORD || "mundoatleta";

    if (password !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Envie uma imagem (PNG, JPG ou WEBP)" },
        { status: 400 }
      );
    }

    // ~2 MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Imagem muito grande (máx. 2 MB)" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "png";
    const blob = await put(`logo/logo.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro no upload" }, { status: 500 });
  }
}
