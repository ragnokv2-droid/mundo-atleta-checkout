"use client";

import { useEffect, useState } from "react";

type Stats = {
  volume: number;
  pixGerados: number;
  pixPagos: number;
  abandonados: number;
  ticketMedio: number;
  conversaoPix: number;
  funil: { dados: number; entrega: number; pagamento: number; pix: number };
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

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function waLink(phone: string) {
  const n = phone.replace(/\D/g, "");
  if (!n) return "#";
  const full = n.startsWith("55") ? n : `55${n}`;
  return `https://wa.me/${full}`;
}

/** Gráfico de linha simples (SVG) */
function LineChart({ percent }: { percent: number }) {
  // curva ilustrativa baseada na conversão
  const points = [8, 12, 10, 15, 18, 14, 20, 22, 19, 25, 28, 24];
  const max = 30;
  const w = 280;
  const h = 100;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - (p / max) * h;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#area)"
      />
      <path d={path} fill="none" stroke="#0d9488" strokeWidth="2.5" />
    </svg>
  );
}

/** Funil visual */
function Funnel({
  funil,
}: {
  funil: { dados: number; entrega: number; pagamento: number; pix: number };
}) {
  const steps = [
    { label: "Dados pessoais", value: funil.dados, width: "100%", color: "bg-teal-600" },
    { label: "Entrega", value: funil.entrega, width: "85%", color: "bg-teal-500" },
    { label: "Pagamento", value: funil.pagamento, width: "68%", color: "bg-teal-400" },
    { label: "PIX gerado", value: funil.pix, width: "52%", color: "bg-teal-300" },
  ];

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {steps.map((s) => (
        <div key={s.label} className="w-full flex flex-col items-center">
          <div
            className={`${s.color} text-white text-xs font-medium py-2.5 px-3 rounded-lg text-center shadow-sm transition-all`}
            style={{ width: s.width }}
          >
            {s.label} · {s.value}%
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentes, setRecentes] = useState<Lead[]>([]);

  async function load(pwd: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard?password=${encodeURIComponent(pwd)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Senha incorreta");
        setAuthed(false);
        return;
      }
      setStats(json.stats);
      setRecentes(json.recentes || []);
      setAuthed(true);
      sessionStorage.setItem("dash_pwd", pwd);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("dash_pwd");
    if (saved) {
      setPassword(saved);
      load(saved);
    }
  }, []);

  async function markPaid(row: number) {
    if (!confirm("Marcar este pedido como PAGO?")) return;
    const res = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, row }),
    });
    if (res.ok) await load(password);
    else alert("Erro ao marcar como pago");
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              MA
            </div>
            <div>
              <p className="font-bold text-gray-900">Mundo Atleta</p>
              <p className="text-xs text-gray-400">Dashboard</p>
            </div>
          </div>
          <input
            type="password"
            placeholder="Senha de acesso"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(password)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          />
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button
            onClick={() => load(password)}
            disabled={loading || !password}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
            MA
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Mundo Atleta</p>
            <p className="text-[10px] text-gray-400">Checkout · Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            Hoje
          </span>
          <button
            onClick={() => load(password)}
            className="text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg"
          >
            Atualizar
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Boas vindas
          </h1>
          <p className="text-sm text-gray-500">
            Confira o que está acontecendo no seu checkout
          </p>
        </div>

        {/* Volume de vendas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden">
          <p className="text-xs text-gray-500 mb-1">Volume de vendas</p>
          <p className="text-3xl md:text-4xl font-bold text-teal-700">
            {formatBRL(stats?.volume || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Apenas pedidos marcados como <strong>pago</strong> ·{" "}
            {stats?.pixPagos || 0} venda(s)
          </p>
          <div className="absolute right-6 top-6 opacity-10">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-teal-600">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
            </svg>
          </div>
        </div>

        {/* Funil + Taxa conversão */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Funil de Vendas</p>
              <span className="text-[10px] text-gray-400">% que avança</span>
            </div>
            {stats && <Funnel funil={stats.funil} />}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-900">
                Taxa de conversão PIX
              </p>
            </div>
            <p className="text-3xl font-bold text-teal-700 mb-1">
              {stats?.conversaoPix ?? 0}%
            </p>
            <p className="text-[11px] text-gray-400 mb-3">
              {stats?.pixPagos ?? 0} pagos de {stats?.pixGerados ?? 0} gerados
            </p>
            <LineChart percent={stats?.conversaoPix ?? 0} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "PIX gerados",
              value: String(stats?.pixGerados ?? 0),
              hint: "QR Codes criados",
              icon: "▦",
            },
            {
              label: "PIX pagos",
              value: String(stats?.pixPagos ?? 0),
              hint: "Marcados manualmente",
              icon: "✓",
            },
            {
              label: "Carrinhos abandonados",
              value: String(stats?.abandonados ?? 0),
              hint: "Pararam antes do PIX",
              icon: "🛒",
            },
            {
              label: "Ticket médio",
              value: formatBRL(stats?.ticketMedio || 0),
              hint: "Entre os pagos",
              icon: "🏷",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="text-[11px] text-gray-500 leading-tight">{k.label}</p>
                <span className="text-sm opacity-40">{k.icon}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{k.value}</p>
              <p className="text-[10px] text-gray-400 mt-1">{k.hint}</p>
            </div>
          ))}
        </div>

        {/* Atividade recente */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Atividade recente</p>
              <p className="text-xs text-gray-400">
                Marque como pago quando o PIX cair no extrato
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
            {recentes.length === 0 && (
              <p className="p-6 text-sm text-gray-400 text-center">
                Nenhum lead ainda. Assim que alguém usar o checkout, aparece aqui.
              </p>
            )}
            {recentes.map((lead) => {
              const status = String(lead.status || "").toLowerCase();
              const isPago = status === "pago";
              const isPix = status === "aguardando_pix";

              return (
                <div
                  key={lead.row}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {lead.nome || "Sem nome"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lead.telefone || "—"} · R$ {lead.valor || "0"}
                      {lead.frete ? ` · ${lead.frete}` : ""}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isPago
                          ? "bg-green-50 text-green-700"
                          : isPix
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {lead.status || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.telefone && (
                      <a
                        href={waLink(lead.telefone)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        WhatsApp
                      </a>
                    )}
                    {isPix && (
                      <button
                        onClick={() => markPaid(lead.row)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                      >
                        Marcar pago
                      </button>
                    )}
                    {isPago && (
                      <span className="text-xs text-gray-400 px-2">Pago ✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
