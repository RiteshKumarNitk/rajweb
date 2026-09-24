"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  );
}
