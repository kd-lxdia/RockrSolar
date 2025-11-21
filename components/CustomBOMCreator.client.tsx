"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, X, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useInventory } from "@/lib/inventory-store-postgres";

interface CustomBOMRow {
  sr: number;
  item: string;
  description: string;
  make: string;
  qty: string;
  unit: string;
}

const DEFAULT_BOM_ITEMS: Omit<CustomBOMRow, 'sr' | 'qty' | 'description' | 'make'>[] = [
  { item: "Solar Panel", unit: "Nos" },
  { item: "Inverter", unit: "Nos" },
  { item: "DCDB", unit: "Nos" },
  { item: "ACDB", unit: "Nos" },
  { item: "MCB", unit: "Nos" },
  { item: "ELCB", unit: "Nos" },
  { item: "Loto Box", unit: "Nos" },
  { item: "Danger Plate", unit: "Nos" },
  { item: "Fire Cylinder Co2", unit: "Nos" },
  { item: "Copper Thimble for (ACDB)", unit: "Nos" },
  { item: "Copper Thimble for (Earthing, Inverter, Structure)", unit: "Nos" },
  { item: "Copper Thimble for (LA)", unit: "Nos" },
  { item: "AC wire", unit: "mtr" },
  { item: "AC wire Inverter to ACDB", unit: "mtr" },
  { item: "Dc wire Tin copper", unit: "mtr" },
  { item: "Earthing Wire", unit: "mtr" },
  { item: "LA Earthing Wire", unit: "mtr" },
  { item: "Earthing Pit Cover", unit: "Nos" },
  { item: "LA", unit: "Nos" },
  { item: "LA Fastner / LA", unit: "Nos" },
  { item: "Earthing Rod/Plate", unit: "Nos" },
  { item: "Earthing Chemical", unit: "BAG" },
  { item: "Mc4 Connector", unit: "PAIR" },
  { item: "Cable Tie UV", unit: "PKT" },
  { item: "Cable Tie UV", unit: "PKT" },
  { item: "Screw", unit: "Nos" },
  { item: "Gitti", unit: "Pkt" },
  { item: "Wire PVC Tape", unit: "Nos" },
  { item: "UPVC Pipe", unit: "Lot" },
  { item: "UPVC Cable Tray", unit: "Mtr" },
  { item: "UPVC Shedal", unit: "Pkt" },
  { item: "GI Shedal", unit: "Nos" },
  { item: "UPVC Tee Band", unit: "Nos" },
  { item: "UPVC Elbow", unit: "Nos" },
  { item: "Flexible Pipe", unit: "Mtr" },
  { item: "Structure Nut Bolt", unit: "Nos" },
  { item: "Thread Rod / Fastner", unit: "Nos" },
  { item: "Farma", unit: "Nos" },
  { item: "Civil Material", unit: "Nos" }
];

interface CustomBOMCreatorProps {
  onSave: (bomName: string, rows: CustomBOMRow[]) => void;
  onCancel: () => void;
}

export default function CustomBOMCreator({ onSave, onCancel }: CustomBOMCreatorProps) {
  const inv = useInventory();
  const [bomName, setBomName] = useState("");
  const [rows, setRows] = useState<CustomBOMRow[]>(
    DEFAULT_BOM_ITEMS.map((item, index) => ({
      sr: index + 1,
      ...item,
      description: "",
      make: "",
      qty: ""
    }))
  );
  const [newTypeInputs, setNewTypeInputs] = useState<{ [key: number]: string }>({});

  // Get types for a specific item
  const getTypesForItem = (itemName: string) => {
    return inv.getTypesForItem(itemName);
  };

  const handleCellChange = (index: number, field: keyof CustomBOMRow, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleAddRow = () => {
    const newRow: CustomBOMRow = {
      sr: rows.length + 1,
      item: "",
      description: "",
      make: "",
      qty: "",
      unit: "Nos"
    };
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    // Renumber rows
    newRows.forEach((row, i) => {
      row.sr = i + 1;
    });
    setRows(newRows);
  };

  const handleSave = () => {
    if (!bomName.trim()) {
      alert("Please enter a BOM name");
      return;
    }

    // Filter out rows with no item or qty
    const validRows = rows.filter(row => row.item.trim() && row.qty.trim());
    
    if (validRows.length === 0) {
      alert("Please add at least one item with quantity");
      return;
    }

    onSave(bomName, validRows);
  };

  return (
    <Card className="bg-neutral-900/60 border-neutral-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-neutral-100">Create Custom BOM</CardTitle>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* BOM Name Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            BOM Name / Customer Name
          </label>
          <input
            type="text"
            value={bomName}
            onChange={(e) => setBomName(e.target.value)}
            placeholder="Enter BOM name..."
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Items Table */}
        <div className="border border-neutral-800 rounded-md overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                <TableRow>
                  <TableHead className="text-neutral-300 w-16">SR NO</TableHead>
                  <TableHead className="text-neutral-300">ITEM</TableHead>
                  <TableHead className="text-neutral-300">DESCRIPTION</TableHead>
                  <TableHead className="text-neutral-300">MAKE</TableHead>
                  <TableHead className="text-neutral-300 w-24">QTY</TableHead>
                  <TableHead className="text-neutral-300 w-24">UNIT</TableHead>
                  <TableHead className="text-neutral-300 w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index} className="border-neutral-800">
                    <TableCell className="text-neutral-400">{row.sr}</TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => handleCellChange(index, 'item', e.target.value)}
                        className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        placeholder="Item name"
                      />
                    </TableCell>
                    <TableCell>
                      {/* Type/Description Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 hover:bg-neutral-750 focus:outline-none focus:ring-1 focus:ring-blue-600 flex items-center justify-between">
                            <span className="truncate">{row.description || "Select type..."}</span>
                            <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1d24] border-neutral-700 text-neutral-100 min-w-[200px] max-h-80 overflow-hidden p-0">
                          {/* Types List */}
                          <div className="max-h-60 overflow-y-auto">
                            {getTypesForItem(row.item).length > 0 && (
                              <div className="py-1">
                                <div className="px-3 py-1.5 text-xs font-semibold text-neutral-400">Choose</div>
                                {getTypesForItem(row.item).map((t) => (
                                  <div
                                    key={t}
                                    className="group flex items-center justify-between px-3 py-2 hover:bg-neutral-800 cursor-pointer"
                                  >
                                    <span
                                      onClick={() => handleCellChange(index, 'description', t)}
                                      className="flex-1 text-sm text-neutral-200"
                                    >
                                      {t}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        inv.removeType(row.item, t);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-1"
                                      title="Remove type"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {getTypesForItem(row.item).length === 0 && (
                              <div className="px-3 py-3 text-sm text-neutral-500 italic text-center">
                                No types available
                              </div>
                            )}
                          </div>

                          {/* Add New Type */}
                          <div className="sticky bottom-0 bg-[#1a1d24] border-t border-neutral-700 p-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newTypeInputs[index] || ''}
                                onChange={(e) => setNewTypeInputs({ ...newTypeInputs, [index]: e.target.value })}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && newTypeInputs[index]?.trim() && row.item) {
                                    inv.addType(row.item, newTypeInputs[index].trim());
                                    handleCellChange(index, 'description', newTypeInputs[index].trim());
                                    setNewTypeInputs({ ...newTypeInputs, [index]: '' });
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Add type"
                                disabled={!row.item}
                                className="flex-1 px-2 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-neutral-800 disabled:text-neutral-600"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (newTypeInputs[index]?.trim() && row.item) {
                                    inv.addType(row.item, newTypeInputs[index].trim());
                                    handleCellChange(index, 'description', newTypeInputs[index].trim());
                                    setNewTypeInputs({ ...newTypeInputs, [index]: '' });
                                  }
                                }}
                                disabled={!row.item || !newTypeInputs[index]?.trim()}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded text-sm font-medium transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={row.make}
                        onChange={(e) => handleCellChange(index, 'make', e.target.value)}
                        className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        placeholder="Make/Brand"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={row.qty}
                        onChange={(e) => handleCellChange(index, 'qty', e.target.value)}
                        className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => handleCellChange(index, 'unit', e.target.value)}
                        className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        placeholder="Unit"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleDeleteRow(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-between">
          <Button
            onClick={handleAddRow}
            variant="outline"
            className="border-blue-600 text-blue-400 hover:bg-blue-950"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
          
          <div className="flex gap-2">
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-neutral-700 text-neutral-400 hover:bg-neutral-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save BOM
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
