"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, X, FileSpreadsheet, Save, Plus, Trash2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useInventory } from "@/lib/inventory-store-postgres";
import type { BOMRecord } from "@/lib/db";
import { generateBOMRows } from "@/lib/bom-calculations";
import * as XLSX from "xlsx";

const DEFAULT_BOM_ITEMS = [
  "Solar Panel", "Inverter", "DCDB", "ACDB", "MCB", "ELCB",
  "Loto Box", "Danger Plate", "Fire Cylinder Co2",
  "Copper Thimble for (ACDB)",
  "Copper Thimble for ( Earthing , Inverter, Structure)",
  "Copper Thimble for ( LA)", "AC wire",
  "AC wire Inverter to ACDB", "Dc wire Tin copper",
  "Earthing Wire", "LA Earthing Wire", "Earthing Pit Cover",
  "LA", "LA Fastner / LA", "Earthing Rod/Plate",
  "Earthing Chemical", "Mc4 Connector", "Cable Tie UV",
  "Screw", "Gitti", "Wire PVC Tape", "UPVC Pipe",
  "UPVC Cable Tray", "UPVC Shedal", "GI Shedal",
  "UPVC Tee Band", "UPVC Elbow", "Flexible Pipe",
  "Structure Nut Bolt", "Thread Rod / Fastner", "Farma",
  "Civil Material"
];

interface BOMRow {
  sr: number;
  item: string;
  description: string;
  make: string;
  qty: number | string;
  unit: string;
}

export default function EditableBOM({ record }: { record: BOMRecord }) {
  const inv = useInventory();
  const [bomRows, setBomRows] = useState<BOMRow[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [newTypeInputs, setNewTypeInputs] = useState<{ [key: number]: string }>({});
  const [itemSearch, setItemSearch] = useState<{ [key: number]: string }>({});
  const [typesInitialized, setTypesInitialized] = useState(false);

  // Initialize standard BOM types in inventory (same as CustomBOMCreator)
  useEffect(() => {
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
  }, []);

  // Initialize on client side only to avoid hydration mismatch
  useEffect(() => {
    async function loadBOM() {
      const initialRows = generateBOMRows(record);
      setBomRows(initialRows);
      
      // Try to load saved changes from API first
      try {
        const response = await fetch(`/api/bom/edits?bomId=${record.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            setBomRows(result.data);
            setLastSaved(new Date(result.timestamp));
            console.log('✅ Loaded saved BOM edits from database');
            setIsInitialized(true);
            return;
          }
        }
      } catch {
        console.log('No saved edits in database, trying localStorage...');
      }
      
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem(`bom-${record.id}`);
        if (saved) {
          const savedRows = JSON.parse(saved);
          setBomRows(savedRows);
          setLastSaved(new Date());
          console.log('✅ Loaded saved BOM edits from localStorage');
        }
      } catch (error) {
        console.error('Failed to load saved BOM:', error);
      }
      
      setIsInitialized(true);
    }
    
    loadBOM();
  }, [record]);

  const handleCellChange = (rowIndex: number, field: keyof BOMRow, value: string) => {
    const updatedRows = [...bomRows];
    const row = updatedRows[rowIndex];
    if (field === "sr") {
      row.sr = Number(value) || row.sr;
    } else if (field === "item") {
      row.item = value;
    } else if (field === "description") {
      row.description = value;
    } else if (field === "make") {
      row.make = value;
    } else if (field === "qty") {
      row.qty = value;
    } else if (field === "unit") {
      row.unit = value;
    }
    setBomRows(updatedRows);
    
    // Auto-save after a short delay
    setTimeout(() => {
      saveChanges(updatedRows);
    }, 1000);
  };

  const saveChanges = async (rows: BOMRow[]) => {
    try {
      // Save to localStorage (simple and reliable)
      localStorage.setItem(`bom-${record.id}`, JSON.stringify(rows));
      setLastSaved(new Date());
      console.log('✅ BOM changes auto-saved to localStorage');
    } catch (error) {
      console.error('Failed to save BOM changes:', error);
    }
  };

  const handleReset = () => {
    const initialRows = generateBOMRows(record);
    setBomRows(initialRows);
    localStorage.removeItem(`bom-${record.id}`);
    setLastSaved(null);
    console.log('🔄 Reset BOM to original values');
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error("Print failed:", err);
      alert("Printing is not supported in this environment.");
    }
  };

  const handleDownloadPDF = () => {
    try {
      window.print();
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("PDF download not supported. Please use Print and select 'Save as PDF' in the print dialog.");
    }
  };

  const handleExportToExcel = () => {
    try {
      // Prepare data for Excel
      const excelData = bomRows.map(row => ({
        "SR NO": row.sr,
        "ITEM": row.item,
        "DESCRIPTION": row.description,
        "MAKE": row.make,
        "QTY": row.qty,
        "UNIT": row.unit
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 8 },  // SR NO
        { wch: 25 }, // ITEM
        { wch: 40 }, // DESCRIPTION
        { wch: 20 }, // MAKE
        { wch: 10 }, // QTY
        { wch: 10 }  // UNIT
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BOM");

      // Add metadata sheet
      const metadata = [
        ["BOM Details", ""],
        ["Project Name", record.name],
        ["Capacity", `${record.project_in_kw} kW`],
        ["Panel Wattage", `${record.wattage_of_panels}W`],
        ["Panel Name", record.panel_name || "N/A"],
        ["Phase", record.phase],
        ["Table Option", record.table_option || "N/A"],
        ["Number of Legs", record.no_of_legs || "N/A"],
        ["Generated", new Date(record.created_at).toLocaleString()],
        ["Last Modified", lastSaved ? lastSaved.toLocaleString() : "Not modified"]
      ];
      const wsMetadata = XLSX.utils.aoa_to_sheet(metadata);
      wsMetadata['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsMetadata, "Project Info");

      // Download file
      const fileName = `BOM_${record.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log('✅ Exported BOM to Excel:', fileName);
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  const handleSaveToDatabase = async () => {
    try {
      const response = await fetch(`/api/bom/edits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bomId: record.id,
          data: bomRows 
        })
      });
      
      if (response.ok) {
        setLastSaved(new Date());
        // Also save to localStorage for persistence
        localStorage.setItem(`bom-${record.id}`, JSON.stringify(bomRows));
        alert('✅ BOM saved successfully!');
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save to database');
      }
    } catch (error) {
      console.error('Failed to save BOM:', error);
      // Fallback to localStorage only
      localStorage.setItem(`bom-${record.id}`, JSON.stringify(bomRows));
      setLastSaved(new Date());
      alert('✅ BOM saved locally! (Database unavailable)');
    }
  };

  const handleAddRow = () => {
    const newRow: BOMRow = {
      sr: bomRows.length + 1,
      item: "",
      description: "",
      make: "",
      qty: "",
      unit: "Nos"
    };
    const updatedRows = [...bomRows, newRow];
    setBomRows(updatedRows);
    saveChanges(updatedRows);
  };

  const handleDeleteRow = (index: number) => {
    if (bomRows.length <= 1) {
      alert('Cannot delete the last row');
      return;
    }
    const updatedRows = bomRows.filter((_, i) => i !== index);
    // Renumber rows
    updatedRows.forEach((row, i) => {
      row.sr = i + 1;
    });
    setBomRows(updatedRows);
    saveChanges(updatedRows);
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="text-neutral-400">Loading BOM...</div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            margin: 0;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: auto;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          input {
            border: none !important;
            background: transparent !important;
          }
        }
      `}} />
      
      <div className="p-8 bg-white text-black min-h-screen print-page">
        {/* Header Controls - Always visible, hidden only when printing */}
        <div className="no-print mb-4 flex items-center justify-between gap-2 flex-wrap sticky top-0 z-50 bg-white pb-4 pt-4 border-b-2 border-gray-200 shadow-md -mx-8 px-8">
          <div className="text-sm text-neutral-600">
            <div className="font-semibold">{record.name}</div>
            <div className="text-xs">{record.project_in_kw}kW • {record.phase}{record.panel_name ? ` • ${record.panel_name}` : ""}</div>
            {lastSaved && <div className="text-xs text-green-600 mt-1">Auto-saved: {lastSaved.toLocaleTimeString()}</div>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleAddRow}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
            <Button
              onClick={handleSaveToDatabase}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              <Save className="mr-2 h-4 w-4" />
              Save to Database
            </Button>
            <Button
              onClick={handleExportToExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            <Button
              onClick={handleReset}
              className="bg-red-600 hover:bg-red-700 text-white"
              size="sm"
            >
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
        
        <div className="max-w-5xl mx-auto bg-white">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">
              BOM - {record.name}
              {record.project_in_kw && ` - ${record.project_in_kw}kW`}
              {record.phase && ` - ${record.phase}`}
            </h1>
            <div className="text-sm text-neutral-600 space-y-1">
              <div>Project Capacity: <strong>{record.project_in_kw} kW</strong></div>
              <div>Panel Wattage: <strong>{record.wattage_of_panels}W</strong></div>
              {record.panel_name && <div>Panel Name: <strong>{record.panel_name}</strong></div>}
              <div>Phase: <strong>{record.phase}</strong></div>
              {record.table_option && <div>Table Option: <strong>{record.table_option}</strong></div>}
              {record.no_of_legs > 0 && <div>Number of Legs: <strong>{record.no_of_legs}</strong></div>}
            </div>
          </div>

          {/* BOM Table */}
          <table className="w-full border-collapse border-2 border-black" style={{ borderSpacing: 0 }}>
            <thead>
              <tr className="bg-gray-100">
                <th className="border-2 border-black px-3 py-2 text-left font-bold text-sm" style={{ width: '60px' }}>SR NO</th>
                <th className="border-2 border-black px-3 py-2 text-left font-bold text-sm" style={{ width: '200px' }}>ITEM</th>
                <th className="border-2 border-black px-3 py-2 text-left font-bold text-sm">DESCRIPTION</th>
                <th className="border-2 border-black px-3 py-2 text-left font-bold text-sm" style={{ width: '150px' }}>MAKE</th>
                <th className="border-2 border-black px-3 py-2 text-center font-bold text-sm" style={{ width: '80px' }}>QTY</th>
                <th className="border-2 border-black px-3 py-2 text-center font-bold text-sm" style={{ width: '80px' }}>UNIT</th>
                <th className="border-2 border-black px-3 py-2 text-center font-bold text-sm no-print" style={{ width: '60px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {bomRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50">
                  <td className="border border-black px-3 py-2 text-sm text-center font-semibold">{row.sr}</td>
                  <td className="border border-black px-3 py-2 text-sm font-medium">
                    {/* ITEM Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full px-1 py-0.5 border border-blue-300 rounded bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between text-left">
                          <span className="truncate text-sm">{row.item || "Select item..."}</span>
                          <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white border border-gray-300 text-black min-w-[220px] max-h-80 overflow-hidden p-0 shadow-lg z-[100]">
                        {/* Search */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
                          <input
                            type="text"
                            value={itemSearch[idx] || ''}
                            onChange={(e) => setItemSearch({ ...itemSearch, [idx]: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search items..."
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto py-1">
                          {DEFAULT_BOM_ITEMS
                            .filter(item => !itemSearch[idx] || item.toLowerCase().includes((itemSearch[idx] || '').toLowerCase()))
                            .map((item, itemIdx) => (
                              <div
                                key={itemIdx}
                                onClick={() => {
                                  handleCellChange(idx, 'item', item);
                                  setItemSearch({ ...itemSearch, [idx]: '' });
                                }}
                                className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm ${row.item === item ? 'bg-blue-100 font-semibold' : ''}`}
                              >
                                {item}
                              </div>
                            ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td className="border border-black px-3 py-2 text-sm">
                    {/* DESCRIPTION Dropdown (linked to inventory types) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full px-1 py-0.5 border border-blue-300 rounded bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between text-left">
                          <span className="truncate text-sm">{row.description || "Select type..."}</span>
                          <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white border border-gray-300 text-black min-w-[220px] max-h-80 overflow-hidden p-0 shadow-lg z-[100]">
                        {/* Types List */}
                        <div className="max-h-60 overflow-y-auto">
                          {inv.getTypesForItem(row.item).length > 0 && (
                            <div className="py-1">
                              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500">Choose</div>
                              {inv.getTypesForItem(row.item).map((t, typeIdx) => (
                                <div
                                  key={`${idx}-${typeIdx}-${t}`}
                                  className="group flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer"
                                >
                                  <span
                                    onClick={() => handleCellChange(idx, 'description', t)}
                                    className={`flex-1 text-sm ${row.description === t ? 'font-semibold text-blue-700' : ''}`}
                                  >
                                    {t}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      inv.removeType(row.item, t);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1"
                                    title="Remove type"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {inv.getTypesForItem(row.item).length === 0 && (
                            <div className="px-3 py-3 text-sm text-gray-400 italic text-center">
                              No types available
                            </div>
                          )}
                        </div>

                        {/* Add New Type */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newTypeInputs[idx] || ''}
                              onChange={(e) => setNewTypeInputs({ ...newTypeInputs, [idx]: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && newTypeInputs[idx]?.trim() && row.item) {
                                  inv.addType(row.item, newTypeInputs[idx].trim());
                                  handleCellChange(idx, 'description', newTypeInputs[idx].trim());
                                  setNewTypeInputs({ ...newTypeInputs, [idx]: '' });
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Add type"
                              disabled={!row.item}
                              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (newTypeInputs[idx]?.trim() && row.item) {
                                  inv.addType(row.item, newTypeInputs[idx].trim());
                                  handleCellChange(idx, 'description', newTypeInputs[idx].trim());
                                  setNewTypeInputs({ ...newTypeInputs, [idx]: '' });
                                }
                              }}
                              disabled={!row.item || !newTypeInputs[idx]?.trim()}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded text-sm font-medium transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td className="border border-black px-3 py-2 text-sm">
                    <input
                      type="text"
                      value={row.make}
                      onChange={(e) => handleCellChange(idx, "make", e.target.value)}
                      className="w-full px-1 py-0.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Make/Brand"
                    />
                  </td>
                  <td className="border border-black px-3 py-2 text-sm text-center font-semibold">
                    <input
                      type="text"
                      value={row.qty}
                      onChange={(e) => handleCellChange(idx, "qty", e.target.value)}
                      className="w-full px-1 py-0.5 border border-blue-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Qty"
                    />
                  </td>
                  <td className="border border-black px-3 py-2 text-sm text-center">
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) => handleCellChange(idx, "unit", e.target.value)}
                      className="w-full px-1 py-0.5 border border-blue-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Unit"
                    />
                  </td>
                  <td className="border border-black px-2 py-2 text-center no-print">
                    <button
                      onClick={() => handleDeleteRow(idx)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-8 space-y-2 text-sm text-neutral-600">
            <div>Generated: {new Date(record.created_at).toLocaleString()}</div>
            <div className="text-xs text-neutral-500">
              Document ID: {record.id}
            </div>
          </div>

          {/* Additional Notes Section */}
          {(record.front_leg || record.back_leg || record.roof_design) && (
            <div className="mt-8 p-4 border-2 border-gray-300 rounded">
              <h3 className="font-bold text-sm mb-2">Additional Notes:</h3>
              <div className="space-y-1 text-sm">
                {record.front_leg && <div><strong>Front Leg:</strong> {record.front_leg}</div>}
                {record.back_leg && <div><strong>Back Leg:</strong> {record.back_leg}</div>}
                {record.roof_design && <div><strong>Roof Design:</strong> {record.roof_design}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
