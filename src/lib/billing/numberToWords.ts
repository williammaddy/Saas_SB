/**
 * Converts a numeric amount into Indian Currency Words format.
 * Example: 123456.50 => "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Fifty Paise Only"
 */
export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Rupees Zero Only";

  const absolute = Math.abs(amount);
  const rupees = Math.floor(absolute);
  const paise = Math.round((absolute - rupees) * 100);

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(n: number): string {
    let str = "";
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 10 && n <= 19) {
      str += teens[n - 10] + " ";
    } else if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      if (n % 10 > 0) {
        str += units[n % 10] + " ";
      }
    } else if (n > 0) {
      str += units[n] + " ";
    }
    return str.trim();
  }

  function numToWords(n: number): string {
    if (n === 0) return "";
    let str = "";

    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;

    if (crore > 0) {
      str += convertChunk(crore) + " Crore ";
    }
    if (lakh > 0) {
      str += convertChunk(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      str += convertChunk(thousand) + " Thousand ";
    }
    if (n > 0) {
      str += convertChunk(n) + " ";
    }

    return str.trim();
  }

  let result = "Rupees " + numToWords(rupees);
  if (paise > 0) {
    result += " and " + convertChunk(paise) + " Paise";
  }
  result += " Only";

  return result;
}

/**
 * Format currency with Indian thousands separator and 2 decimal places.
 * Example: 123456.5 => "₹ 1,23,456.50"
 */
export function formatIndianCurrency(amount: number | string, currencySymbol: string = "₹"): string {
  const num = Number(amount) || 0;
  const parts = num.toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== "") {
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }

  return `${currencySymbol} ${integerPart}.${decimalPart}`;
}
