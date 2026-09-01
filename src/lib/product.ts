export const PRODUCT = {
  id: "ab-tomic",
  name: "Aparelho Abdominal AB Tomic",
  originalPrice: 18990, // centavos
  pixPrice: 10440, // centavos (5% OFF)
  image: "/ab-tomic.png", // coloque a imagem em /public
  description: "Workout completo que combina abs crunch e 6 poderosos exercícios + cardio",
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
