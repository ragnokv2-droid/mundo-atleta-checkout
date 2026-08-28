"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import PromoBanner from "@/components/PromoBanner";
import StepIndicator from "@/components/StepIndicator";
import ProductSummary from "@/components/ProductSummary";
import Step1Identification from "@/components/Step1Identification";
import Step2Address from "@/components/Step2Address";
import Step3Payment from "@/components/Step3Payment";
import {
  Step,
  CustomerData,
  AddressData,
  ShippingMethod,
  SHIPPING_OPTIONS,
} from "@/types/checkout";
import { PRODUCT } from "@/lib/product";
import { trackMetaEvent } from "@/components/MetaPixel";

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>(1);

  const [customer, setCustomer] = useState<CustomerData>({
    name: "",
    email: "",
    taxId: "",
    cellphone: "",
  });

  const [address, setAddress] = useState<AddressData>({
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const [shipping, setShipping] = useState<ShippingMethod | null>(null);

  const shippingPrice =
    SHIPPING_OPTIONS.find((o) => o.id === shipping)?.price ?? 0;

  const totalAmount = PRODUCT.pixPrice + shippingPrice;

  useEffect(() => {
    trackMetaEvent("InitiateCheckout", {
      content_name: PRODUCT.name,
      currency: "BRL",
      value: PRODUCT.pixPrice / 100,
    });
  }, []);

  function saveLead(payload: Record<string, string | number>) {
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto shadow-xl">
      <Header />
      <PromoBanner />
      <StepIndicator current={step} />
      <ProductSummary
        showOriginal={step < 3}
        shippingPrice={shippingPrice}
        totalAmount={totalAmount}
      />

      {step === 1 && (
        <Step1Identification
          data={customer}
          onChange={setCustomer}
          onNext={() => {
            saveLead({
              nome: customer.name,
              email: customer.email,
              telefone: customer.cellphone,
              endereco: "",
              frete: "",
              valor: "",
              status: "abandonado_dados",
              etapa: 1,
            });
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <Step2Address
          data={address}
          shipping={shipping}
          onChange={setAddress}
          onShippingChange={setShipping}
          customerName={customer.name}
          onNext={() => {
            trackMetaEvent("AddPaymentInfo", {
              content_name: PRODUCT.name,
              currency: "BRL",
              value: totalAmount / 100,
            });
            saveLead({
              nome: customer.name,
              email: customer.email,
              telefone: customer.cellphone,
              endereco: `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state} - CEP ${address.zipCode}`,
              frete: shipping || "",
              valor: (totalAmount / 100).toFixed(2),
              status: "abandonado_frete",
              etapa: 2,
            });
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <Step3Payment
          formData={{
            ...customer,
            ...address,
            shipping: shipping || undefined,
          }}
          totalAmount={totalAmount}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
