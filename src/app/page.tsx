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

  // Evento ao abrir o checkout
  useEffect(() => {
    trackMetaEvent("InitiateCheckout", {
      content_name: PRODUCT.name,
      currency: "BRL",
      value: PRODUCT.pixPrice / 100,
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto shadow-xl">
      <Header />
      <PromoBanner />
      <StepIndicator current={step} />
      <ProductSummary
        showOriginal={step < 3}
        shippingPrice={shippingPrice}
