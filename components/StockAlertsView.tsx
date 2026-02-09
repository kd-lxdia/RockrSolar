"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle, Package, AlertCircle, TrendingDown, XCircle, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useInventory } from "@/lib/inventory-store-postgres";
import { calculateRequiredInventory, findMissingStock } from "@/lib/bom-inventory-tracker";
import { getStockThresholds } from "@/lib/stock-thresholds";

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

export function StockAlertsView() {
  const inventory = useInventory();
  const [bomRecords, setBomRecords] = useState<BOMRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [thresholds, setThresholds] = useState(getStockThresholds());

  // Listen for threshold changes from Settings + load saved thresholds on mount
  useEffect(() => {
    // Read saved thresholds on client mount (SSR returns defaults)
    setThresholds(getStockThresholds());
    const handler = () => setThresholds(getStockThresholds());
    window.addEventListener("stock-thresholds-changed", handler);
    return () => window.removeEventListener("stock-thresholds-changed", handler);
  }, []);

  const toggleItem = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

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

  // Calculate low stock items whenever inventory or BOMs change
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
  }, [inventory.events, bomRecords, thresholds]);

  // Group items by main item name (kept for potential future use)
  /* const groupedItems = useMemo(() => {
    const groups: Record<string, StockItem[]> = {};
    lowStockItems.forEach(item => {
      if (!groups[item.item]) {
        groups[item.item] = [];
      }
      groups[item.item].push(item);
    });
    return groups;
  }, [lowStockItems]); */

  const filteredItems = useMemo(() => {
    if (filterStatus === "all") return lowStockItems;
    return lowStockItems.filter(item => item.status === filterStatus);
  }, [lowStockItems, filterStatus]);

  // Group filtered items by main item name
  const filteredGroupedItems = useMemo(() => {
    const groups: Record<string, StockItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.item]) {
        groups[item.item] = [];
      }
      groups[item.item].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Apply search filter
  const searchFilteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return filteredGroupedItems;
    
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, StockItem[]> = {};
    
    Object.entries(filteredGroupedItems).forEach(([itemName, types]) => {
      // Check if item name matches
      if (itemName.toLowerCase().includes(query)) {
        filtered[itemName] = types;
      } else {
        // Check if any type matches
        const matchingTypes = types.filter(type => 
          type.type.toLowerCase().includes(query)
        );
        if (matchingTypes.length > 0) {
          filtered[itemName] = matchingTypes;
        }
      }
    });
    
    return filtered;
  }, [filteredGroupedItems, searchQuery]);

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
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search items or types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
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

      {/* Stock Alerts List - Hierarchical Format */}
      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-100">
              {filterStatus === "all" ? "All Stock Alerts" : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Items`}
            </h2>
            <p className="text-xs text-neutral-500">
              {Object.keys(searchFilteredGroups).length} items with {Object.values(searchFilteredGroups).flat().length} types
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(searchFilteredGroups).map(([itemName, types]) => {
            const isExpanded = expandedItems.has(itemName);
            const worstStatus = types.reduce((worst, current) => {
              const order = { missing: 0, insufficient: 1, critical: 2, low: 3 };
              return order[current.status] < order[worst.status] ? current : worst;
            }).status;
            
            return (
              <div key={itemName} className="space-y-1">
                {/* Main Item Row - Clickable */}
                <div
                  onClick={() => toggleItem(itemName)}
                  className={`p-3 rounded-lg border cursor-pointer ${getStatusColor(worstStatus)} transition-all hover:shadow-md`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
                    )}
                    {getStatusIcon(worstStatus)}
                    <span className="text-sm font-semibold text-neutral-100 flex-1">{itemName}</span>
                    <span className="text-xs text-neutral-400 shrink-0">{types.length} type{types.length > 1 ? 's' : ''}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${getStatusBadgeColor(worstStatus)} shrink-0`}>
                      {worstStatus}
                    </span>
                  </div>
                </div>

                {/* Expanded Types - Show when item is expanded */}
                {isExpanded && (
                  <div className="ml-8 space-y-1">
                    {types.map((type, idx) => (
                      <div
                        key={`${itemName}-${type.type}-${idx}`}
                        className={`p-3 rounded-lg border ${getStatusColor(type.status)} transition-all`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(type.status)}
                          <span className="text-sm text-neutral-300 flex-1">{type.type}</span>
                          {type.status === "missing" && type.shortfall && (
                            <span className="text-lg font-bold text-red-400 shrink-0 mr-2">{type.shortfall}</span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${getStatusBadgeColor(type.status)} shrink-0`}>
                            {type.status}
                          </span>
                        </div>

                        <div className="text-sm space-y-1">
                          {type.status === "missing" ? (
                            <div className="text-red-400 font-semibold">Out of Stock</div>
                          ) : type.status === "insufficient" ? (
                            <div className="text-orange-400 font-semibold">
                              Current: {type.qty} / Required: {type.qty + (type.shortfall || 0)} • Need {type.shortfall} more
                            </div>
                          ) : (
                            <div className={`font-semibold ${type.status === "critical" ? "text-red-400" : "text-yellow-400"}`}>
                              {type.qty} units left • Reorder soon
                            </div>
                          )}
                          
                          {type.requiredBy && type.requiredBy.length > 0 && (
                            <div className="text-xs text-orange-300/80">
                              <span className="font-medium">Required by:</span> {type.requiredBy.slice(0, 2).join(", ")}
                              {type.requiredBy.length > 2 && ` +${type.requiredBy.length - 2} more`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}