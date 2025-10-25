"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Sidebar } from "@/components/sidebar"
import { RightSidebar } from "@/components/right-sidebar"
import { KPIs } from "@/components/kpis"
import { OverviewChart } from "@/components/overview-chart"
import StockPanels from "@/components/StockPanels.client"
import { HistoryTable } from "@/components/history-table"
import ClientOnly from "@/components/ClientOnly"
import { useInventory } from "@/lib/inventory-store-postgres"
import { exportAllEventsToExcel, exportCurrentStockToExcel } from "@/lib/exportExcel"
import BOMManagement from "@/components/BOMManagement.client"
import { LowStockAlert } from "@/components/LowStockAlert"
import { StockAlertsView } from "@/components/StockAlertsView"
import Settings from "@/components/Settings.client"

export default function Page() {
  const [openTable, setOpenTable] = useState<null | "in" | "out" | "total" | "alerts" | "bom" | "settings">(null)
  const [currentTime, setCurrentTime] = useState<string>("")
  const inventory = useInventory()
  const { role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !role) {
      router.push("/login")
    }
  }, [role, isLoading, router])

  useEffect(() => {
    // Update time on client side only to avoid hydration mismatch
    setCurrentTime(new Date().toLocaleTimeString())

    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    )
  }

  // Don't render dashboard if not logged in
  if (!role) {
    return null
  }

  return (
    <div className="h-screen bg-[#0b0c10] text-neutral-200">
      {/* Header */}
      <header className="hidden md:flex items-center justify-between gap-3 px-6 h-12 border-b border-neutral-800 bg-[#0e0f12]">
        <div className="flex items-center gap-3">
          <div className="w-64 shrink-0" />
          <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">
            {openTable === "bom" ? "BOM Generation" : openTable === "alerts" ? "Stock Alerts" : openTable === "settings" ? "Settings" : openTable ? openTable.toUpperCase() + " Stock" : "Overview Dashboard"}
          </div>
        </div>
        <div className="text-[10px] text-neutral-500">
          {currentTime || "Loading..."}
        </div>
      </header>

      {/* Main shell */}
      <div className="flex h-[calc(100vh-48px)] overflow-hidden">
        {/* Left sidebar */}
        <aside className="hidden md:block w-64 shrink-0 h-full border-r border-neutral-800 bg-[#0e0f12] overflow-y-auto">
          <Sidebar
            onSelect={(key) => {
              if (key === "home") setOpenTable(null)
              else setOpenTable(key)
            }}
          />
        </aside>

        {/* Central content */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-3 md:p-6">
          {openTable === "alerts" ? (
            /* Stock Alerts Page */
            <>
              <div className="mb-3 md:mb-4">
                <h1 className="text-white font-extrabold tracking-[0.15em] uppercase text-xl md:text-2xl">
                  Stock Alerts
                </h1>
                <div className="text-[11px] text-neutral-500">
                  Monitor missing, low, and critical stock levels
                </div>
              </div>
              <StockAlertsView />
            </>
          ) : openTable === "bom" ? (
            /* BOM Management Page */
            <>
              <div className="mb-3 md:mb-4">
                <h1 className="text-white font-extrabold tracking-[0.15em] uppercase text-xl md:text-2xl">
                  BOM Generation
                </h1>
                <div className="text-[11px] text-neutral-500">
                  Create and manage Bill of Materials for customer projects
                </div>
              </div>
              <BOMManagement />
            </>
          ) : openTable === "settings" ? (
            /* Settings Page */
            <>
              <div className="mb-3 md:mb-4">
                <h1 className="text-white font-extrabold tracking-[0.15em] uppercase text-xl md:text-2xl">
                  Settings
                </h1>
                <div className="text-[11px] text-neutral-500">
                  Configure type and HSN code mappings
                </div>
              </div>
              <Settings />
            </>
          ) : openTable === "in" || openTable === "out" || openTable === "total" ? (
            /* Stock Management Pages (IN/OUT/TOTAL) - Now showing in main area */
            <>
              <div className="mb-3 md:mb-4">
                <h1 className="text-white font-extrabold tracking-[0.15em] uppercase text-xl md:text-2xl">
                  {openTable === "in" ? "Stock In" : openTable === "out" ? "Stock Out" : "Total Inventory"}
                </h1>
                <div className="text-[11px] text-neutral-500">
                  {openTable === "in" ? "Add new inventory items" : openTable === "out" ? "Record inventory usage" : "View complete inventory"}
                </div>
              </div>
              
              {/* Stock Controls at Top */}
              <div className="mb-4">
                <StockPanels mode={openTable} />
              </div>

              {/* History Table Below */}
              <div className="mt-6">
                <h2 className="text-xs tracking-wider text-neutral-400 mb-3">
                  {openTable === "in" ? "STOCK IN HISTORY" : openTable === "out" ? "STOCK OUT HISTORY" : "COMPLETE TRANSACTION HISTORY"}
                </h2>
                <HistoryTable mode={openTable === "total" ? "total" : openTable === "in" ? "in" : "out"} />
              </div>
            </>
          ) : (
            /* Home Dashboard - Default View */
            <>
              <div className="mb-3 md:mb-4">
                <h1 className="text-white font-extrabold tracking-[0.15em] uppercase text-xl md:text-2xl">
                  Overview Dashboard
                </h1>
                <div className="text-[11px] text-neutral-500">
                  Real-time inventory monitoring and analytics
                </div>
              </div>

              {/* KPIs */}
              <KPIs />

              {/* Low Stock Alert */}
              <div className="mt-3 md:mt-4">
                <LowStockAlert />
              </div>

              {/* Chart */}
              <div className="mt-3 md:mt-4">
                <OverviewChart />
              </div>

              {/* Quick Actions */}
              <section className="mt-6 space-y-3">
                <h2 className="text-xs tracking-wider text-neutral-400">
                  Quick Actions
                </h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={async () => await exportAllEventsToExcel(inventory.events)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    📊 Export Full History
                  </button>
                  <button
                    onClick={async () => await exportCurrentStockToExcel(inventory.events)}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    📦 Export Current Stock
                  </button>
                  <button
                    onClick={() => setOpenTable("in")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    ➕ Add Stock In
                  </button>
                  <button
                    onClick={() => setOpenTable("out")}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    ➖ Record Stock Out
                  </button>
                  <button
                    onClick={() => setOpenTable("bom")}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    📋 Create BOM
                  </button>
                </div>
              </section>
            </>
          )}
        </main>

        {/* Right sidebar */}
        <ClientOnly fallback={<div className="hidden lg:block w-80 shrink-0" />}>
          <RightSidebar />
        </ClientOnly>
      </div>
    </div>
  )
}
