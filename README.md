# Mundo Atleta – Checkout Transparente (Next.js + AbacatePay)

Checkout em 3 etapas com desconto PIX, integração ViaCEP e AbacatePay.

## Produto

- **Aparelho Abdominal AB Tomic**
- Preço normal: **R$ 109,90**
- Preço no PIX (5% OFF): **R$ 104,40**

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local e coloque sua chave da AbacatePay

# 3. Coloque a imagem do produto em:
#    public/ab-tomic.png

# 4. Rodar
npm run dev
```

Acesse: http://localhost:3000

## Deploy na Vercel

1. Suba o projeto no GitHub
2. Importe no [vercel.com](https://vercel.com)
3. Em **Settings → Environment Variables** adicione:
   - `ABACATEPAY_API_KEY` = sua chave (dev ou produção)
4. Deploy

## Estrutura das etapas

1. **Identificação** → Nome, e-mail, CPF, celular
2. **Entrega** → CEP (busca automática ViaCEP) + endereço completo
3. **Pagamento** → Gera QR Code PIX via API AbacatePay (`/v2/transparents/create`)

## Webhook (opcional)

Para receber confirmação de pagamento em tempo real, configure o webhook no dashboard da AbacatePay apontando para uma rota sua (ex: `/api/webhook`).

## Personalização

- Logo: edite `src/components/Header.tsx` ou coloque uma imagem em `/public`
- Cores: `tailwind.config.ts`
- Preço / produto: `src/lib/product.ts`
