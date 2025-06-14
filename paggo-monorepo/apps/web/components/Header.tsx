// filepath: apps/web/components/Header.tsx
import Link from "next/link";
import { UserActions } from "./UserActions";
import { SessionUser } from "../types/types";

interface HeaderProps {
  user?: SessionUser | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Paggo OCR</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user && <UserActions />}
        </div>
      </div>
    </header>
  );
}
