"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, RefreshCw, Edit2, Check, X, AlertTriangle, Package, Search } from "lucide-react";
import { useInventory } from "@/lib/inventory-store-postgres";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { setStockThresholds, getAllThresholdSettings, setItemThreshold, removeItemThreshold } from "@/lib/stock-thresholds";

interface ItemHSNMapping {
  name: string;
  hsn_code: string;
}

interface AllItem {
  item: string;
  hsn: string;
}

export default function Settings() {
  const inv = useInventory();
  const [mappings, setMappings] = useState<ItemHSNMapping[]>([]);
  const [allItems, setAllItems] = useState<AllItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [newHSN, setNewHSN] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editHSN, setEditHSN] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [selectedItemForType, setSelectedItemForType] = useState("");
  const [criticalThreshold, setCriticalThreshold] = useState(5);
  const [lowThreshold, setLowThreshold] = useState(10);
  const [itemThresholds, setItemThresholds] = useState<Record<string, { critical: number; low: number }>>({});
  const [editingItemThreshold, setEditingItemThreshold] = useState<string | null>(null);
  const [editItemCritical, setEditItemCritical] = useState(0);
  const [editItemLow, setEditItemLow] = useState(0);
  const [itemThresholdSearch, setItemThresholdSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "hsn">("alerts");

  // Load stock thresholds from localStorage
  useEffect(() => {
    const settings = getAllThresholdSettings();
    setCriticalThreshold(settings.global.critical);
    setLowThreshold(settings.global.low);
    setItemThresholds(settings.items);
  }, []);

  const handleSaveThresholds = () => {
    if (criticalThreshold >= lowThreshold) {
      alert("Critical threshold must be less than Low Stock threshold");
      return;
    }
    if (criticalThreshold < 0 || lowThreshold < 0) {
      alert("Thresholds must be positive numbers");
      return;
    }
    setStockThresholds({ critical: criticalThreshold, low: lowThreshold });
    alert("Stock alert thresholds saved successfully!");
  };

  const handleEditItemThreshold = (itemName: string) => {
    const current = itemThresholds[itemName] || { critical: criticalThreshold, low: lowThreshold };
    setEditingItemThreshold(itemName);
    setEditItemCritical(current.critical);
    setEditItemLow(current.low);
  };

  const handleSaveItemThreshold = (itemName: string) => {
    if (editItemCritical >= editItemLow) {
      alert("Critical threshold must be less than Low Stock threshold");
      return;
    }
    if (editItemCritical < 0 || editItemLow < 0) {
      alert("Thresholds must be positive numbers");
      return;
    }
    setItemThreshold(itemName, { critical: editItemCritical, low: editItemLow });
    setItemThresholds(prev => ({ ...prev, [itemName]: { critical: editItemCritical, low: editItemLow } }));
    setEditingItemThreshold(null);
  };

  const handleResetItemThreshold = (itemName: string) => {
    removeItemThreshold(itemName);
    setItemThresholds(prev => {
      const next = { ...prev };
      delete next[itemName];
      return next;
    });
    if (editingItemThreshold === itemName) {
      setEditingItemThreshold(null);
    }
  };

  // Load mappings from database and build all items list
  const loadMappings = async () => {
    try {
      const response = await fetch('/api/hsn');
      const data = await response.json();
      if (data.success) {
        setMappings(data.data);
        buildAllItemsList(data.data);
      }
    } catch (error) {
      console.error('Error loading HSN mappings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Build complete list of all items with HSN codes
  const buildAllItemsList = (hsnMappings: ItemHSNMapping[]) => {
    const itemsList: AllItem[] = inv.items.map(item => ({
      item,
      hsn: hsnMappings.find(m => m.name === item)?.hsn_code || ""
    }));
    
    setAllItems(itemsList);
  };

  useEffect(() => {
    loadMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild list when inventory changes
  useEffect(() => {
    if (mappings.length > 0 || inv.items.length > 0) {
      buildAllItemsList(mappings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv.items, mappings]);

  // Auto-select first item and load HSN
  useEffect(() => {
    if (!selectedItem && inv.items.length > 0) {
      setSelectedItem(inv.items[0]);
    }
    if (selectedItem) {
      const existing = mappings.find(m => m.name === selectedItem);
      setNewHSN(existing?.hsn_code || "");
    }
  }, [inv.items, selectedItem, mappings]);

  const handleSave = async () => {
    if (!selectedItem) {
      alert("Please select an Item");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/hsn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: selectedItem,
          hsnCode: newHSN.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        await loadMappings();
        alert("HSN code saved successfully!");
      } else {
        alert("Failed to save HSN code: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error('Error saving HSN code:', error);
      alert("Error saving HSN code");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRow = (item: string, hsn: string) => {
    setEditingRow(item);
    setEditHSN(hsn);
  };

  const handleSaveEdit = async (item: string) => {
    try {
      const response = await fetch('/api/hsn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item,
          hsnCode: editHSN.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update mappings state first
        const updatedMappings = [...mappings];
        const existingIndex = updatedMappings.findIndex(
          m => m.name === item
        );
        
        if (existingIndex >= 0) {
          updatedMappings[existingIndex].hsn_code = editHSN.trim();
        } else {
          updatedMappings.push({
            name: item,
            hsn_code: editHSN.trim()
          });
        }
        
        setMappings(updatedMappings);
        
        // Update local state immediately for instant UI feedback
        setAllItems(prevItems => 
          prevItems.map(i => 
            i.item === item 
              ? { ...i, hsn: editHSN.trim() } 
              : i
          )
        );
        
        setEditingRow(null);
        setEditHSN("");
      } else {
        alert("Failed to save HSN code: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error('Error saving HSN code:', error);
      alert("Error saving HSN code");
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditHSN("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    await inv.addItem(newItemName.trim());
    setNewItemName("");
  };

  const handleRemoveItem = async (itemName: string) => {
    if (confirm(`Remove item "${itemName}" and all its types?`)) {
      await inv.removeItem(itemName);
    }
  };

  const handleAddType = async () => {
    if (!selectedItemForType || !newTypeName.trim()) return;
    await inv.addType(selectedItemForType, newTypeName.trim());
    setNewTypeName("");
  };

  const handleRemoveType = async (itemName: string, typeName: string) => {
    if (confirm(`Remove type "${typeName}" from item "${itemName}"?`)) {
      await inv.removeType(itemName, typeName);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-neutral-900/60 border border-neutral-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            activeTab === "alerts"
              ? "bg-orange-600 text-white shadow-lg"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Stock Alerts
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            activeTab === "inventory"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          <Package className="h-4 w-4" />
          Items & Types
        </button>
        <button
          onClick={() => setActiveTab("hsn")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            activeTab === "hsn"
              ? "bg-green-600 text-white shadow-lg"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          <Save className="h-4 w-4" />
          HSN Codes
        </button>
      </div>

      {/* ============= STOCK ALERTS TAB ============= */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {/* Global Thresholds */}
          <Card className="bg-neutral-900/60 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                Global Default Thresholds
              </CardTitle>
              <p className="text-xs text-neutral-500 mt-1">
                These apply to all items unless overridden with per-item thresholds below
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-4 space-y-2">
                  <label className="text-sm font-medium text-red-400">Critical Stock Limit</label>
                  <p className="text-xs text-neutral-500">Items at or below this = CRITICAL (red alert)</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      value={criticalThreshold}
                      onChange={(e) => setCriticalThreshold(Math.floor(Number(e.target.value) || 0))}
                      className="bg-neutral-900 border-neutral-800 text-neutral-100 w-32"
                    />
                    <span className="text-xs text-neutral-500">units</span>
                  </div>
                </div>
                <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-4 space-y-2">
                  <label className="text-sm font-medium text-yellow-400">Low Stock Limit</label>
                  <p className="text-xs text-neutral-500">Items at or below this = LOW STOCK (yellow alert)</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      value={lowThreshold}
                      onChange={(e) => setLowThreshold(Math.floor(Number(e.target.value) || 0))}
                      className="bg-neutral-900 border-neutral-800 text-neutral-100 w-32"
                    />
                    <span className="text-xs text-neutral-500">units</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSaveThresholds}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Global Thresholds
              </Button>
            </CardContent>
          </Card>

          {/* Per-Item Thresholds */}
          <Card className="bg-neutral-900/60 border-neutral-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-400" />
                    Per-Item Thresholds
                  </CardTitle>
                  <p className="text-xs text-neutral-500 mt-1">
                    Click the edit icon to set custom limits. Items without custom values use global defaults.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Custom items</div>
                  <div className="text-lg font-bold text-blue-400">{Object.keys(itemThresholds).length}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={itemThresholdSearch}
                  onChange={(e) => setItemThresholdSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="overflow-x-auto border border-neutral-800 rounded-md max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-neutral-900 z-10">
                    <TableRow className="border-neutral-800 hover:bg-transparent">
                      <TableHead className="text-neutral-400">Item</TableHead>
                      <TableHead className="text-neutral-400 text-center">Critical</TableHead>
                      <TableHead className="text-neutral-400 text-center">Low Stock</TableHead>
                      <TableHead className="text-neutral-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inv.items
                      .filter(item => !itemThresholdSearch.trim() || item.toLowerCase().includes(itemThresholdSearch.toLowerCase()))
                      .map((item) => {
                        const isEditing = editingItemThreshold === item;
                        const hasCustom = !!itemThresholds[item];
                        const currentThresholds = itemThresholds[item] || { critical: criticalThreshold, low: lowThreshold };

                        return (
                          <TableRow key={item} className={`border-neutral-800 ${hasCustom ? "bg-blue-950/10" : "hover:bg-neutral-800/50"}`}>
                            <TableCell className="text-neutral-200">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item}</span>
                                {hasCustom && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-600/30 uppercase font-medium">
                                    Custom
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={editItemCritical}
                                  onChange={(e) => setEditItemCritical(Math.floor(Number(e.target.value) || 0))}
                                  className="bg-neutral-900 border-neutral-800 text-neutral-100 w-20 mx-auto text-center"
                                />
                              ) : (
                                <span className={`font-mono text-sm ${hasCustom ? "text-red-400 font-bold" : "text-neutral-500"}`}>
                                  {currentThresholds.critical}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={editItemLow}
                                  onChange={(e) => setEditItemLow(Math.floor(Number(e.target.value) || 0))}
                                  className="bg-neutral-900 border-neutral-800 text-neutral-100 w-20 mx-auto text-center"
                                />
                              ) : (
                                <span className={`font-mono text-sm ${hasCustom ? "text-yellow-400 font-bold" : "text-neutral-500"}`}>
                                  {currentThresholds.low}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    onClick={() => handleSaveItemThreshold(item)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-400 hover:text-green-300 hover:bg-green-950/50"
                                    title="Save"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() => setEditingItemThreshold(null)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                                    title="Cancel"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    onClick={() => handleEditItemThreshold(item)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/50"
                                    title="Set custom threshold"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  {hasCustom && (
                                    <Button
                                      onClick={() => handleResetItemThreshold(item)}
                                      variant="ghost"
                                      size="sm"
                                      className="text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800"
                                      title="Reset to global defaults"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============= ITEMS & TYPES TAB ============= */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Items Management */}
          <Card className="bg-neutral-900/60 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-400" />
                Manage Items
              </CardTitle>
              <p className="text-xs text-neutral-500 mt-1">
                Add or remove inventory item categories ({inv.items.length} items)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                  placeholder="New item name (e.g., Motor)"
                  className="bg-neutral-900 border-neutral-800 text-neutral-100 flex-1"
                />
                <Button
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Add Item
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {inv.items.map(item => (
                  <div key={item} className="flex items-center gap-1 bg-neutral-800 px-3 py-1.5 rounded-md group hover:bg-neutral-700 transition-colors">
                    <span className="text-neutral-200 text-sm">{item}</span>
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="text-red-400 hover:text-red-300 ml-1 opacity-50 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Types Management */}
          <Card className="bg-neutral-900/60 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                <ChevronDown className="h-5 w-5 text-green-400" />
                Manage Types
              </CardTitle>
              <p className="text-xs text-neutral-500 mt-1">
                Add or remove types/variants for each item
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-between gap-2 bg-neutral-900 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md text-sm min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Item:</span>
                      <span className="font-medium text-neutral-100">
                        {selectedItemForType || "Select Item"}
                      </span>
                    </div>
                    <ChevronDown size={14} className="text-neutral-500" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-[250px] bg-[#1a1d24] border-neutral-800 text-neutral-100 max-h-80 overflow-hidden p-0">
                    <div className="sticky top-0 bg-[#1a1d24] border-b border-neutral-800 p-2">
                      <input
                        type="text"
                        placeholder="Search..."
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <div className="py-1">
                        <div className="px-3 py-1.5 text-xs font-semibold text-neutral-400">Choose</div>
                        {inv.items.map((item) => (
                          <div
                            key={item}
                            className="group flex items-center justify-between px-3 py-2 hover:bg-neutral-800 cursor-pointer"
                          >
                            <span
                              onClick={() => setSelectedItemForType(item)}
                              className="flex-1 text-sm text-neutral-100"
                            >
                              {item}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                inv.removeItem(item);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-1"
                              title="Remove item"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {inv.items.length === 0 && (
                          <div className="px-3 py-2 text-sm text-neutral-500 italic">
                            No items available
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sticky bottom-0 bg-[#1a1d24] border-t border-neutral-800 p-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add item"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newItemName.trim()) {
                              inv.addItem(newItemName.trim());
                              setNewItemName('');
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (newItemName.trim()) {
                              inv.addItem(newItemName.trim());
                              setNewItemName('');
                            }
                          }}
                          disabled={!newItemName.trim()}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded text-sm font-medium transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddType()}
                  placeholder="New type name (e.g., 1HP)"
                  className="bg-neutral-900 border-neutral-800 text-neutral-100 flex-1 min-w-[150px]"
                  disabled={!selectedItemForType}
                />
                <Button
                  onClick={handleAddType}
                  disabled={!selectedItemForType || !newTypeName.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Add Type
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {inv.items.map(item => {
                  const types = inv.getTypesForItem(item);
                  if (types.length === 0) return null;
                  return (
                    <div key={item} className="bg-neutral-800/50 p-3 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-neutral-300">{item}</div>
                          <span className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">{types.length}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 h-7 text-xs"
                            >
                              Manage <ChevronDown size={12} className="ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-neutral-900 border-neutral-700 text-neutral-100 max-h-60 overflow-y-auto min-w-[200px]">
                            <div className="px-2 py-1 text-xs text-neutral-500 font-medium">
                              Remove Types:
                            </div>
                            {types.map((type) => (
                              <div
                                key={type}
                                className="flex items-center justify-between px-3 py-2 hover:bg-neutral-800 group"
                              >
                                <span className="text-sm text-neutral-200">{type}</span>
                                <button
                                  onClick={() => handleRemoveType(item, type)}
                                  className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label={`Remove ${type}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {types.map(type => (
                          <div key={type} className="bg-neutral-900 px-2 py-1 rounded text-xs text-neutral-300 border border-neutral-800">
                            {type}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============= HSN CODES TAB ============= */}
      {activeTab === "hsn" && (
        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
              <Save className="h-5 w-5 text-green-400" />
              HSN Code Mappings
            </CardTitle>
            <p className="text-xs text-neutral-500 mt-1">
              Assign HSN codes to items. All types under an item share the same HSN code.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Add HSN */}
            <div className="bg-neutral-800/30 border border-neutral-800 rounded-lg p-4 space-y-3">
              <div className="text-sm font-medium text-neutral-300">Quick Add / Update HSN Code</div>
              <div className="flex gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md text-sm min-w-[180px]">
                    <span className="text-neutral-400">Item:</span>
                    <span className="font-medium text-neutral-100">
                      {selectedItem || "Select"}
                    </span>
                    <ChevronDown size={14} className="text-neutral-500 ml-auto" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-56 bg-[#121317] border-neutral-800 text-neutral-100 max-h-60 overflow-y-auto">
                    {inv.items.map((item) => (
                      <DropdownMenuItem
                        key={item}
                        onClick={() => setSelectedItem(item)}
                        className="text-neutral-100 cursor-pointer hover:bg-neutral-800"
                      >
                        {item}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  type="text"
                  value={newHSN}
                  onChange={(e) => setNewHSN(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="HSN Code (e.g., 85414011)"
                  className="bg-neutral-900 border-neutral-800 text-neutral-100 flex-1 min-w-[150px]"
                  disabled={!selectedItem}
                />
                <Button
                  onClick={handleSave}
                  disabled={!selectedItem || isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            {/* All Items HSN Table */}
            {allItems.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                No items found. Add items first in the Items & Types tab.
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-800 rounded-md max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-neutral-900 z-10">
                    <TableRow className="border-neutral-800 hover:bg-transparent">
                      <TableHead className="text-neutral-400">Item</TableHead>
                      <TableHead className="text-neutral-400">HSN Code</TableHead>
                      <TableHead className="text-neutral-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allItems.map((item, index) => {
                      const isEditing = editingRow === item.item;

                      return (
                        <TableRow
                          key={index}
                          className="border-neutral-800 hover:bg-neutral-800/50"
                        >
                          <TableCell className="text-neutral-200 font-medium">{item.item}</TableCell>
                          <TableCell className="text-neutral-200 font-mono">
                            {isEditing ? (
                              <Input
                                type="text"
                                value={editHSN}
                                onChange={(e) => setEditHSN(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(item.item);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                placeholder="Enter HSN"
                                className="bg-neutral-900 border-neutral-800 text-neutral-100"
                                autoFocus
                              />
                            ) : (
                              <span className={item.hsn ? "text-green-400" : "text-neutral-500 italic"}>
                                {item.hsn || "Not set"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  onClick={() => handleSaveEdit(item.item)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-400 hover:text-green-300 hover:bg-green-950/50"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={handleCancelEdit}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => handleEditRow(item.item, item.hsn)}
                                variant="ghost"
                                size="sm"
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/50"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-900/40 p-3 rounded border border-neutral-800">
              <Save className="h-4 w-4 shrink-0" />
              <span>HSN codes are saved to the database and synced across all devices</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
