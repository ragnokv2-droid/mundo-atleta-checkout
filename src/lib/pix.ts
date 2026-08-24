// Gera código PIX (BR Code) estático com valor

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export function generatePixBrCode(params: {
  key: string; // CNPJ, CPF, email, telefone ou aleatória
  name: string; // nome do recebedor (máx 25 caracteres)
  city: string; // cidade (máx 15 caracteres)
  amount: number; // valor em reais, ex: 104.40
  txid?: string; // identificador (opcional)
}): string {
  const { key, name, city, amount, txid = "***" } = params;

  const amountStr = amount.toFixed(2);

  const merchantAccount =
    tlv("00", "br.gov.bcb.pix") + tlv("01", key);

  const additionalData = tlv("05", txid.slice(0, 25));

  let payload = "";
  payload += tlv("00", "01"); // Payload Format Indicator
  payload += tlv("26", merchantAccount); // Merchant Account Information
  payload += tlv("52", "0000"); // Merchant Category Code
  payload += tlv("53", "986"); // Currency (BRL)
  payload += tlv("54", amountStr); // Amount
  payload += tlv("58", "BR"); // Country
  payload += tlv("59", name.slice(0, 25).toUpperCase()); // Name
  payload += tlv("60", city.slice(0, 15).toUpperCase()); // City
  payload += tlv("62", additionalData); // Additional Data
  payload += "6304"; // CRC16 placeholder

  const crc = crc16(payload);
  return payload + crc;
}
