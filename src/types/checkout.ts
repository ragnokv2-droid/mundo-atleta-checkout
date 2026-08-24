export interface CustomerData {
  name: string;
  email: string;
  taxId: string; // CPF ou CNPJ
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

export interface CheckoutFormData extends CustomerData, AddressData {}

export interface PixResponse {
  id: string;
  amount: number;
  status: string;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

export type Step = 1 | 2 | 3;
