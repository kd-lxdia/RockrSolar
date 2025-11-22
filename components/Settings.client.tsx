"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, RefreshCw, Edit2, Check, X } from "lucide-react";
import { useInventory } from "@/lib/inventory-store-postgres";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

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
      {/* Items Management */}
      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-100">
            Manage Items
          </CardTitle>
          <p className="text-xs text-neutral-500 mt-1">
            Add or remove items from your inventory
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
              <div key={item} className="flex items-center gap-1 bg-neutral-800 px-3 py-1 rounded-md">
                <span className="text-neutral-200 text-sm">{item}</span>
                <button
                  onClick={() => handleRemoveItem(item)}
                  className="text-red-400 hover:text-red-300 ml-1"
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
          <CardTitle className="text-lg font-semibold text-neutral-100">
            Manage Types
          </CardTitle>
          <p className="text-xs text-neutral-500 mt-1">
            Add or remove types for each item
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {/* Item Dropdown with Add/Remove */}
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
                {/* Search Input */}
                <div className="sticky top-0 bg-[#1a1d24] border-b border-neutral-800 p-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                {/* Items List */}
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
                
                {/* Add New Item */}
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
              className="bg-neutral-900 border-neutral-800 text-neutral-100 flex-1"
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

          {/* Types Display with Dropdown to Remove */}
          <div className="space-y-2">
            {inv.items.map(item => {
              const types = inv.getTypesForItem(item);
              if (types.length === 0) return null;
              return (
                <div key={item} className="bg-neutral-800/50 p-3 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-neutral-300">{item}</div>
                    
                    {/* Type Management Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 h-7 text-xs"
                        >
                          Manage Types <ChevronDown size={12} className="ml-1" />
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
                  
                  <div className="flex flex-wrap gap-2">
                    {types.map(type => (
                      <div key={type} className="bg-neutral-900 px-2 py-1 rounded text-xs text-neutral-200">
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

      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-100">
            Type & HSN Code Mappings
          </CardTitle>
          <p className="text-xs text-neutral-500 mt-1">
            Select Item → Type, then add HSN code. HSN automatically appears when you select item+type in Stock IN/OUT.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Add HSN */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-neutral-300">Quick Add HSN Code</div>
            <div className="flex gap-2">
              {/* Item Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md text-sm flex-1">
                  <span className="text-neutral-400">Item:</span>
                  <span className="font-medium text-neutral-100">
                    {selectedItem || "Select Item"}
                  </span>
                  <ChevronDown size={14} className="text-neutral-500 ml-auto" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-56 bg-[#121317] border-neutral-800 text-neutral-100">
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
            </div>

            <div className="flex gap-2">
              <Input
                type="text"
                value={newHSN}
                onChange={(e) => setNewHSN(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="HSN Code (e.g., 85414011)"
                className="bg-neutral-900 border-neutral-800 text-neutral-100 flex-1"
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

          {/* All Items Table */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-neutral-300">All Items with HSN Codes (All types inherit)</div>
            {allItems.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                No items found. Add items first in Stock IN/OUT forms.
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-800 rounded-md">
                <Table>
                  <TableHeader>
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
                          <TableCell className="text-neutral-200">{item.item}</TableCell>
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
                              <span className={item.hsn ? "" : "text-neutral-500 italic"}>
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
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-900/40 p-3 rounded border border-neutral-800">
            <Save className="h-4 w-4" />
            <span>HSN codes are saved to the database and synced across all devices</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
