"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function UserActions() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleNavigateToDocuments = () => {
    router.push("/documents");
  };

  const buttonClassName =
    "px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors duration-150";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleNavigateToDocuments}
        className={buttonClassName}
      >
        Uploaded Documents
      </button>
      <button type="button" onClick={handleSignOut} className={buttonClassName}>
        Sign Out
      </button>
    </div>
  );
}
