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
};

function normalizar(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

function chaveCliente(r: Lead) {
  const email = normalizar(r.email);
  const telefone = normalizar(r.telefone).replace(/\D/g, "");

  // Preferimos email + telefone.
  if (email && telefone) return `${email}|${telefone}`;
  if (email) return `email:${email}`;
  if (telefone) return `tel:${telefone}`;

  // Fallback para evitar perder registros sem identificação.
  return `row:${r._row || Math.random()}`;
}

function valorNumerico(valor: unknown) {
  const numero = parseFloat(
    String(valor || "0").replace(",", ".")
  );

  return Number.isFinite(numero) ? numero : 0;
}

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  const expected = process.env.DASHBOARD_PASSWORD || "mundoatleta";

  if (password !== expected) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  const webhook = process.env.LEADS_WEBHOOK_URL;

  if (!webhook) {
    return NextResponse.json(
      { error: "LEADS_WEBHOOK_URL não configurada" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(webhook, {
      cache: "no-store",
    });

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
            normalizar(r.nome) !== "nome" &&
            normalizar(r.email) !== "email"
        )
      : [];

    /*
     * ============================================================
     * AGRUPAR CLIENTES
     * ============================================================
     *
     * A planilha registra uma linha a cada avanço do checkout.
     *
     * Exemplo:
     *
     * João - etapa 1
     * João - etapa 2
     * João - etapa 3
     *
     * Aqui transformamos isso em apenas UM cliente:
     *
     * João - etapa 3
     */

    const clientesMap = new Map<string, Lead>();

    for (const row of rows) {
      const chave = chaveCliente(row);

      const existente = clientesMap.get(chave);

      if (!existente) {
        clientesMap.set(chave, row);
        continue;
      }

      /*
       * O _row representa a posição da linha na planilha.
       * Quanto maior, mais recente.
       */
      const rowAtual = Number(row._row || 0);
      const rowAnterior = Number(existente._row || 0);

      if (rowAtual >= rowAnterior) {
        clientesMap.set(chave, row);
      }
    }

    const clientes = Array.from(clientesMap.values());

    /*
     * Ordena do mais recente para o mais antigo.
     */
    clientes.sort(
      (a, b) =>
        Number(b._row || 0) -
        Number(a._row || 0)
    );

    /*
     * ============================================================
     * STATUS
     * ============================================================
     */

    const pixGerados = clientes.filter((r) =>
      ["aguardando_pix", "pago"].includes(
        normalizar(r.status)
      )
    );

    const pagos = clientes.filter(
      (r) => normalizar(r.status) === "pago"
    );

    const abandonados = clientes.filter((r) =>
      ["abandonado_dados", "abandonado_frete"].includes(
        normalizar(r.status)
      )
    );

    /*
     * ============================================================
     * FATURAMENTO
     * ============================================================
     */

    const volume = pagos.reduce(
      (acc: number, r: Lead) => {
        return acc + valorNumerico(r.valor);
      },
      0
    );

    const ticketMedio =
      pagos.length > 0
        ? volume / pagos.length
        : 0;

    /*
     * ============================================================
     * FUNIL
     * ============================================================
     *
     * Como agora temos clientes únicos, os números ficam corretos.
     */

    const etapa1 = clientes.filter(
      (r) => Number(r.etapa) >= 1
    ).length;

    const etapa2 = clientes.filter(
      (r) => Number(r.etapa) >= 2
    ).length;

    const etapa3 = clientes.filter(
      (r) => Number(r.etapa) >= 3
    ).length;

    const base = Math.max(etapa1, 1);

    const funil = {
      dados: 100,
      entrega: Math.round(
        (etapa2 / base) * 100
      ),
      pagamento: Math.round(
        (etapa3 / base) * 100
      ),
      pix: Math.round(
        (pixGerados.length / base) * 100
      ),
    };

    /*
     * ============================================================
     * CONVERSÃO PIX
     * ============================================================
     */

    const conversaoPix =
      pixGerados.length > 0
        ? Math.round(
            (pagos.length / pixGerados.length) *
              1000
          ) / 10
        : 0;

    /*
     * ============================================================
     * CLIENTES RECENTES
     * ============================================================
     */

    const recentes = clientes
      .slice(0, 30)
      .map((r: Lead) => ({
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
      }));

    /*
     * ============================================================
     * RESPOSTA
     * ============================================================
     */

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

        // Total de clientes únicos
        totalLeads: clientes.length,

        // Mantemos também o total bruto para conferência.
        totalRegistrosPlanilha: rows.length,
      },

      recentes,
    });
  } catch (err) {
    console.error(
      "Erro no dashboard:",
      err
    );

    return NextResponse.json(
      { error: "Erro ao ler planilha" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { password, row } = body;

  const expected =
    process.env.DASHBOARD_PASSWORD ||
    "mundoatleta";

  if (password !== expected) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  const webhook =
    process.env.LEADS_WEBHOOK_URL;

  if (!webhook || !row) {
    return NextResponse.json(
      { error: "Dados inválidos" },
      { status: 400 }
    );
  }

  try {
    const url =
      `${webhook}?action=mark_paid&row=${row}`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    const json = await res.json();

    return NextResponse.json(json);
  } catch (err) {
    console.error(
      "Erro ao marcar pago:",
      err
    );

    return NextResponse.json(
      { error: "Erro ao marcar pago" },
      { status: 500 }
    );
  }
}
