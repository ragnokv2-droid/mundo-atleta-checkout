export interface CustomerData {
  name: string;
  email: string;
  taxId: string;
  cellphone: string;
}

export interface AddressData {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export type ShippingMethod = "correios" | "sedex";

export interface ShippingOption {
  id: ShippingMethod;
  name: string;
  description: string;
  price: number; // em centavos
  days: string;
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "correios",
    name: "CORREIOS",
    description: "envio por Correios",
    price: 0,
    days: "Prazo de 2 a 4 dias",
  },
  {
    id: "sedex",
    name: "SEDEX",
    description: "envio por FULL",
    price: 840, // R$ 8,40
    days: "Prazo de 1 a 2 dias",
  },
];

export interface CheckoutFormData extends CustomerData, AddressData {
  shipping?: ShippingMethod;
}

export interface PixResponse {
  id: string;
  amount: number;
  status: string;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

export type Step = 1 | 2 | 3;
