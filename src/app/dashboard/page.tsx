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
    if (res.ok) {
      await load(password);
    } else {
      alert("Erro ao marcar como pago");
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Mundo Atleta</h1>
          <p className="text-sm text-gray-500 mb-6">Acesso ao dashboard</p>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(password)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
            MA
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Mundo Atleta</p>
            <p className="text-[10px] text-gray-400">Dashboard</p>
          </div>
        </div>
        <button
          onClick={() => load(password)}
          className="text-xs text-teal-700 font-medium px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100"
        >
          Atualizar
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Boas vindas</h1>
          <p className="text-sm text-gray-500">Resumo do desempenho do checkout</p>
        </div>

        {/* Volume */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Volume de vendas (pagos)</p>
          <p className="text-3xl font-bold text-teal-700">
            {formatBRL(stats?.volume || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats?.pixPagos || 0} pedido(s) marcado(s) como pago
          </p>
        </div>

        {/* Funil + Conversão */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-4">Funil de Vendas</p>
            <div className="space-y-3">
              {[
                { label: "Dados pessoais", value: stats?.funil.dados ?? 0, color: "bg-teal-600" },
                { label: "Entrega", value: stats?.funil.entrega ?? 0, color: "bg-teal-500" },
                { label: "Pagamento", value: stats?.funil.pagamento ?? 0, color: "bg-teal-400" },
                { label: "PIX gerado", value: stats?.funil.pix ?? 0, color: "bg-teal-300" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-center">
            <p className="text-sm font-semibold text-gray-900 mb-2">Taxa de conversão PIX</p>
            <p className="text-4xl font-bold text-teal-700">
              {stats?.conversaoPix ?? 0}%
            </p>
            <p className="text-xs text-gray-400 mt-2">
              PIX pagos ÷ PIX gerados
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "PIX gerados", value: stats?.pixGerados ?? 0 },
            { label: "PIX pagos", value: stats?.pixPagos ?? 0 },
            { label: "Abandonados", value: stats?.abandonados ?? 0 },
            {
              label: "Ticket médio",
              value: formatBRL(stats?.ticketMedio || 0),
            },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
            >
              <p className="text-[11px] text-gray-500 mb-1">{k.label}</p>
              <p className="text-lg font-bold text-gray-900">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Lista recente */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-900">Atividade recente</p>
            <p className="text-xs text-gray-400">Clique em Pago quando confirmar o PIX no extrato</p>
          </div>
          <div className="divide-y divide-gray-50">
            {recentes.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Nenhum lead ainda</p>
            )}
            {recentes.map((lead) => (
              <div
                key={lead.row}
                className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {lead.nome || "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {lead.telefone} · R$ {lead.valor || "0"} ·{" "}
                    <span className="uppercase">{lead.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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
                  {String(lead.status).toLowerCase() !== "pago" &&
                    String(lead.status).toLowerCase() === "aguardando_pix" && (
                      <button
                        onClick={() => markPaid(lead.row)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100"
                      >
                        Marcar pago
                      </button>
                    )}
                  {String(lead.status).toLowerCase() === "pago" && (
                    <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500">
                      Pago
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
