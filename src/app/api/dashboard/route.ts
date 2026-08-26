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

/*
 * ============================================================
 * NORMALIZAR
 * ============================================================
 */

function normalizar(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

/*
 * ============================================================
 * CHAVE DO CLIENTE
 * ============================================================
 */

function chaveCliente(r: Lead) {
  const email = normalizar(r.email);

  const telefone = normalizar(
    r.telefone
  ).replace(/\D/g, "");

  if (email && telefone) {
    return `${email}|${telefone}`;
  }

  if (email) {
    return `email:${email}`;
  }

  if (telefone) {
    return `tel:${telefone}`;
  }

  return `row:${r._row || Math.random()}`;
}

/*
 * ============================================================
 * VALOR NUMÉRICO
 * ============================================================
 */

function valorNumerico(valor: unknown) {
  const texto = String(valor || "0")
    .replace("R$", "")
    .replace(/\s/g, "")
    .trim();

  let numero = 0;

  /*
   * Exemplos:
   *
   * 119,90
   * 1.119,90
   * 119.90
   */

  if (
    texto.includes(",") &&
    texto.includes(".")
  ) {
    numero = parseFloat(
      texto
        .replace(/\./g, "")
        .replace(",", ".")
    );
  } else if (
    texto.includes(",")
  ) {
    numero = parseFloat(
      texto.replace(",", ".")
    );
  } else {
    numero = parseFloat(texto);
  }

  return Number.isFinite(numero)
    ? numero
    : 0;
}

/*
 * ============================================================
 * PARSE DE DATA
 * ============================================================
 *
 * Aceita:
 *
 * 25/08/2026
 * 25/08/2026 20:30
 * 25/08/2026 20:30:00
 *
 * 2026-08-25
 * 2026-08-25 20:30
 * 2026-08-25 20:30:00
 *
 * 2026-08-25T20:30:00
 *
 * A data é sempre construída
 * no horário local do servidor.
 */

function parseData(
  valor: unknown
): Date | null {
  if (!valor) {
    return null;
  }

  const texto =
    String(valor).trim();

  if (!texto) {
    return null;
  }

  /*
   * ==========================================================
   * DD/MM/YYYY
   * ==========================================================
   */

  const br = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );

  if (br) {
    const dia = Number(br[1]);
    const mes =
      Number(br[2]) - 1;
    const ano = Number(br[3]);

    const hora =
      Number(br[4] || 0);

    const minuto =
      Number(br[5] || 0);

    const segundo =
      Number(br[6] || 0);

    const data = new Date(
      ano,
      mes,
      dia,
      hora,
      minuto,
      segundo,
      0
    );

    if (
      !Number.isNaN(
        data.getTime()
      )
    ) {
      return data;
    }

    return null;
  }

  /*
   * ==========================================================
   * YYYY-MM-DD
   * ==========================================================
   */

  const iso = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );

  if (iso) {
    const ano =
      Number(iso[1]);

    const mes =
      Number(iso[2]) - 1;

    const dia =
      Number(iso[3]);

    const hora =
      Number(iso[4] || 0);

    const minuto =
      Number(iso[5] || 0);

    const segundo =
      Number(iso[6] || 0);

    const data = new Date(
      ano,
      mes,
      dia,
      hora,
      minuto,
      segundo,
      0
    );

    if (
      !Number.isNaN(
        data.getTime()
      )
    ) {
      return data;
    }

    return null;
  }

  /*
   * ==========================================================
   * ÚLTIMA TENTATIVA
   * ==========================================================
   */

  const tentativa =
    new Date(texto);

  if (
    !Number.isNaN(
      tentativa.getTime()
    )
  ) {
    return tentativa;
  }

  return null;
}

/*
 * ============================================================
 * CRIAR DATA INICIAL
 * ============================================================
 */

function dataInicioFiltro(
  valor?: string | null
) {
  if (!valor) {
    return null;
  }

  const partes =
    valor.split("-");

  if (
    partes.length !== 3
  ) {
    return null;
  }

  const ano =
    Number(partes[0]);

  const mes =
    Number(partes[1]) - 1;

  const dia =
    Number(partes[2]);

  if (
    !Number.isInteger(ano) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(dia)
  ) {
    return null;
  }

  const data = new Date(
    ano,
    mes,
    dia,
    0,
    0,
    0,
    0
  );

  return Number.isNaN(
    data.getTime()
  )
    ? null
    : data;
}

/*
 * ============================================================
 * CRIAR DATA FINAL
 * ============================================================
 */

function dataFimFiltro(
  valor?: string | null
) {
  if (!valor) {
    return null;
  }

  const partes =
    valor.split("-");

  if (
    partes.length !== 3
  ) {
    return null;
  }

  const ano =
    Number(partes[0]);

  const mes =
    Number(partes[1]) - 1;

  const dia =
    Number(partes[2]);

  if (
    !Number.isInteger(ano) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(dia)
  ) {
    return null;
  }

  /*
   * IMPORTANTE:
   *
   * O filtro termina às 23:59:59.999
   * do dia selecionado.
   */

  const data = new Date(
    ano,
    mes,
    dia,
    23,
    59,
    59,
    999
  );

  return Number.isNaN(
    data.getTime()
  )
    ? null
    : data;
}

/*
 * ============================================================
 * VERIFICAR SE REGISTRO ESTÁ NO PERÍODO
 * ============================================================
 */

function registroDentroDoPeriodo(
  row: Lead,
  inicio: Date | null,
  fim: Date | null
) {
  /*
   * Se não existe filtro,
   * aceita tudo.
   */

  if (!inicio && !fim) {
    return true;
  }

  const data =
    parseData(row.data);

  /*
   * Se existe filtro mas a
   * data do registro não pode
   * ser interpretada, não entra.
   */

  if (!data) {
    return false;
  }

  /*
   * Antes da data inicial.
   */

  if (
    inicio &&
    data.getTime() <
      inicio.getTime()
  ) {
    return false;
  }

  /*
   * Depois da data final.
   */

  if (
    fim &&
    data.getTime() >
      fim.getTime()
  ) {
    return false;
  }

  return true;
}

/*
 * ============================================================
 * GET
 * ============================================================
 */

export async function GET(
  req: NextRequest
) {
  /*
   * ==========================================================
   * SENHA
   * ==========================================================
   */

  const password =
    req.nextUrl.searchParams.get(
      "password"
    );

  const expected =
    process.env.DASHBOARD_PASSWORD ||
    "mundoatleta";

  if (
    password !== expected
  ) {
    return NextResponse.json(
      {
        error:
          "Não autorizado",
      },
      {
        status: 401,
      }
    );
  }

  /*
   * ==========================================================
   * WEBHOOK
   * ==========================================================
   */

  const webhook =
    process.env.LEADS_WEBHOOK_URL;

  if (!webhook) {
    return NextResponse.json(
      {
        error:
          "LEADS_WEBHOOK_URL não configurada",
      },
      {
        status: 500,
      }
    );
  }

  /*
   * ==========================================================
   * FILTRO
   * ==========================================================
   *
   * O page.tsx envia exatamente:
   *
   * dateFrom
   * dateTo
   */

  const dateFrom =
    req.nextUrl.searchParams.get(
      "dateFrom"
    );

  const dateTo =
    req.nextUrl.searchParams.get(
      "dateTo"
    );

  const inicioFiltro =
    dataInicioFiltro(
      dateFrom
    );

  const fimFiltro =
    dataFimFiltro(
      dateTo
    );

  try {
    /*
     * ==========================================================
     * BUSCAR PLANILHA
     * ==========================================================
     */

    const res =
      await fetch(
        webhook,
        {
          cache:
            "no-store",
        }
      );

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            "Erro ao consultar a planilha",
        },
        {
          status: 500,
        }
      );
    }

    const json =
      await res.json();

    if (
      !json.ok &&
      !json.data
    ) {
      return NextResponse.json(
        {
          error:
            "Resposta inválida da planilha",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ==========================================================
     * TODOS OS REGISTROS
     * ==========================================================
     */

    const rows: Lead[] =
      Array.isArray(
        json.data
      )
        ? json.data.filter(
            (r: Lead) =>
              normalizar(
                r.nome
              ) !==
                "nome" &&
              normalizar(
                r.email
              ) !==
                "email"
          )
        : [];

    /*
     * ==========================================================
     * AQUI ESTÁ A CORREÇÃO PRINCIPAL
     * ==========================================================
     *
     * PRIMEIRO filtramos os registros pela data.
     *
     * SOMENTE DEPOIS agrupamos os clientes.
     *
     * Isso evita que um registro mais recente
     * de um cliente substitua um registro antigo
     * que deveria aparecer no período selecionado.
     */

    let rowsFiltradas =
      rows.filter(
        (row) =>
          registroDentroDoPeriodo(
            row,
            inicioFiltro,
            fimFiltro
          )
      );

    /*
     * ==========================================================
     * AGRUPAR CLIENTES
     * ==========================================================
     */

    const clientesMap =
      new Map<
        string,
        Lead
      >();

    for (
      const row of rowsFiltradas
    ) {
      const chave =
        chaveCliente(row);

      const existente =
        clientesMap.get(
          chave
        );

      /*
       * Primeiro registro
       */

      if (!existente) {
        clientesMap.set(
          chave,
          row
        );

        continue;
      }

      /*
       * Se existem dois registros
       * do mesmo cliente dentro
       * do período, mantemos o
       * mais recente.
       */

      const rowAtual =
        Number(
          row._row || 0
        );

      const rowAnterior =
        Number(
          existente._row || 0
        );

      if (
        rowAtual >=
        rowAnterior
      ) {
        clientesMap.set(
          chave,
          row
        );
      }
    }

    /*
     * ==========================================================
     * CLIENTES FINAIS
     * ==========================================================
     */

    let clientes =
      Array.from(
        clientesMap.values()
      );

    /*
     * ==========================================================
     * ORDENAR DO MAIS RECENTE
     * ==========================================================
     */

    clientes.sort(
      (a, b) => {
        /*
         * Primeiro tenta pelo _row.
         */

        const rowA =
          Number(
            a._row || 0
          );

        const rowB =
          Number(
            b._row || 0
          );

        if (
          rowA !== rowB
        ) {
          return (
            rowB - rowA
          );
        }

        /*
         * Se não houver _row,
         * tenta pela data.
         */

        const dataA =
          parseData(a.data);

        const dataB =
          parseData(b.data);

        if (
          dataA &&
          dataB
        ) {
          return (
            dataB.getTime() -
            dataA.getTime()
          );
        }

        return 0;
      }
    );

    /*
     * ==========================================================
     * STATUS
     * ==========================================================
     */

    const pixGerados =
      clientes.filter(
        (r) =>
          [
            "aguardando_pix",
            "pago",
          ].includes(
            normalizar(
              r.status
            )
          )
      );

    const pagos =
      clientes.filter(
        (r) =>
          normalizar(
            r.status
          ) === "pago"
      );

    const abandonados =
      clientes.filter(
        (r) =>
          [
            "abandonado_dados",
            "abandonado_frete",
          ].includes(
            normalizar(
              r.status
            )
          )
      );

    /*
     * ==========================================================
     * FATURAMENTO
     * ==========================================================
     */

    const volume =
      pagos.reduce(
        (
          acc: number,
          r: Lead
        ) => {
          return (
            acc +
            valorNumerico(
              r.valor
            )
          );
        },
        0
      );

    /*
     * ==========================================================
     * TICKET MÉDIO
     * ==========================================================
     */

    const ticketMedio =
      pagos.length > 0
        ? volume /
          pagos.length
        : 0;

    /*
     * ==========================================================
     * FUNIL
     * ==========================================================
     */

    const etapa1 =
      clientes.filter(
        (r) =>
          Number(
            r.etapa
          ) >= 1
      ).length;

    const etapa2 =
      clientes.filter(
        (r) =>
          Number(
            r.etapa
          ) >= 2
      ).length;

    const etapa3 =
      clientes.filter(
        (r) =>
          Number(
            r.etapa
          ) >= 3
      ).length;

    const base =
      Math.max(
        etapa1,
        1
      );

    const funil = {
      dados: 100,

      entrega:
        Math.round(
          (etapa2 /
            base) *
            100
        ),

      pagamento:
        Math.round(
          (etapa3 /
            base) *
            100
        ),

      pix:
        Math.round(
          (pixGerados.length /
            base) *
            100
        ),
    };

    /*
     * ==========================================================
     * CONVERSÃO PIX
     * ==========================================================
     */

    const conversaoPix =
      pixGerados.length >
      0
        ? Math.round(
            (pagos.length /
              pixGerados.length) *
              1000
          ) / 10
        : 0;

    /*
     * ==========================================================
     * CLIENTES RECENTES
     * ==========================================================
     */

    const recentes =
      clientes
        .slice(0, 30)
        .map(
          (r: Lead) => ({
            row:
              r._row,

            data:
              r.data,

            nome:
              r.nome,

            telefone:
              r.telefone,

            email:
              r.email,

            endereco:
              r.endereco,

            valor:
              r.valor,

            status:
              r.status,

            etapa:
              r.etapa,

            frete:
              r.frete,
          })
        );

    /*
     * ==========================================================
     * RESPOSTA
     * ==========================================================
     */

    return NextResponse.json({
      ok: true,

      filtro: {
        dateFrom:
          dateFrom ||
          null,

        dateTo:
          dateTo ||
          null,
      },

      stats: {
        volume,

        pixGerados:
          pixGerados.length,

        pixPagos:
          pagos.length,

        abandonados:
          abandonados.length,

        ticketMedio,

        conversaoPix,

        funil,

        totalLeads:
          clientes.length,

        /*
         * Mostra quantos registros
         * existem na planilha inteira.
         */

        totalRegistrosPlanilha:
          rows.length,

        /*
         * Mostra quantos registros
         * sobraram depois do filtro.
         *
         * Isso ajuda muito a verificar
         * se o filtro está funcionando.
         */

        totalRegistrosFiltrados:
          rowsFiltradas.length,
      },

      recentes,
    });
  } catch (err) {
    console.error(
      "Erro no dashboard:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Erro ao ler planilha",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * POST — MARCAR COMO PAGO
 * ============================================================
 */

export async function POST(
  req: NextRequest
) {
  try {
    const body =
      await req.json();

    const {
      password,
      row,
    } = body;

    const expected =
      process.env.DASHBOARD_PASSWORD ||
      "mundoatleta";

    if (
      password !==
      expected
    ) {
      return NextResponse.json(
        {
          error:
            "Não autorizado",
        },
        {
          status: 401,
        }
      );
    }

    const webhook =
      process.env
        .LEADS_WEBHOOK_URL;

    if (
      !webhook ||
      !row
    ) {
      return NextResponse.json(
        {
          error:
            "Dados inválidos",
        },
        {
          status: 400,
        }
      );
    }

    const url =
      `${webhook}?action=mark_paid&row=${row}`;

    const res =
      await fetch(
        url,
        {
          cache:
            "no-store",
        }
      );

    const json =
      await res.json();

    return NextResponse.json(
      json
    );
  } catch (err) {
    console.error(
      "Erro ao marcar pago:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Erro ao marcar pago",
      },
      {
        status: 500,
      }
    );
  }
}
