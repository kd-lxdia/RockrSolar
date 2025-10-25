"use client"

import { Home, ArrowDownLeft, ArrowUpRight, Boxes, LogOut, User, FileText, AlertTriangle, Settings } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

const nav = [
  { label: "Home", icon: Home },
  { label: "Stock In", icon: ArrowUpRight },
  { label: "Stock Out", icon: ArrowDownLeft },
  { label: "Total Stock Available", icon: Boxes },
  { label: "Stock Alerts", icon: AlertTriangle },
  { label: "BOM Generation", icon: FileText },
  { label: "Settings", icon: Settings },
]

export function Sidebar({ onSelect }: { onSelect?: (key: "home" | "in" | "out" | "total" | "alerts" | "bom" | "settings") => void }) {
  const { username, role, logout } = useAuth();
  
  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0e0f12] border-r border-neutral-800 text-neutral-200">
      <div className="px-5 py-4 border-b border-neutral-800">
        <div className="text-xs uppercase tracking-widest text-blue-400">Tools</div>
      </div>
      <nav className="flex-1 overflow-auto">
        <ul className="px-2 py-3 space-y-1">
          {nav.map((n) => (
            <li key={n.label}>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (!onSelect) return
                  if (n.label === "Home") onSelect("home")
                  else if (n.label === "Stock In") onSelect("in")
                  else if (n.label === "Stock Out") onSelect("out")
                  else if (n.label === "Stock Alerts") onSelect("alerts")
                  else if (n.label === "BOM Generation") onSelect("bom")
                  else if (n.label === "Settings") onSelect("settings")
                  else onSelect("total")
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-900 text-sm",
                  n.label === "Home" && "bg-neutral-900",
                )}
              >
                <n.icon size={16} className="text-neutral-400" />
                <span className="text-neutral-100">{n.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* User Info and Logout */}
      <div className="border-t border-neutral-800">
        <div className="px-3 py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600/20 text-blue-400">
            <User size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-neutral-100 truncate">{username || "User"}</div>
            <div className="text-[10px] text-neutral-500 uppercase">{role || "guest"}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-950/50 transition-colors"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
