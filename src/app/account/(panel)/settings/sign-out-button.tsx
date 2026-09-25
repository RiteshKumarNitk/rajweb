"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <Button
      variant="outline"
      onClick={handleSignOut}
      disabled={isLoading}
      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 font-medium transition-all"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out of Account
        </>
      )}
    </Button>
  );
}
