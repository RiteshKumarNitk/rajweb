/** Formats a whole-rupee integer amount as INR, e.g. 1500 → "₹1,500". */
export function formatInrHelper(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
