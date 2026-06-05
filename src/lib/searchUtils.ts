/**
 * Robust matching helper for Order Search.
 * Supports normalization for Arabic characters, Latin accents, removal of diacritics,
 * space-less matching comparison, and exact digit-based phone / ID checking.
 */
export function matchesRobustSearch(
  sale: { "Order ID"?: string | number; "Full name"?: string; "Phone"?: string | number },
  query: string
): boolean {
  if (!query) return true;

  const qClean = query.toLowerCase().trim();
  const qDigits = qClean.replace(/\D/g, "");

  // Safe string normalization
  const orderId = sale["Order ID"] !== undefined && sale["Order ID"] !== null ? String(sale["Order ID"]) : "";
  const name = sale["Full name"] !== undefined && sale["Full name"] !== null ? String(sale["Full name"]) : "";
  const phone = sale["Phone"] !== undefined && sale["Phone"] !== null ? String(sale["Phone"]) : "";

  // 1. Check phone/digit-based match if query contains digits
  if (qDigits.length > 0) {
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.includes(qDigits)) {
      return true;
    }
    const orderIdDigits = orderId.replace(/\D/g, "");
    if (orderIdDigits.includes(qDigits)) {
      return true;
    }
  }

  // 2. Normalize and check string match (accents, Arabic, spaces)
  const normalize = (str: string): { originalNorm: string; spaceLess: string } => {
    let s = str.toLowerCase().trim();

    // Normalize Latin accents (e.g. é -> e, à -> a)
    try {
      s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch (e) {
      // Fallback if normalize is unsupported structurally
    }

    // Strip Arabic diacritics / Harakat
    s = s.replace(/[\u064B-\u065F]/g, "");

    // Normalize Arabic structural variants to common forms
    s = s.replace(/[أإآٱ]/g, "ا");
    s = s.replace(/[ى]/g, "ي");
    s = s.replace(/[ة]/g, "ه");

    // Also replace double spaces / keep clean
    s = s.replace(/\s+/g, " ");

    const sl = s.replace(/\s+/g, "");

    return { originalNorm: s, spaceLess: sl };
  };

  const qNorm = normalize(qClean);
  const nameNorm = normalize(name);
  const orderIdNorm = normalize(orderId);
  const phoneNorm = normalize(phone);

  // Substring matching on normalized version
  if (
    nameNorm.originalNorm.includes(qNorm.originalNorm) ||
    orderIdNorm.originalNorm.includes(qNorm.originalNorm) ||
    phoneNorm.originalNorm.includes(qNorm.originalNorm)
  ) {
    return true;
  }

  // Substring matching on spaceless version of search query
  if (qNorm.spaceLess.length > 0) {
    if (
      nameNorm.spaceLess.includes(qNorm.spaceLess) ||
      orderIdNorm.spaceLess.includes(qNorm.spaceLess) ||
      phoneNorm.spaceLess.includes(qNorm.spaceLess)
    ) {
      return true;
    }
  }

  return false;
}
