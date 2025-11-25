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
  { item: "Copper Thimble for ( Earthing , Inverter, Structure)", unit: "Nos" },
  { item: "Copper Thimble for ( LA)", unit: "Nos" },
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
  onSave: (bomName: string, customerName: string, rows: CustomBOMRow[], panelWattage: number, projectKW: number, phase: "SINGLE" | "TRIPLE") => void;
  onCancel: () => void;
  nextSerialNumber: string;
}

export default function CustomBOMCreator({ onSave, onCancel, nextSerialNumber }: CustomBOMCreatorProps) {
  const inv = useInventory();
  const [bomName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phase, setPhase] = useState<"SINGLE" | "TRIPLE">("SINGLE");
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
  const [panelWattage, setPanelWattage] = useState<number>(0);
  const [projectKW, setProjectKW] = useState<number>(0);
  const [typesInitialized, setTypesInitialized] = useState(false);

  // Add standard BOM types to inventory on component mount (only once)
  React.useEffect(() => {
    if (typesInitialized) return;

    const standardTypes: { [item: string]: string[] } = {
      "DCDB": ["1 IN 1 OUT", "2 IN 2 OUT", "3 IN 3 OUT", "4 IN 4 OUT", "AS PER DESIGN"],
      "ACDB": ["32A", "63A"],
      "MCB": ["32A 2 POLE", "63A 2 POLE", "100A 2 POLE", "32A 4 POLE", "63A 4 POLE", "100A 4 POLE"],
      "ELCB": ["32A 2 POLE", "63A 2 POLE", "100A 2 POLE", "32A 4 POLE", "63A 4 POLE", "100A 4 POLE"],
      "Danger Plate": ["230V"],
      "Fire Cylinder Co2": ["1 KG"],
      "Copper Thimble for (ACDB)": ["Pin types 6mmsq"],
      "Copper Thimble for ( Earthing , Inverter, Structure)": ["Ring types 6mmsq"],
      "Copper Thimble for ( LA)": ["Ring types 16mmsq"],
      "AC wire": ["6 sq mm Armoured", "10 sq mm Armoured", "16 sq mm Armoured", "6 sq mm", "10 sq mm"],
      "AC wire Inverter to ACDB": ["2 CORE 6 SQ MM", "2 CORE 10 SQ MM", "4 CORE 4 SQ MM", "4 CORE 6 SQ MM"],
      "Dc wire Tin copper": ["4 sq mm", "6 sq mm"],
      "Earthing Wire": ["6 sq mm"],
      "LA Earthing Wire": ["16 sq mm"],
      "Earthing Pit Cover": ["STANDARD"],
      "LA": ["1 MTR"],
      "LA Fastner / LA": ["M6"],
      "Earthing Rod/Plate": ["1 MTR | COPPER COATING", "2 MTR | COPPER COATING"],
      "Earthing Chemical": ["CHEMICAL"],
      "Mc4 Connector": ["1000V"],
      "Cable Tie UV": ["200MM", "300MM"],
      "Screw": ["1.5 INCH"],
      "Gitti": ["1.5 INCH"],
      "Wire PVC Tape": ["RED, BLUE, GREEN", "RED, BLUE, BLACK, YELLOW"],
      "UPVC Pipe": ["20mm"],
      "UPVC Cable Tray": ["50*25"],
      "UPVC Shedal": ["20mm"],
      "GI Shedal": ["20mm"],
      "UPVC Tee Band": ["20mm"],
      "UPVC Elbow": ["20mm"],
      "Flexible Pipe": ["20mm"],
      "Structure Nut Bolt": ["M10*25"],
      "Thread Rod / Fastner": ["M10"]
    };

    // Check if any types are already loaded - if so, skip initialization
    const hasAnyTypes = Object.keys(standardTypes).some(item => 
      inv.getTypesForItem(item).length > 0
    );

    if (hasAnyTypes) {
      setTypesInitialized(true);
      return;
    }

    const addTypesAsync = async () => {
      for (const [item, types] of Object.entries(standardTypes)) {
        for (const type of types) {
          await inv.addType(item, type);
        }
      }
      setTypesInitialized(true);
    };

    addTypesAsync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount, ignore inv changes

  // Extract wattage from panel type (e.g., "550W Mono" -> 550, "600 W Poly" -> 600)
  const extractWattageFromType = (type: string): number => {
    if (!type) return 0;
    // Match patterns like: 550W, 550 W, 550w, 550 w
    const match = type.match(/(\d+)\s*[Ww]/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Calculate project KW whenever Solar Panel row changes
  // Formula: Panel Wattage / 100 = Project KW (e.g., 600W → 6.0 KW, 550W → 5.5 KW)
  React.useEffect(() => {
    const solarPanelRow = rows.find(row => 
      row.item && row.item.toLowerCase().includes('solar panel')
    );
    
    if (solarPanelRow && solarPanelRow.description) {
      const wattage = extractWattageFromType(solarPanelRow.description);
      const kw = wattage > 0 ? wattage / 100 : 0;
      
      console.log('🔋 Panel Calculation:', {
        description: solarPanelRow.description,
        wattage,
        kw
      });
      
      setPanelWattage(wattage);
      setProjectKW(kw);
    } else {
      // Reset if no solar panel found or no description
      setPanelWattage(0);
      setProjectKW(0);
    }
  }, [rows]);

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
    // Filter out rows with no item, no qty, or qty = 0
    const validRows = rows.filter(row => {
      const qty = row.qty.trim();
      return row.item.trim() && qty && parseFloat(qty) > 0;
    });
    
    if (validRows.length === 0) {
      alert("Please add at least one item with quantity greater than 0");
      return;
    }

    onSave(bomName, customerName, validRows, panelWattage, projectKW, phase);
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
        {/* Serial Number, Customer Name and Phase Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Serial Number (Auto-generated)
            </label>
            <input
              type="text"
              value={nextSerialNumber}
              disabled
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name..."
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Phase
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as "SINGLE" | "TRIPLE")}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="SINGLE">SINGLE</option>
              <option value="TRIPLE">TRIPLE</option>
            </select>
          </div>
        </div>

        {/* Calculated Values Display */}
        {panelWattage > 0 && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-md">
            <div>
              <label className="block text-xs font-medium text-blue-300 mb-1">
                Panel Wattage (Calculated)
              </label>
              <div className="text-lg font-semibold text-blue-100">
                {panelWattage} W
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-300 mb-1">
                Project Capacity (Calculated)
              </label>
              <div className="text-lg font-semibold text-blue-100">
                {projectKW.toFixed(2)} KW
              </div>
            </div>
          </div>
        )}

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
                                {getTypesForItem(row.item).map((t, typeIdx) => (
                                  <div
                                    key={`${index}-${typeIdx}-${t}`}
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
