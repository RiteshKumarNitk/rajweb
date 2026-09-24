export type MembershipTypeKey = "club" | "school" | "academy";

export interface MembershipPricing {
  new: number;
  renewal: number;
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
