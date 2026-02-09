"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle, Package, AlertCircle } from "lucide-react";
import { useInventory } from "@/lib/inventory-store-postgres";
import { calculateRequiredInventory, findMissingStock } from "@/lib/bom-inventory-tracker";
import { getThresholdsForItem } from "@/lib/stock-thresholds";

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

export function LowStockAlert() {
  const inventory = useInventory();
  const [bomRecords, setBomRecords] = useState<BOMRecord[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [thresholdVersion, setThresholdVersion] = useState(0); // Trigger re-renders on threshold changes

  // Listen for threshold changes from Settings + load saved thresholds on mount
  useEffect(() => {
    // Trigger initial calculation and re-calculation on threshold changes
    setThresholdVersion(v => v + 1);
    const handler = () => setThresholdVersion(v => v + 1);
    window.addEventListener("stock-thresholds-changed", handler);
    return () => window.removeEventListener("stock-thresholds-changed", handler);
  }, []);

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
  }, [inventory.events.length]);

  useEffect(() => {
    const calculateAlerts = async () => {
      // Build stock map with item::type::brand keys (brand defaults to 'standard')
      const stockMap: Record<string, Record<string, Record<string, number>>> = {};
      inventory.events.forEach((e) => {
        const brand = e.brand?.trim() || 'standard';
        if (!stockMap[e.item]) stockMap[e.item] = {};
        if (!stockMap[e.item][e.type]) stockMap[e.item][e.type] = {};
        if (!stockMap[e.item][e.type][brand]) stockMap[e.item][e.type][brand] = 0;
        stockMap[e.item][e.type][brand] += e.kind === "IN" ? e.qty : -e.qty;
      });

      const alerts: StockItem[] = [];
      if (bomRecords.length > 0) {
        const requiredInventory = await calculateRequiredInventory(bomRecords);
        const currentInventoryMap = new Map<string, number>();
        Object.entries(stockMap).forEach(([item, types]) => {
          Object.entries(types).forEach(([type, brands]) => {
            Object.entries(brands).forEach(([brand, qty]) => {
              const key = `${item}::${type}::${brand}`;
              currentInventoryMap.set(key, qty);
            });
          });
        });
        const missingStock = findMissingStock(requiredInventory, currentInventoryMap);
        missingStock.forEach(missing => {
          alerts.push({
            item: missing.item,
            type: `${missing.type}${missing.brand !== 'standard' ? ` (${missing.brand})` : ''}`,
            qty: missing.currentQty,
            status: missing.status,
            requiredBy: missing.requiredBy,
            shortfall: missing.shortfall
          });
        });
      }

      Object.entries(stockMap).forEach(([item, types]) => {
        Object.entries(types).forEach(([type, brands]) => {
          Object.entries(brands).forEach(([brand, qty]) => {
            const typeDisplay = brand !== 'standard' ? `${type} (${brand})` : type;
            const alreadyAlerted = alerts.some((a) => a.item === item && a.type === typeDisplay);
            if (!alreadyAlerted) {
              // Get item-specific thresholds (falls back to global)
              const thresholds = getThresholdsForItem(item);
              if (qty === 0 || qty < 0) {
                alerts.push({ item, type: typeDisplay, qty, status: "missing" });
              } else if (qty > 0 && qty <= thresholds.low) {
                alerts.push({ item, type: typeDisplay, qty, status: qty <= thresholds.critical ? "critical" : "low" });
              }
            }
          });
        });
      });

      const sorted = alerts.sort((a, b) => {
        const statusOrder = { missing: 0, insufficient: 1, critical: 2, low: 3 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        if (a.shortfall && b.shortfall) return b.shortfall - a.shortfall;
        return a.qty - b.qty;
      });

      setLowStockItems(sorted);
    };

    calculateAlerts();
  }, [inventory.events, bomRecords, thresholdVersion]);

  if (lowStockItems.length === 0) {
    return (
      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardContent className="p-4 text-center">
          <Package className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">All stock levels OK</p>
        </CardContent>
      </Card>
    );
  }

  const statusBg = (status: string) => {
    if (status === "missing") return "bg-red-950/50 border-red-800/50";
    if (status === "insufficient") return "bg-orange-950/50 border-orange-800/50";
    if (status === "critical") return "bg-red-900/30 border-red-800/30";
    return "bg-neutral-900/50 border-orange-800/30";
  };

  return (
    <Card className="bg-gradient-to-br from-orange-950/40 to-red-950/40 border-orange-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-600/20">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-orange-100">Stock Alerts</h3>
            <p className="text-xs text-orange-300/70">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} need attention
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {lowStockItems.slice(0, 12).map((item, idx) => {
          const itemKey = item.item + "-" + item.type + "-" + idx;
          return (
            <div key={itemKey} className={"flex items-start justify-between p-2 rounded-lg border " + statusBg(item.status)}>
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {item.status === "missing" ? (
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                ) : (
                  <Package className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-100 font-medium truncate">{item.item}</div>
                  <div className="text-xs text-neutral-400 truncate">{item.type}</div>
                  {item.requiredBy && item.requiredBy.length > 0 && (
                    <div className="text-[10px] text-orange-300/70 mt-1">
                      Required by: {item.requiredBy.slice(0, 2).join(", ")}
                      {item.requiredBy.length > 2 && (" +" + (item.requiredBy.length - 2) + " more")}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                {item.status === "missing" ? (
                  <>
                    {item.shortfall ? (
                      <div className="text-lg font-bold text-red-400">{item.shortfall}</div>
                    ) : (
                      <div className="text-sm font-semibold text-red-400">0</div>
                    )}
                    <div className="text-xs text-red-300">needed</div>
                  </>
                ) : item.status === "insufficient" ? (
                  <>
                    <div className="text-sm font-semibold text-orange-400">
                      {item.qty} / {item.qty + (item.shortfall || 0)}
                    </div>
                    <div className="text-xs text-orange-300">Need {item.shortfall} more</div>
                  </>
                ) : (
                  <>
                    <div className={"text-sm font-semibold " + (item.status === "critical" ? "text-red-400" : "text-orange-400")}>
                      {item.qty} left
                    </div>
                    <div className="text-xs text-neutral-500">Reorder soon</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {lowStockItems.length > 12 && (
          <div className="text-xs text-center text-orange-400/70 pt-1">
            + {lowStockItems.length - 12} more items
          </div>
        )}
      </CardContent>
    </Card>
  );
}
