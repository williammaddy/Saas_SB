/**
 * Indian State and Union Territory GST State Codes (2-digit)
 */
export interface GstState {
  code: string;
  name: string;
}

export const GST_STATES: GstState[] = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

/**
 * Validates a 15-character Indian GSTIN
 * Format: 2 digits (state code) + 10 chars (PAN) + 1 digit (entity number) + 1 char ('Z') + 1 check digit
 */
export function isValidGstin(gstin: string): boolean {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
}

/**
 * Extracts 2-digit state code from GSTIN
 */
export function getStateCodeFromGstin(gstin: string): string | null {
  if (!gstin || gstin.trim().length < 2) return null;
  const code = gstin.trim().substring(0, 2);
  const exists = GST_STATES.some((s) => s.code === code);
  return exists ? code : null;
}

/**
 * Determines whether the transaction is inter-state (IGST) or intra-state (CGST + SGST)
 * If customer state code is not specified (e.g. walk-in customer), it is treated as intra-state.
 */
export function isInterStateTransaction(
  businessStateCode?: string | null,
  customerStateCode?: string | null
): boolean {
  if (!businessStateCode || !customerStateCode) {
    return false; // Default to intra-state (local)
  }
  return businessStateCode.trim() !== customerStateCode.trim();
}
