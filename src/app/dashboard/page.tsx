"use client";

import { useEffect, useState } from "react";

type Stats = {
  volume: number;
  pixGerados: number;
  pixPagos: number;
  abandonados: number;
  ticketMedio: number;
  conversaoPix: number;
  funil: {
    dados: number;
    entrega: number;
    pagamento: number;
    pix: number;
  };
  totalLeads: number;
};

type Lead = {
  row: number;
  data: string;
  nome: string;
  telefone: string;
  email: string;
  valor: string;
  status: string;
  etapa: string;
  frete: string;
};

type Tab =
  | "dashboard"
  | "vendas"
  | "carrinhos"
  | "pix"
  | "config";

type Preset =
  | ""
  | "hoje"
  | "ontem"
  | "semana"
  | "mes"
  | "7dias"
  | "30dias"
  | "ano"
  | "personalizado";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();

  const diff =
    day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);

  return d;
}

function getPresetDates(
  preset: Preset
): {
  from: string;
  to: string;
} {
  const now = new Date();

  if (preset === "hoje") {
    const hoje =
      getLocalDateString(now);

    return {
      from: hoje,
      to: hoje,
    };
  }

  if (preset === "ontem") {
    const ontem = new Date(now);
    ontem.setDate(
      ontem.getDate() - 1
    );

    const data =
      getLocalDateString(ontem);

    return {
      from: data,
      to: data,
    };
  }

  if (preset === "semana") {
    const inicio =
      startOfWeek(now);

    return {
      from: getLocalDateString(
        inicio
      ),
      to: getLocalDateString(now),
    };
  }

  if (preset === "mes") {
    const inicio = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    return {
      from: getLocalDateString(
        inicio
      ),
      to: getLocalDateString(now),
    };
  }

  if (preset === "7dias") {
    const inicio = new Date(now);
    inicio.setDate(
      inicio.getDate() - 6
    );

    return {
      from: getLocalDateString(
        inicio
      ),
      to: getLocalDateString(now),
    };
  }

  if (preset === "30dias") {
    const inicio = new Date(now);
    inicio.setDate(
      inicio.getDate() - 29
    );

    return {
      from: getLocalDateString(
        inicio
      ),
      to: getLocalDateString(now),
    };
  }

  if (preset === "ano") {
    const inicio = new Date(
      now.getFullYear(),
      0,
      1
    );

    return {
      from: getLocalDateString(
        inicio
      ),
      to: getLocalDateString(now),
    };
  }

  return {
    from: "",
    to: "",
  };
}

/*
 * ============================================================
 * WHATSAPP
 * ============================================================
 */

function waLink(
  phone: string,
  nome: string,
  status: string,
  valor: string
) {
  const n = String(phone || "").replace(
    /\D/g,
    ""
  );

  if (!n) return "#";

  const full = n.startsWith("55")
    ? n
    : `55${n}`;

  const nomeCliente =
    String(nome || "")
      .trim()
      .split(" ")[0] || "cliente";

  const valorPedido = valor
    ? `R$ ${valor}`
    : "R$ 0,00";

  const statusNormalizado =
    String(status || "").toLowerCase();

  let mensagem = "";

  if (
    statusNormalizado ===
    "aguardando_pix"
  ) {
    mensagem = `Olá *${nomeCliente}*!

*Seu pedido do Aparelho Abdominal AB Tomic foi reservado com sucesso!*

*Resumo do pedido:*
* Produto: Aparelho Abdominal AB Tomic
* Valor total: *${valorPedido}*

Nos próximos instantes, você receberá o código Pix (copia e cola) para realizar o pagamento de forma rápida e segura.

Assim que o pagamento for confirmado, iniciaremos a separação do seu pedido para envio.

Se tiver qualquer dúvida, é só responder esta mensagem. Estamos à disposição!`;
  } else if (
    statusNormalizado.includes(
      "abandonado"
    )
  ) {
    mensagem = `Olá, *${nomeCliente}*!

Percebemos que você iniciou a compra do *Aparelho Abdominal AB TOMIC*, mas o pedido ainda não foi concluído.

*Seu carrinho continua reservado por tempo limitado*, então você pode finalizar a compra em poucos segundos pelo link abaixo:

https://mundo-atleta-checkout.vercel.app/

Se precisar de qualquer ajuda, é só responder esta mensagem. Será um prazer atender você!`;
  } else {
    mensagem = `Olá, *${nomeCliente}*!

Aqui é da Mundo Atleta. Estamos entrando em contato sobre o seu pedido.

Se precisar de qualquer ajuda, é só responder esta mensagem.`;
  }

  return `https://wa.me/${full}?text=${encodeURIComponent(
    mensagem
  )}`;
}

function LineChart() {
  const points = [
    8, 12, 10, 15, 18, 14,
    20, 22, 19, 25, 28, 24,
  ];

  const max = 30;
  const w = 280;
  const h = 100;
  const step =
    w / (points.length - 1);

  const path = points
    .map((p, i) => {
      const x = i * step;
      const y =
        h - (p / max) * h;

      return `${
        i === 0 ? "M" : "L"
      } ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-24"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id="area"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="#0d9488"
            stopOpacity="0.25"
          />

          <stop
            offset="100%"
            stopColor="#0d9488"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      <path
        d={`${path} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#area)"
      />

      <path
        d={path}
        fill="none"
        stroke="#0d9488"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function Funnel({
  funil,
}: {
  funil: {
    dados: number;
    entrega: number;
    pagamento: number;
    pix: number;
  };
}) {
  const steps = [
    {
      label: "Dados pessoais",
      value: funil.dados,
      width: "100%",
      color: "bg-teal-600",
    },
    {
      label: "Entrega",
      value: funil.entrega,
      width: "85%",
      color: "bg-teal-500",
    },
    {
      label: "Pagamento",
      value: funil.pagamento,
      width: "68%",
      color: "bg-teal-400",
    },
    {
      label: "PIX gerado",
      value: funil.pix,
      width: "52%",
      color: "bg-teal-300",
    },
  ];

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {steps.map((s) => (
        <div
          key={s.label}
          className="w-full flex flex-col items-center"
        >
          <div
            className={`${s.color} text-white text-xs font-medium py-2.5 px-3 rounded-lg text-center shadow-sm`}
            style={{
              width: s.width,
            }}
          >
            {s.label} · {s.value}%
          </div>
        </div>
      ))}
    </div>
  );
}

function statusBadge(
  status: string
) {
  const s =
    status.toLowerCase();

  if (s === "pago") {
    return "bg-green-50 text-green-700";
  }

  if (
    s === "aguardando_pix"
  ) {
    return "bg-blue-50 text-blue-700";
  }

  if (
    s.includes("abandonado")
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-gray-100 text-gray-600";
}

function formatDateLabel(
  date: string
) {
  if (!date) return "";

  const parts =
    date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function DashboardPage() {
  const [password, setPassword] =
    useState("");

  const [authed, setAuthed] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [stats, setStats] =
    useState<Stats | null>(null);

  const [recentes, setRecentes] =
    useState<Lead[]>([]);

  const [tab, setTab] =
    useState<Tab>("dashboard");

  const [menuOpen, setMenuOpen] =
    useState(false);

  /*
   * ============================================================
   * FILTRO
   * ============================================================
   */

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [appliedDateFrom, setAppliedDateFrom] =
    useState("");

  const [appliedDateTo, setAppliedDateTo] =
    useState("");

  const [preset, setPreset] =
    useState<Preset>("");

  /*
   * ============================================================
   * CARREGAR DADOS
   * ============================================================
   *
   * IMPORTANTE:
   * O backend espera "inicio" e "fim".
   * Antes estava enviando "dateFrom" e "dateTo".
   */

  async function load(
    pwd: string,
    from = appliedDateFrom,
    to = appliedDateTo
  ) {
    setLoading(true);
    setError("");

    try {
      const params =
        new URLSearchParams();

      params.set(
        "password",
        pwd
      );

      /*
       * ESTES NOMES PRECISAM SER IGUAIS
       * AOS NOMES USADOS NO route.ts
       */

      if (from) {
        params.set(
          "inicio",
          from
        );
      }

      if (to) {
        params.set(
          "fim",
          to
        );
      }

      const res =
        await fetch(
          `/api/dashboard?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

      const json =
        await res.json();

      if (!res.ok) {
        setError(
          json.error ||
            "Senha incorreta"
        );

        setAuthed(false);
        return;
      }

      setStats(
        json.stats
      );

      setRecentes(
        json.recentes || []
      );

      setAuthed(true);

      sessionStorage.setItem(
        "dash_pwd",
        pwd
      );
    } catch {
      setError(
        "Erro de conexão"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================================
   * APLICAR FILTRO
   * ============================================================
   */

  function aplicarFiltro() {
    if (
      dateFrom &&
      dateTo &&
      dateFrom > dateTo
    ) {
      alert(
        "A data inicial não pode ser maior que a data final."
      );

      return;
    }

    setAppliedDateFrom(
      dateFrom
    );

    setAppliedDateTo(
      dateTo
    );

    load(
      password,
      dateFrom,
      dateTo
    );
  }

  /*
   * ============================================================
   * PREDEFINIÇÕES
   * ============================================================
   */

  function aplicarPreset(
    novoPreset: Preset
  ) {
    setPreset(novoPreset);

    if (
      novoPreset === ""
    ) {
      setDateFrom("");
      setDateTo("");
      setAppliedDateFrom("");
      setAppliedDateTo("");

      load(
        password,
        "",
        ""
      );

      return;
    }

    if (
      novoPreset ===
      "personalizado"
    ) {
      return;
    }

    const {
      from,
      to,
    } =
      getPresetDates(
        novoPreset
      );

    setDateFrom(from);
    setDateTo(to);

    setAppliedDateFrom(
      from
    );

    setAppliedDateTo(
      to
    );

    load(
      password,
      from,
      to
    );
  }

  /*
   * ============================================================
   * LIMPAR FILTRO
   * ============================================================
   */

  function limparFiltro() {
    setPreset("");

    setDateFrom("");
    setDateTo("");

    setAppliedDateFrom("");
    setAppliedDateTo("");

    load(
      password,
      "",
      ""
    );
  }

  /*
   * ============================================================
   * LOGIN AUTOMÁTICO
   * ============================================================
   */

  useEffect(() => {
    const saved =
      sessionStorage.getItem(
        "dash_pwd"
      );

    if (saved) {
      setPassword(saved);
      load(saved, "", "");
    }
  }, []);

  /*
   * ============================================================
   * MARCAR COMO PAGO
   * ============================================================
   */

  async function markPaid(
    lead: Lead
  ) {
    if (
      !confirm(
        "Marcar este pedido como PAGO?"
      )
    ) {
      return;
    }

    try {
      const res =
        await fetch(
          "/api/dashboard",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password,
              row: lead.row,
            }),
          }
        );

      const json =
        await res.json();

      if (!res.ok) {
        alert(
          json.error ||
            "Erro ao marcar como pago"
        );

        return;
      }

      if (
        typeof window !==
          "undefined" &&
        typeof (
          window as any
        ).fbq === "function"
      ) {
        const valor =
          parseFloat(
            String(
              lead.valor ||
                "0"
            )
              .replace(
                "R$",
                ""
              )
              .replace(
                /\./g,
                ""
              )
              .replace(
                ",",
                "."
              )
              .trim()
          );

        (
          window as any
        ).fbq(
          "track",
          "Purchase",
          {
            value: isNaN(valor)
              ? 0
              : valor,

            currency: "BRL",

            content_name:
              "Mundo Atleta",

            content_type:
              "product",
          }
        );
      }

      await load(
        password,
        appliedDateFrom,
        appliedDateTo
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Erro de conexão ao marcar como pago"
      );
    }
  }

  const vendas =
    recentes.filter(
      (l) =>
        String(
          l.status
        ).toLowerCase() ===
        "pago"
    );

  const carrinhos =
    recentes.filter(
      (l) =>
        String(
          l.status
        )
          .toLowerCase()
          .includes(
            "abandonado"
          )
    );

  const pixList =
    recentes.filter(
      (l) =>
        [
          "aguardando_pix",
          "pago",
        ].includes(
          String(
            l.status
          ).toLowerCase()
        )
    );

  const menu: {
    id: Tab;
    label: string;
    icon: string;
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "▣",
    },
    {
      id: "vendas",
      label: "Vendas",
      icon: "₹",
    },
    {
      id: "carrinhos",
      label: "Carrinhos",
      icon: "🛒",
    },
    {
      id: "pix",
      label: "PIX",
      icon: "⬡",
    },
    {
      id: "config",
      label: "Configurações",
      icon: "⚙",
    },
  ];

  function LeadRow({
    lead,
    showPaidBtn,
  }: {
    lead: Lead;
    showPaidBtn?: boolean;
  }) {
    const status =
      String(
        lead.status || ""
      ).toLowerCase();

    if (
      !lead.nome &&
      !lead.telefone &&
      !lead.email
    ) {
      return null;
    }

    return (
      <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-gray-50 last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {lead.nome ||
              "Sem nome"}
          </p>

          <p className="text-xs text-gray-500 mt-0.5">
            {lead.data
              ? `${lead.data} · `
              : ""}

            {lead.telefone ||
              "—"}{" "}
            · R${" "}
            {lead.valor ||
              "0"}

            {lead.frete
              ? ` · ${lead.frete}`
              : ""}
          </p>

          <span
            className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge(
              status
            )}`}
          >
            {lead.status ||
              "—"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lead.telefone && (
            <a
              href={waLink(
                lead.telefone,
                lead.nome,
                lead.status,
                lead.valor
              )}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
            >
              WhatsApp
            </a>
          )}

          {showPaidBtn &&
            status ===
              "aguardando_pix" && (
              <button
                onClick={() =>
                  markPaid(
                    lead
                  )
                }
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
              >
                Marcar pago
              </button>
            )}
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              MA
            </div>

            <div>
              <p className="font-bold text-gray-900">
                Mundo Atleta
              </p>

              <p className="text-xs text-gray-400">
                Dashboard
              </p>
            </div>
          </div>

          <input
            type="password"
            placeholder="Senha de acesso"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            onKeyDown={(e) =>
              e.key ===
                "Enter" &&
              load(password)
            }
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          />

          {error && (
            <p className="text-sm text-red-600 mb-3">
              {error}
            </p>
          )}

          <button
            onClick={() =>
              load(password)
            }
            disabled={
              loading ||
              !password
            }
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {loading
              ? "Entrando..."
              : "Entrar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex">
      {/* SIDEBAR */}

      <aside className="hidden md:flex w-56 flex-col bg-white border-r border-gray-100 min-h-screen sticky top-0">
        <div className="p-4 flex items-center gap-2 border-b border-gray-50">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
            MA
          </div>

          <div>
            <p className="font-bold text-gray-900 text-sm">
              Mundo Atleta
            </p>

            <p className="text-[10px] text-gray-400">
              Checkout
            </p>
          </div>
        </div>

        <nav className="p-3 flex-1 space-y-1">
          {menu.map((m) => (
            <button
              key={m.id}
              onClick={() =>
                setTab(m.id)
              }
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === m.id
                  ? "bg-teal-50 text-teal-800"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="opacity-70">
                {m.icon}
              </span>

              {m.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        {/* TOP BAR */}

        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden text-gray-600 p-1.5 rounded-lg hover:bg-gray-50"
              onClick={() =>
                setMenuOpen(
                  !menuOpen
                )
              }
            >
              ☰
            </button>

            <p className="text-sm font-semibold text-gray-900 capitalize">
              {tab}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
              {appliedDateFrom ||
              appliedDateTo
                ? `${formatDateLabel(
                    appliedDateFrom
                  )} ${
                    appliedDateTo
                      ? `até ${formatDateLabel(
                          appliedDateTo
                        )}`
                      : ""
                  }`
                : "Todos os períodos"}
            </span>

            <button
              onClick={() =>
                load(
                  password,
                  appliedDateFrom,
                  appliedDateTo
                )
              }
              className="text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg"
            >
              Atualizar
            </button>
          </div>
        </header>

        {/* MENU MOBILE */}

        {menuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 p-2 flex gap-1 overflow-x-auto">
            {menu.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setTab(m.id);
                  setMenuOpen(
                    false
                  );
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  tab === m.id
                    ? "bg-teal-50 text-teal-800"
                    : "text-gray-600"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

          {/* ================================================== */}
          {/* FILTRO */}
          {/* ================================================== */}

          <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm">

            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900">
                Período
              </p>

              <p className="text-xs text-gray-500 mt-0.5">
                Selecione um período para atualizar todos os dados do dashboard.
              </p>
            </div>

            {/* PRESETS */}

            <div className="flex flex-wrap gap-2 mb-4">

              {[
                {
                  id: "hoje" as Preset,
                  label: "Hoje",
                },
                {
                  id: "ontem" as Preset,
                  label: "Ontem",
                },
                {
                  id: "semana" as Preset,
                  label: "Esta semana",
                },
                {
                  id: "mes" as Preset,
                  label: "Este mês",
                },
                {
                  id: "7dias" as Preset,
                  label: "Últimos 7 dias",
                },
                {
                  id: "30dias" as Preset,
                  label: "Últimos 30 dias",
                },
                {
                  id: "ano" as Preset,
                  label: "Este ano",
                },
                {
                  id: "personalizado" as Preset,
                  label: "Personalizado",
                },
              ].map(
                (item) => (
                  <button
                    key={
                      item.id
                    }
                    onClick={() =>
                      aplicarPreset(
                        item.id
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      preset ===
                      item.id
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {
                      item.label
                    }
                  </button>
                )
              )}

              <button
                onClick={
                  limparFiltro
                }
                disabled={
                  loading ||
                  (!dateFrom &&
                    !dateTo &&
                    !appliedDateFrom &&
                    !appliedDateTo)
                }
                className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Limpar
              </button>
            </div>

            {/* DATAS */}

            <div className="flex flex-col lg:flex-row lg:items-end gap-3">

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Data inicial
                </label>

                <input
                  type="date"
                  value={
                    dateFrom
                  }
                  onChange={(e) => {
                    setDateFrom(
                      e.target.value
                    );
                    setPreset(
                      "personalizado"
                    );
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Data final
                </label>

                <input
                  type="date"
                  value={
                    dateTo
                  }
                  onChange={(e) => {
                    setDateTo(
                      e.target.value
                    );
                    setPreset(
                      "personalizado"
                    );
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <button
                onClick={
                  aplicarFiltro
                }
                disabled={
                  loading
                }
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {loading
                  ? "Carregando..."
                  : "Aplicar filtro"}
              </button>
            </div>

            {(appliedDateFrom ||
              appliedDateTo) && (
              <div className="mt-4 px-3 py-2.5 bg-teal-50 rounded-xl">
                <p className="text-xs text-teal-700">
                  <strong>
                    Filtro ativo:
                  </strong>{" "}
                  {formatDateLabel(
                    appliedDateFrom
                  )}{" "}
                  {appliedDateTo
                    ? `até ${formatDateLabel(
                        appliedDateTo
                      )}`
                    : ""}
                </p>
              </div>
            )}
          </div>

          {/* ================================================== */}
          {/* DASHBOARD */}
          {/* ================================================== */}

          {tab ===
            "dashboard" && (
            <>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  Boas vindas
                </h1>

                <p className="text-sm text-gray-500">
                  Confira o que está acontecendo no seu checkout
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">
                  Volume de vendas
                </p>

                <p className="text-3xl md:text-4xl font-bold text-teal-700">
                  {formatBRL(
                    stats?.volume ||
                      0
                  )}
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  Apenas pedidos marcados como pago ·{" "}
                  {stats?.pixPagos ||
                    0}{" "}
                  venda(s)
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Funil de Vendas
                  </p>

                  {stats && (
                    <Funnel
                      funil={
                        stats.funil
                      }
                    />
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Taxa de conversão PIX
                  </p>

                  <p className="text-3xl font-bold text-teal-700">
                    {stats?.conversaoPix ??
                      0}
                    %
                  </p>

                  <p className="text-[11px] text-gray-400 mb-3">
                    {stats?.pixPagos ||
                      0}{" "}
                    pagos de{" "}
                    {stats?.pixGerados ||
                      0}{" "}
                    gerados
                  </p>

                  <LineChart />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label:
                      "PIX gerados",
                    value:
                      String(
                        stats?.pixGerados ??
                          0
                      ),
                  },
                  {
                    label:
                      "PIX pagos",
                    value:
                      String(
                        stats?.pixPagos ??
                          0
                      ),
                  },
                  {
                    label:
                      "Carrinhos abandonados",
                    value:
                      String(
                        stats?.abandonados ??
                          0
                      ),
                  },
                  {
                    label:
                      "Ticket médio",
                    value:
                      formatBRL(
                        stats?.ticketMedio ||
                          0
                      ),
                  },
                ].map((k) => (
                  <div
                    key={
                      k.label
                    }
                    className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
                  >
                    <p className="text-[11px] text-gray-500">
                      {k.label}
                    </p>

                    <p className="text-xl font-bold text-gray-900 mt-2">
                      {k.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-900">
                    Atividade recente
                  </p>
                </div>

                {recentes.filter(
                  (l) =>
                    l.nome ||
                    l.telefone
                ).length ===
                0 ? (
                  <p className="p-6 text-sm text-gray-400 text-center">
                    Nenhum lead neste período
                  </p>
                ) : (
                  recentes
                    .filter(
                      (l) =>
                        l.nome ||
                        l.telefone
                    )
                    .slice(
                      0,
                      15
                    )
                    .map(
                      (
                        lead
                      ) => (
                        <LeadRow
                          key={
                            lead.row
                          }
                          lead={
                            lead
                          }
                          showPaidBtn
                        />
                      )
                    )
                )}
              </div>
            </>
          )}

          {/* ================================================== */}
          {/* VENDAS */}
          {/* ================================================== */}

          {tab ===
            "vendas" && (
            <>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Vendas
                </h1>

                <p className="text-sm text-gray-500">
                  Pedidos marcados como pago ·{" "}
                  {formatBRL(
                    stats?.volume ||
                      0
                  )}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {vendas.length ===
                0 ? (
                  <p className="p-6 text-sm text-gray-400 text-center">
                    Nenhuma venda neste período
                  </p>
                ) : (
                  vendas.map(
                    (
                      lead
                    ) => (
                      <LeadRow
                        key={
                          lead.row
                        }
                        lead={
                          lead
                        }
                      />
                    )
                  )
                )}
              </div>
            </>
          )}

          {/* ================================================== */}
          {/* CARRINHOS */}
          {/* ================================================== */}

          {tab ===
            "carrinhos" && (
            <>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Carrinhos abandonados
                </h1>

                <p className="text-sm text-gray-500">
                  Leads que não chegaram a pagar ·{" "}
                  {
                    carrinhos.length
                  }
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {carrinhos.length ===
                0 ? (
                  <p className="p-6 text-sm text-gray-400 text-center">
                    Nenhum carrinho abandonado neste período
                  </p>
                ) : (
                  carrinhos.map(
                    (
                      lead
                    ) => (
                      <LeadRow
                        key={
                          lead.row
                        }
                        lead={
                          lead
                        }
                      />
                    )
                  )
                )}
              </div>
            </>
          )}

          {/* ================================================== */}
          {/* PIX */}
          {/* ================================================== */}

          {tab ===
            "pix" && (
            <>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  PIX
                </h1>

                <p className="text-sm text-gray-500">
                  Gerados e aguardando confirmação
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {pixList.length ===
                0 ? (
                  <p className="p-6 text-sm text-gray-400 text-center">
                    Nenhum PIX neste período
                  </p>
                ) : (
                  pixList.map(
                    (
                      lead
                    ) => (
                      <LeadRow
                        key={
                          lead.row
                        }
                        lead={
                          lead
                        }
                        showPaidBtn
                      />
                    )
                  )
                )}
              </div>
            </>
          )}

          {/* ================================================== */}
          {/* CONFIG */}
          {/* ================================================== */}

          {tab ===
            "config" && (
            <>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Configurações
                </h1>

                <p className="text-sm text-gray-500">
                  Informações do painel
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3 text-sm text-gray-600">
                <p>
                  <strong>
                    Senha:
                  </strong>{" "}
                  definida em{" "}
                  <code className="text-xs bg-gray-50 px-1 rounded">
                    DASHBOARD_PASSWORD
                  </code>{" "}
                  na Vercel
                </p>

                <p>
                  <strong>
                    Dados:
                  </strong>{" "}
                  vêm da planilha Google (Apps Script)
                </p>

                <p>
                  <strong>
                    Marcar pago:
                  </strong>{" "}
                  use o botão na lista quando o PIX cair no extrato do banco
                </p>

                <p>
                  <strong>
                    Meta Ads:
                  </strong>{" "}
                  o evento{" "}
                  <code className="text-xs bg-gray-50 px-1 rounded">
                    Purchase
                  </code>{" "}
                  é enviado somente após marcar o pedido como pago.
                </p>

                <p>
                  <strong>
                    Filtro:
                  </strong>{" "}
                  permite selecionar Hoje, Ontem, Semana, Mês, períodos personalizados e outros intervalos.
                </p>

                <p>
                  <strong>
                    Fuso horário:
                  </strong>{" "}
                  configure o Apps Script para América/São Paulo
                </p>

                <button
                  onClick={() => {
                    sessionStorage.removeItem(
                      "dash_pwd"
                    );

                    setAuthed(
                      false
                    );

                    setPassword(
                      ""
                    );
                  }}
                  className="mt-2 text-sm text-red-600 font-medium"
                >
                  Sair do dashboard
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
