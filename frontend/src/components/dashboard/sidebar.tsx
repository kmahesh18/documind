"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  FileText, 
  Upload, 
  LogOut, 
  X,
  User,
  Sparkles
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Documents", icon: FileText },
  { href: "/dashboard/upload", label: "Upload", icon: Upload },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop - no blur */}
      {isOpen && (
        <div 
          className="fixed inset-0  z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - Solid background */}
      <div 
        className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Inner container with padding for curved look */}
        <div className="h-full flex flex-col p-3">
          {/* Main content area with rounded background */}
          <div className="flex-1 flex flex-col bg-neutral-900 rounded-2xl overflow-hidden">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white">DocuMind</span>
              </Link>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="px-3 py-2 flex-1">
              <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider px-3 mb-2">
                Menu
              </p>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-500/20' : 'bg-neutral-800/50'}`}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Profile Section */}
            <div className="p-3 mt-auto">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800/70 transition-colors cursor-pointer group">
                <Avatar className="h-10 w-10 ring-2 ring-neutral-700 group-hover:ring-emerald-500/50 transition-all">
                  <AvatarImage src={session?.user?.image || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-neutral-700 to-neutral-800 text-white">
                    {session?.user?.name?.charAt(0) || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {session?.user?.email || ""}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 text-sm text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
