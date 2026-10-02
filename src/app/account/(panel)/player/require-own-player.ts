import { redirect } from "next/navigation";
import { getCurrentUser } from "@/security/auth/session";
import { getRegistrationChoice } from "@/modules/applications/registration-choice.server";
import { getOwnPlayer } from "@/modules/players/own-player.server";

/**
 * For the Player sub-pages: the signed-in user's own Player record. Without
 * one (or when the account holds another registration) the user is sent to
 * /account/player, which shows the application form or the locked notice.
 */
export async function requireOwnPlayer() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");
  const [choice, player] = await Promise.all([getRegistrationChoice(authUser.id), getOwnPlayer(authUser.id)]);
  if (!player || !choice.allowed.includes("player")) redirect("/account/player");
  return { authUser, player };
}
