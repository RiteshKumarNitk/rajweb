import { AppError } from "@/core/errors/app-error";

/**
 * 409 for a second Player/Coach application from the same account — whether
 * it comes from the form, an old tab or a direct API call. The message says
 * what to do instead for the status of the application they already have.
 */
export function duplicateApplicationError(kind: "player" | "coach", status: string): AppError {
  const portal = kind === "player" ? "Player Portal" : "Coach Portal";
  switch (status) {
    case "PENDING":
      return AppError.conflict(`Your ${kind} application is already under review.`);
    case "APPROVED":
      return AppError.conflict(`You are already a registered ${kind}.`);
    case "REJECTED":
      return AppError.conflict(`Your ${kind} application was returned — correct and resubmit it from the ${portal}.`);
    default:
      return AppError.conflict(`You already have a ${kind} application. Contact your district association.`);
  }
}
