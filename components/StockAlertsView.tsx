"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle, Package, AlertCircle, TrendingDown, XCircle } from "lucide-react";
import { useInventory } from "@/lib/inventory-store-postgres";
import { calculateRequiredInventory, findMissingStock } from "@/lib/bom-inventory-tracker";

interface StockItem {
  item: string;
  type: string;
  qty: number;
  status: "missing" | "critical" | "low" | "insufficient";
  requiredBy?: string[];
  shortfall?: number;
}

interface BOMRecord {
  id: string;
  name: string;
  project_in_kw: number;
  wattage_of_panels: number;
  table_option: string;
  phase: "SINGLE" | "TRIPLE";
  ac_wire: string;
  dc_wire: string;
  la_wire: string;
  earthing_wire: string;
  no_of_legs: number;
  front_leg: string;
  back_leg: string;
  roof_design: string;
  created_at: number;
}

const CRITICAL_THRESHOLD = 5;
const LOW_STOCK_THRESHOLD = 10;

export function StockAlertsView() {
  const inventory = useInventory();
  const [bomRecords, setBomRecords] = useState<BOMRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    const fetchBOMs = async () => {
      try {
        const response = await fetch("/api/bom");
        if (!response.ok) {
          setBomRecords([]);
          return;
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setBomRecords(data.data);
        }
      } catch (error) {
        console.warn("Error fetching BOM records:", error);
        setBomRecords([]);
      }
    };
    fetchBOMs();
  }, []);

  const lowStockItems = useMemo(() => {
    const stockMap: Record<string, Record<string, number>> = {};
    inventory.events.forEach((e) => {
      if (!stockMap[e.item]) stockMap[e.item] = {};
      if (!stockMap[e.item][e.type]) stockMap[e.item][e.type] = 0;
      stockMap[e.item][e.type] += e.kind === "IN" ? e.qty : -e.qty;
    });

    const alerts: StockItem[] = [];
    if (bomRecords.length > 0) {
      const requiredInventory = calculateRequiredInventory(bomRecords);
      const currentInventoryMap = new Map<string, number>();
      Object.entries(stockMap).forEach(([item, types]) => {
        Object.entries(types).forEach(([type, qty]) => {
          const key = item + "::" + type;
          currentInventoryMap.set(key, qty);
        });
      });
      const missingStock = findMissingStock(requiredInventory, currentInventoryMap);
      missingStock.forEach(missing => {
        alerts.push({
          item: missing.item,
          type: missing.type,
          qty: missing.currentQty,
          status: missing.status,
          requiredBy: missing.requiredBy,
          shortfall: missing.shortfall
        });
      });
    }

    Object.entries(stockMap).forEach(([item, types]) => {
      Object.entries(types).forEach(([type, qty]) => {
        const alreadyAlerted = alerts.some((a) => a.item === item && a.type === type);
        if (!alreadyAlerted) {
          if (qty === 0 || qty < 0) {
            alerts.push({ item, type, qty, status: "missing" });
          } else if (qty > 0 && qty <= LOW_STOCK_THRESHOLD) {
            alerts.push({ item, type, qty, status: qty <= CRITICAL_THRESHOLD ? "critical" : "low" });
          }
        }
      });
    });

    return alerts.sort((a, b) => {
      const statusOrder = { missing: 0, insufficient: 1, critical: 2, low: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (a.shortfall && b.shortfall) return b.shortfall - a.shortfall;
      return a.qty - b.qty;
    });
  }, [inventory.events, bomRecords]);

  const filteredItems = useMemo(() => {
    if (filterStatus === "all") return lowStockItems;
    return lowStockItems.filter(item => item.status === filterStatus);
  }, [lowStockItems, filterStatus]);

  const stats = useMemo(() => {
    return {
      missing: lowStockItems.filter(i => i.status === "missing").length,
      insufficient: lowStockItems.filter(i => i.status === "insufficient").length,
      critical: lowStockItems.filter(i => i.status === "critical").length,
      low: lowStockItems.filter(i => i.status === "low").length,
    };
  }, [lowStockItems]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "missing":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "insufficient":
        return <AlertTriangle className="h-4 w-4 text-orange-400" />;
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case "low":
        return <TrendingDown className="h-4 w-4 text-yellow-400" />;
      default:
        return <Package className="h-4 w-4 text-neutral-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "missing":
        return "bg-red-950/40 border-red-800/40 hover:bg-red-950/50";
      case "insufficient":
        return "bg-orange-950/40 border-orange-800/40 hover:bg-orange-950/50";
      case "critical":
        return "bg-red-900/30 border-red-800/30 hover:bg-red-900/40";
      case "low":
        return "bg-yellow-900/30 border-yellow-800/30 hover:bg-yellow-900/40";
      default:
        return "bg-neutral-900/50 border-neutral-800/30";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "missing":
        return "bg-red-600/20 text-red-400 border-red-600/30";
      case "insufficient":
        return "bg-orange-600/20 text-orange-400 border-orange-600/30";
      case "critical":
        return "bg-red-600/20 text-red-400 border-red-600/30";
      case "low":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
      default:
        return "bg-neutral-600/20 text-neutral-400 border-neutral-600/30";
    }
  };

  if (lowStockItems.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">All Stock Levels OK</h3>
            <p className="text-sm text-neutral-500">
              No items require attention at this time. All inventory levels are sufficient.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards - More Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-red-950/30 border-red-800/50 hover:bg-red-950/40 transition-colors cursor-pointer" onClick={() => setFilterStatus("missing")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-red-300/70 uppercase tracking-wider font-medium">Missing</p>
                <p className="text-xl font-bold text-red-400 mt-0.5">{stats.missing}</p>
              </div>
              <XCircle className="h-6 w-6 text-red-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-950/30 border-orange-800/50 hover:bg-orange-950/40 transition-colors cursor-pointer" onClick={() => setFilterStatus("insufficient")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-orange-300/70 uppercase tracking-wider font-medium">Insufficient</p>
                <p className="text-xl font-bold text-orange-400 mt-0.5">{stats.insufficient}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-orange-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-950/20 border-red-800/40 hover:bg-red-950/30 transition-colors cursor-pointer" onClick={() => setFilterStatus("critical")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-red-300/70 uppercase tracking-wider font-medium">Critical</p>
                <p className="text-xl font-bold text-red-400 mt-0.5">{stats.critical}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-red-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-950/20 border-yellow-800/40 hover:bg-yellow-950/30 transition-colors cursor-pointer" onClick={() => setFilterStatus("low")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-yellow-300/70 uppercase tracking-wider font-medium">Low Stock</p>
                <p className="text-xl font-bold text-yellow-400 mt-0.5">{stats.low}</p>
              </div>
              <TrendingDown className="h-6 w-6 text-yellow-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons - More Compact */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filterStatus === "all"
              ? "bg-blue-600 text-white"
              : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
          }`}
        >
          All ({lowStockItems.length})
        </button>
        <button
          onClick={() => setFilterStatus("missing")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filterStatus === "missing"
              ? "bg-red-600 text-white"
              : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
          }`}
        >
          Missing ({stats.missing})
        </button>
        <button
          onClick={() => setFilterStatus("insufficient")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filterStatus === "insufficient"
              ? "bg-orange-600 text-white"
              : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
          }`}
        >
          Insufficient ({stats.insufficient})
        </button>
        <button
          onClick={() => setFilterStatus("critical")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filterStatus === "critical"
              ? "bg-red-600 text-white"
              : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
          }`}
        >
          Critical ({stats.critical})
        </button>
        <button
          onClick={() => setFilterStatus("low")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filterStatus === "low"
              ? "bg-yellow-600 text-white"
              : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
          }`}
        >
          Low ({stats.low})
        </button>
      </div>

      {/* Stock Alerts List - Compact Card Format */}
      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-100">
              {filterStatus === "all" ? "All Stock Alerts" : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Items`}
            </h2>
            <p className="text-xs text-neutral-500">
              {filteredItems.length} of {lowStockItems.length} items
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredItems.map((item, idx) => {
            const itemKey = item.item + "-" + item.type + "-" + idx;
            return (
              <div
                key={itemKey}
                className={`p-3 rounded-lg border ${getStatusColor(item.status)} transition-all`}
              >
                {/* First Row: Item, Type, Supplier */}
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(item.status)}
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <span className="text-sm font-semibold text-neutral-100 truncate">{item.item}</span>
                    <span className="text-xs text-neutral-400">•</span>
                    <span className="text-sm text-neutral-300 truncate">{item.type}</span>
                    <span className="text-xs text-neutral-400">•</span>
                    <span className="text-sm text-neutral-400 truncate">Main Warehouse</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${getStatusBadgeColor(item.status)} shrink-0`}>
                    {item.status}
                  </span>
                </div>

                {/* Second Row: Status Info and Notes in 2 columns */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    {item.status === "missing" ? (
                      <div className="text-red-400 font-semibold">Out of Stock - Stock needed</div>
                    ) : item.status === "insufficient" ? (
                      <div className="text-orange-400 font-semibold">
                        Current: {item.qty} / Required: {item.qty + (item.shortfall || 0)} • Need {item.shortfall} more
                      </div>
                    ) : (
                      <div className={`font-semibold ${item.status === "critical" ? "text-red-400" : "text-yellow-400"}`}>
                        {item.qty} units left • Reorder soon
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {item.requiredBy && item.requiredBy.length > 0 && (
                      <div className="text-xs text-orange-300/80">
                        <span className="font-medium">Required by:</span> {item.requiredBy.slice(0, 2).join(", ")}
                        {item.requiredBy.length > 2 && ` +${item.requiredBy.length - 2} more`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}