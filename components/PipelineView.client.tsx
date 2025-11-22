"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInventory } from "@/lib/inventory-store-postgres";
import { generateBOMRows, BOMRecord } from "@/lib/bom-calculations";
import { CheckCircle, XCircle, AlertTriangle, Loader2, PackageMinus } from "lucide-react";

interface PipelineBOM extends BOMRecord {
  status: "available" | "unavailable";
  missingItems: { item: string; required: number; available: number; missing: number }[];
}

export default function PipelineView() {
  const { events, isLoading: isInventoryLoading, addEvent, refreshData } = useInventory();
  const [boms, setBoms] = useState<BOMRecord[]>([]);
  const [isLoadingBoms, setIsLoadingBoms] = useState(true);
  const [showStockOutPopup, setShowStockOutPopup] = useState(false);
  const [stockOutMessage, setStockOutMessage] = useState("");
  const [isStockingOut, setIsStockingOut] = useState(false);

  // Fetch BOMs
  useEffect(() => {
    const fetchBOMs = async () => {
      try {
        const res = await fetch("/api/bom");
        if (res.ok) {
          const result = await res.json();
          // Handle API response structure { success: true, data: [...] }
          if (result.success && Array.isArray(result.data)) {
            setBoms(result.data);
          } else if (Array.isArray(result)) {
            setBoms(result);
          } else {
            console.error("Unexpected BOM API response format:", result);
            setBoms([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch BOMs", error);
        setBoms([]);
      } finally {
        setIsLoadingBoms(false);
      }
    };
    fetchBOMs();
  }, []);

  // Calculate Stock Levels
  const stockLevels = useMemo(() => {
    const levels: Record<string, number> = {};
    events.forEach((e) => {
      const qty = Number(e.qty) || 0;
      if (e.kind === "IN") {
        levels[e.item] = (levels[e.item] || 0) + qty;
      } else {
        levels[e.item] = (levels[e.item] || 0) - qty;
      }
    });
    return levels;
  }, [events]);

  // Process BOMs to determine status
  const pipelineBOMs: PipelineBOM[] = useMemo(() => {
    return boms.map((bom) => {
      // For Custom BOMs, skip processing - they don't use calculated items
      if (bom.table_option === "Custom") {
        console.log('⚠️ Skipping pipeline status for Custom BOM:', bom.id, bom.name);
        return {
          ...bom,
          status: "available" as const, // Custom BOMs always show as available in pipeline
          missingItems: [],
        };
      }

      const rows = generateBOMRows(bom);
      const missingItems: { item: string; required: number; available: number; missing: number }[] = [];
      let isAvailable = true;

      rows.forEach((row) => {
        // Skip rows that don't have a clear item name or quantity
        if (!row.item || !row.qty) return;

        // Parse quantity (handle strings like "100 m")
        let requiredQty = 0;
        if (typeof row.qty === 'number') {
            requiredQty = row.qty;
        } else {
            const match = row.qty.match(/[\d.]+/);
            requiredQty = match ? parseFloat(match[0]) : 0;
        }

        const availableQty = stockLevels[row.item] || 0;

        if (availableQty < requiredQty) {
          isAvailable = false;
          missingItems.push({
            item: row.item,
            required: requiredQty,
            available: availableQty,
            missing: requiredQty - availableQty,
          });
        }
      });

      return {
        ...bom,
        status: isAvailable ? "available" : "unavailable",
        missingItems,
      };
    });
  }, [boms, stockLevels]);

  const handleStockOut = async (bom: PipelineBOM) => {
    // Check if stock is available
    if (bom.status === "unavailable") {
      setStockOutMessage(`Cannot stock out ${bom.name}: ${bom.missingItems.length} items are not available in sufficient quantity.`);
      setShowStockOutPopup(true);
      return;
    }

    setIsStockingOut(true);
    try {
      const rows = generateBOMRows(bom);
      
      // Create stock out events for all items
      for (const row of rows) {
        if (!row.item || !row.qty) continue;

        let qty = 0;
        if (typeof row.qty === 'number') {
          qty = row.qty;
        } else {
          const match = row.qty.match(/[\d.]+/);
          qty = match ? parseFloat(match[0]) : 0;
        }

        if (qty > 0) {
          await addEvent({
            item: row.item,
            type: row.description || "BOM Item",
            qty: qty,
            rate: 0,
            source: "BOM Stock Out",
            supplier: bom.name,
            kind: "OUT"
          });
        }
      }

      setStockOutMessage(`Successfully stocked out all items for ${bom.name}!`);
      setShowStockOutPopup(true);
      
      // Refresh inventory data to update the UI
      await refreshData();
    } catch (error) {
      console.error("Stock out failed:", error);
      setStockOutMessage(`Failed to stock out items for ${bom.name}. Please try again.`);
      setShowStockOutPopup(true);
    } finally {
      setIsStockingOut(false);
    }
  };

  if (isInventoryLoading || isLoadingBoms) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-neutral-400">Loading Pipeline...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stock Out Popup Dialog */}
      <Dialog open={showStockOutPopup} onOpenChange={setShowStockOutPopup}>
        <DialogContent className="bg-[#1a1b1e] border-neutral-800 text-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Stock Out Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neutral-300">{stockOutMessage}</p>
          </div>
          <Button 
            onClick={() => setShowStockOutPopup(false)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* BOM Cards in Vertical List */}
      <div className="space-y-4 max-w-4xl mx-auto">
        {pipelineBOMs.map((bom) => (
          <Card 
            key={bom.id}
            className={`border-2 transition-all py-2 ${
              bom.status === "available" 
                ? "bg-green-950/30 border-green-600" 
                : "bg-red-950/30 border-red-600"
            }`}
          >
            <CardHeader className="pb-2 pt-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl font-bold text-neutral-100">
                      {bom.name}
                    </CardTitle>
                    {bom.status === "available" ? (
                      <CheckCircle className="text-green-500 h-6 w-6" />
                    ) : (
                      <XCircle className="text-red-500 h-6 w-6" />
                    )}
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">
                    {bom.project_in_kw} kW
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Created: {new Date(bom.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-3">
              <div className="flex justify-between items-center">
                <div className={`text-sm font-medium ${
                  bom.status === "available" ? "text-green-400" : "text-red-400"
                }`}>
                  {bom.status === "available" 
                    ? "✓ Ready for Deployment" 
                    : `✗ ${bom.missingItems.length} Items Missing`}
                </div>
                
                <div className="flex gap-2">
                  {/* View Details Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-600 text-blue-400 hover:bg-blue-950"
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="bg-[#1a1b1e] border-neutral-800 text-neutral-200 max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 sticky top-0 bg-[#1a1b1e] py-2 z-10">
                          {bom.name} - Status Report
                          {bom.status === "available" ? (
                            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">Ready</span>
                          ) : (
                            <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full">Missing Items</span>
                          )}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="mt-4 pb-4">
                        {bom.table_option === "Custom" ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <CheckCircle className="h-16 w-16 text-blue-500 mb-4" />
                            <h3 className="text-lg font-medium text-blue-400">Custom BOM</h3>
                            <p className="text-neutral-400 mt-2">
                              This is a custom BOM with user-defined items.
                            </p>
                            <p className="text-neutral-500 mt-2 text-sm">
                              Use the "Stock Out" button to check inventory and deduct items.
                            </p>
                          </div>
                        ) : bom.status === "available" ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                            <h3 className="text-lg font-medium text-green-400">All Items Available!</h3>
                            <p className="text-neutral-400 mt-2">
                              This project has all required materials in stock.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded-md border border-red-900/50">
                              <AlertTriangle className="h-5 w-5" />
                              <span className="font-medium">The following items are insufficient in stock:</span>
                            </div>
                            
                            <div className="border border-neutral-800 rounded-md overflow-hidden">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-neutral-900 text-neutral-400 sticky top-0">
                                  <tr>
                                    <th className="px-4 py-2">Item Name</th>
                                    <th className="px-4 py-2 text-right">Required</th>
                                    <th className="px-4 py-2 text-right">Available</th>
                                    <th className="px-4 py-2 text-right">Missing</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                  {bom.missingItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-neutral-800/50">
                                      <td className="px-4 py-2 font-medium text-neutral-300">{item.item}</td>
                                      <td className="px-4 py-2 text-right text-neutral-400">{item.required}</td>
                                      <td className="px-4 py-2 text-right text-neutral-400">{item.available}</td>
                                      <td className="px-4 py-2 text-right text-red-400 font-bold">-{item.missing}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Stock Out Button */}
                  <Button
                    onClick={() => handleStockOut(bom)}
                    disabled={isStockingOut}
                    className={`${
                      bom.status === "available" 
                        ? "bg-orange-600 hover:bg-orange-700" 
                        : "bg-red-900 hover:bg-red-800"
                    } text-white`}
                    size="sm"
                  >
                    {isStockingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <PackageMinus className="h-4 w-4 mr-2" />
                    )}
                    Stock Out All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {pipelineBOMs.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          No BOMs found. Create a BOM to see it in the pipeline.
        </div>
      )}
    </div>
  );
}
