import { Order, Purchase, Payment, Expense } from "./types";

export const MOROCCAN_CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Tanger",
  "Agadir",
  "Fès",
  "Salé",
  "Meknès",
  "Oujda",
  "Kénitra",
  "Tétouan",
  "Témara",
  "Safi",
  "Laâyoune",
  "Mohammedia",
  "El Jadida",
  "Khouribga",
  "Béni Mellal",
  "Nador",
  "Taroudant"
];

export const CONDITIONS = [
  { value: "Confirmed", label: "Confirmé", bg: "bg-emerald-950", text: "text-emerald-400" },
  { value: "Call again", label: "Rappeler", bg: "bg-amber-950", text: "text-amber-400" },
  { value: "WHATSAPP", label: "WhatsApp", bg: "bg-green-950", text: "text-green-400" },
  { value: "Ne repond pas", label: "Ne répond pas", bg: "bg-red-600", text: "text-white" },
  { value: "Anule", label: "Annulé", bg: "bg-red-600", text: "text-white" },
  { value: "Pas intéresse", label: "Pas intéressé", bg: "bg-red-600", text: "text-white" }
];

export const DELIVERY_STATUSES = [
  { value: "Delivered", label: "Delivered", bg: "bg-emerald-900/40 text-emerald-400 border border-emerald-500/20" },
  { value: "Retour", label: "Retour", bg: "bg-red-950/40 text-red-400 border border-red-500/10" },
  { value: "annuler", label: "Annulé", bg: "bg-amber-950/40 text-amber-400 border border-amber-500/10" },
  { value: "Client Injoignable", label: "Client Injoignable", bg: "bg-orange-950/40 text-orange-400 border border-orange-500/10" },
  { value: "Annulé Au Téléphone", label: "Annulé Au Téléphone", bg: "bg-rose-950/50 text-rose-400 border border-rose-500/15" },
  { value: "Annulé Sur Place", label: "Annulé Sur Place", bg: "bg-red-950/60 text-red-300 border border-red-500/25" }
];

export const LIVREURS = [
  "CATHEDIS"
];

export function formatCurrency(amount: number): string {
  // French format: spaces as thousands separator, dot/comma for decimals
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return `${formatted} DH`;
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "-";
  return dateStr.replace("T", " ");
}

// Phone validator: 10 digits starting with 0
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.trim();
  return /^0[0-9]{9}$/.test(cleanPhone);
}

// Generate WhatsApp Url
export function generateWhatsAppUrl(phone: string): string {
  const clean = phone.trim().replace(/\s+/g, "");
  if (clean.startsWith("0")) {
    return `https://wa.me/212${clean.slice(1)}`;
  }
  return `https://wa.me/${clean}`;
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  const token = sessionStorage.getItem("google_sheets_oauth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchSheetData(sheetName: string): Promise<{ success: boolean; rows: any[]; headers: string[]; error?: string }> {
  try {
    const res = await fetch(`/api/get-sheet?sheetName=${encodeURIComponent(sheetName)}`);
    return await res.json();
  } catch (e: any) {
    return { success: false, rows: [], headers: [], error: e.toString() };
  }
}

export async function saveGenericRow(sheetName: string, rowNum: number | undefined, values: any): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/save-generic`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ sheetName, rowNum, values })
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.toString() };
  }
}

export async function updateOrderRow(sheetName: string, rowNum: number, updates: any): Promise<{ success: boolean; updatedColumns?: number; error?: string }> {
  try {
    const res = await fetch(`/api/update-order-row`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ sheetName, rowNum, updates })
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.toString() };
  }
}

export async function deleteGenericRow(sheetName: string, rowNum: number): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/delete-generic`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ sheetName, rowNum })
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.toString() };
  }
}

// Calculate order delivery statistics and outputs calculated rows
export function getCalculatedFields(
  productCode: string,
  variantPrice: number,
  quantity: number,
  deliveryStatus: string,
  purchases: Purchase[]
) {
  // Find unit cost and supplier in Purchases matching product code
  const purchase = purchases.find(p => p.Code && p.Code.toUpperCase() === productCode.toUpperCase());
  const unitCost = purchase ? purchase["Prix Unit"] : 0;
  const supplierName = purchase ? purchase["Fournisseur"] : "";

  let totalPrice = 0;
  let finalUnitPrice = unitCost;
  let deliveryFee = 0;
  let profit = 0;
  let supplierPrice = 0;
  let finalSupplier = "";

  if (deliveryStatus === "Delivered") {
    totalPrice = variantPrice * quantity;
    finalUnitPrice = unitCost;
    deliveryFee = 40;
    supplierPrice = unitCost * quantity;
    profit = totalPrice - supplierPrice - deliveryFee;
    finalSupplier = supplierName;
  } else if (["Retour", "annuler", "Client Injoignable", "Annulé Au Téléphone", "Annulé Sur Place"].includes(deliveryStatus)) {
    // Zero out numeric fields as per Section 4.1
    totalPrice = 0;
    finalUnitPrice = 0;
    deliveryFee = 0;
    profit = 0;
    supplierPrice = 0;
    finalSupplier = "";
  } else {
    // If pending / other (no delivery status yet)
    // Wait, by default does it have any calculations? No, all numeric = 0 except what is set
    totalPrice = 0;
    finalUnitPrice = 0;
    deliveryFee = 0;
    profit = 0;
    supplierPrice = 0;
    finalSupplier = "";
  }

  return {
    "Total price": totalPrice,
    "prix d'achat": finalUnitPrice,
    "Frais livraison": deliveryFee,
    "Bénéfice": profit,
    "Fournisseur": finalSupplier,
    "Fourni price": supplierPrice
  };
}
