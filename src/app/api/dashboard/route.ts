import { NextRequest, NextResponse } from "next/server";

type Lead = {
  _row?: number;
  data?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  frete?: string;
  valor?: string | number;
  status?: string;
  etapa?: string | number;
  source?: string;
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

function normalizar(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

function chaveCliente(r: Lead) {
  const email = normalizar(r.email);
  const telefone = normalizar(r.telefone).replace(/\D/g, "");
  if (email && telefone) return `${email}|${telefone}`;
  if (email) return `email:${email}`;
  if (telefone) return `tel:${telefone}`;
  return `row:${r._row || Math.random()}`;
}

function valorNumerico(valor: unknown) {
  const texto = String(valor || "0")
    .replace("R$", "")
    .replace(/\s/g, "")
    .trim();

  let numero = 0;
  if (texto.includes(",") && texto.includes(".")) {
    numero = parseFloat(texto.replace(/\./g, "").replace(",", "."));
  } else if (texto.includes(",")) {
    numero = parseFloat(texto.replace(",", "."));
  } else {
    numero = parseFloat(texto);
  }
  return Number.isFinite(numero) ? numero : 0;
}

function parseData(valor: unknown): Date | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  const br = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (br) {
    const data = new Date(
      Number(br[3]),
      Number(br[2]) - 1,
      Number(br[1]),
      Number(br[4] || 0),
      Number(br[5] || 0),
      Number(br[6] || 0),
      0
    );
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const iso = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (iso) {
    const data = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      Number(iso[4] || 0),
      Number(iso[5] || 0),
      Number(iso[6] || 0),
      0
    );
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const tentativa = new Date(texto);
  return Number.isNaN(tentativa.getTime()) ? null : tentativa;
}

function criarDataLocal(
  ano: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  segundo = 0,
  ms = 0
) {
  return new Date(ano, mes, dia, hora, minuto, segundo, ms);
}

function dataInicioFiltro(valor?: string | null) {
  if (!valor) return null;
  const partes = valor.split("-");
  if (partes.length !== 3) return null;
  const ano = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
    return null;
  }
  return criarDataLocal(ano, mes, dia, 0, 0, 0, 0);
}

function dataFimFiltro(valor?: string | null) {
  if (!valor) return null;
  const partes = valor.split("-");
  if (partes.length !== 3) return null;
  const ano = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
    return null;
  }
  return criarDataLocal(ano, mes, dia, 23, 59, 59, 999);
}

function dataDentroDoPeriodo(
  data: Date | null,
  inicio: Date | null,
  fim: Date | null
) {
  if (!data) return false;
  if (inicio && data < inicio) return false;
  if (fim && data > fim) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  const expected = process.env.DASHBOARD_PASSWORD || "mundoatleta";

  if (password !== expected) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const webhook = process.env.LEADS_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json(
      { error: "LEADS_WEBHOOK_URL não configurada" },
      { status: 500 }
    );
  }

  const dateFrom = req.nextUrl.searchParams.get("dateFrom");
  const dateTo = req.nextUrl.searchParams.get("dateTo");
  const inicioFiltro = dataInicioFiltro(dateFrom);
  const fimFiltro = dataFimFiltro(dateTo);

  try {
    const res = await fetch(webhook, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Erro ao consultar a planilha" },
        { status: 500 }
      );
    }

    const json = await res.json();
    if (!json.ok && !json.data) {
      return NextResponse.json(
        { error: "Resposta inválida da planilha" },
        { status: 500 }
      );
    }

    const rows: Lead[] = Array.isArray(json.data)
      ? json.data.filter(
          (r: Lead) =>
            normalizar(r.nome) !== "nome" && normalizar(r.email) !== "email"
        )
      : [];

    let rowsFiltradas = rows;
    if (inicioFiltro || fimFiltro) {
      rowsFiltradas = rows.filter((row) => {
        const data = parseData(row.data);
        return dataDentroDoPeriodo(data, inicioFiltro, fimFiltro);
      });
    }

    const clientesMap = new Map<string, Lead>();
    for (const row of rowsFiltradas) {
      const chave = chaveCliente(row);
      const existente = clientesMap.get(chave);
      if (!existente) {
        clientesMap.set(chave, row);
        continue;
      }
      const rowAtual = Number(row._row || 0);
      const rowAnterior = Number(existente._row || 0);
      if (rowAtual >= rowAnterior) {
        clientesMap.set(chave, row);
      }
    }

    let clientes = Array.from(clientesMap.values());

    clientes.sort((a, b) => {
      const dataA = parseData(a.data);
      const dataB = parseData(b.data);
      if (dataA && dataB) return dataB.getTime() - dataA.getTime();
      return Number(b._row || 0) - Number(a._row || 0);
    });

    const pixGerados = clientes.filter((r) =>
      ["aguardando_pix", "pago"].includes(normalizar(r.status))
    );
    const pagos = clientes.filter((r) => normalizar(r.status) === "pago");
    const abandonados = clientes.filter((r) =>
      ["abandonado_dados", "abandonado_frete"].includes(normalizar(r.status))
    );

    const volume = pagos.reduce(
      (acc: number, r: Lead) => acc + valorNumerico(r.valor),
      0
    );
    const ticketMedio = pagos.length ? volume / pagos.length : 0;

    const etapa1 = clientes.filter((r) => Number(r.etapa) >= 1).length;
    const etapa2 = clientes.filter((r) => Number(r.etapa) >= 2).length;
    const etapa3 = clientes.filter((r) => Number(r.etapa) >= 3).length;
    const base = Math.max(etapa1, 1);

    const funil = {
      dados: 100,
      entrega: Math.round((etapa2 / base) * 100),
      pagamento: Math.round((etapa3 / base) * 100),
      pix: Math.round((pixGerados.length / base) * 100),
    };

    const conversaoPix = pixGerados.length
      ? Math.round((pagos.length / pixGerados.length) * 1000) / 10
      : 0;

    const recentes = clientes.slice(0, 30).map((r) => ({
      row: r._row,
      data: r.data,
      nome: r.nome,
      telefone: r.telefone,
      email: r.email,
      endereco: r.endereco,
      valor: r.valor,
      status: r.status,
      etapa: r.etapa,
      frete: r.frete,
      source: r.source || "DIRETO",
      fbclid: r.fbclid || "",
      utm_source: r.utm_source || "",
      utm_medium: r.utm_medium || "",
      utm_campaign: r.utm_campaign || "",
      utm_content: r.utm_content || "",
      utm_term: r.utm_term || "",
    }));

    return NextResponse.json({
      ok: true,
      filtro: {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        totalAntes: rows.length,
        totalDepois: rowsFiltradas.length,
      },
      stats: {
        volume,
        pixGerados: pixGerados.length,
        pixPagos: pagos.length,
        abandonados: abandonados.length,
        ticketMedio,
        conversaoPix,
        funil,
        totalLeads: clientes.length,
        totalRegistrosPlanilha: rows.length,
      },
      recentes,
    });
  } catch (err) {
    console.error("Erro no dashboard:", err);
    return NextResponse.json({ error: "Erro ao ler planilha" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, row, nome, valor } = body;
    const expected = process.env.DASHBOARD_PASSWORD || "mundoatleta";

    if (password !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const webhook = process.env.LEADS_WEBHOOK_URL;
    if (!webhook || !row) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const url = `${webhook}?action=mark_paid&row=${row}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    try {
      const { sendPushNotification, formatMoneyLabel } = await import(
        "@/lib/notify"
      );
      await sendPushNotification({
        title: "Venda Aprovada!",
        body: `Valor: ${formatMoneyLabel(valor)}`,
        data: { type: "pix_aprovado", row: String(row) },
      });
    } catch (e) {
      console.error("[dashboard] notify error", e);
    }

    return NextResponse.json(json);
  } catch (err) {
    console.error("Erro ao marcar pago:", err);
    return NextResponse.json({ error: "Erro ao marcar pago" }, { status: 500 });
  }
}
