import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  const expected = process.env.DASHBOARD_PASSWORD || "mundoatleta";

  if (password !== expected) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const webhook = process.env.LEADS_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({ error: "LEADS_WEBHOOK_URL não configurada" }, { status: 500 });
  }

  try {
    const res = await fetch(webhook, { cache: "no-store" });
    const json = await res.json();
    const rows = json.data || [];

    const pixGerados = rows.filter((r: any) =>
      ["aguardando_pix", "pago"].includes(String(r.status || "").toLowerCase())
    );
    const pagos = rows.filter(
      (r: any) => String(r.status || "").toLowerCase() === "pago"
    );
    const abandonados = rows.filter((r: any) =>
      ["abandonado_dados", "abandonado_frete"].includes(
        String(r.status || "").toLowerCase()
      )
    );

    const volume = pagos.reduce((acc: number, r: any) => {
      const v = parseFloat(String(r.valor || "0").replace(",", "."));
      return acc + (isNaN(v) ? 0 : v);
    }, 0);

    const ticketMedio = pagos.length > 0 ? volume / pagos.length : 0;

    const etapa1 = rows.filter((r: any) => Number(r.etapa) >= 1).length;
    const etapa2 = rows.filter((r: any) => Number(r.etapa) >= 2).length;
    const etapa3 = rows.filter((r: any) => Number(r.etapa) >= 3).length;
    const base = Math.max(etapa1, 1);

    const funil = {
      dados: 100,
      entrega: Math.round((etapa2 / base) * 100),
      pagamento: Math.round((etapa3 / base) * 100),
      pix: Math.round((pixGerados.length / base) * 100),
    };

    const conversaoPix =
      pixGerados.length > 0
        ? Math.round((pagos.length / pixGerados.length) * 1000) / 10
        : 0;

    const recentes = [...rows]
      .reverse()
      .slice(0, 30)
      .map((r: any) => ({
        row: r._row,
        data: r.data,
        nome: r.nome,
        telefone: r.telefone,
        email: r.email,
        valor: r.valor,
        status: r.status,
        etapa: r.etapa,
        frete: r.frete,
      }));

    return NextResponse.json({
      ok: true,
      stats: {
        volume,
        pixGerados: pixGerados.length,
        pixPagos: pagos.length,
        abandonados: abandonados.length,
        ticketMedio,
        conversaoPix,
        funil,
        totalLeads: rows.length,
      },
      recentes,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao ler planilha" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, row } = body;
  const expected = process.env.DASHBOARD_PASSWORD || "mundoatleta";

  if (password !== expected) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const webhook = process.env.LEADS_WEBHOOK_URL;
  if (!webhook || !row) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  try {
    const url = `${webhook}?action=mark_paid&row=${row}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: "Erro ao marcar pago" }, { status: 500 });
  }
}
