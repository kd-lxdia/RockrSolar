"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, X, FileSpreadsheet, Save, Plus, Trash2 } from "lucide-react";
import type { BOMRecord } from "@/lib/db";
import { generateBOMRows } from "@/lib/bom-calculations";
import * as XLSX from "xlsx";

interface BOMRow {
  sr: number;
  item: string;
  description: string;
  make: string;
  qty: number | string;
  unit: string;
}

export default function EditableBOM({ record }: { record: BOMRecord }) {
  const initialRows = generateBOMRows(record);
  const [bomRows, setBomRows] = useState<BOMRow[]>(initialRows);
  const [lastSaved, setLastSaved] = useState<Date | null>(new Date());

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
    setBomRows(initialRows);
    localStorage.removeItem(`bom-${record.id}`);
    setLastSaved(null);
    console.log('🔄 Reset BOM to original values');
  };

  // Load saved changes on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bom-${record.id}`);
      if (saved) {
        const savedRows = JSON.parse(saved);
        setBomRows(savedRows);
        console.log('✅ Loaded saved BOM edits from localStorage');
      }
    } catch (error) {
      console.error('Failed to load saved BOM:', error);
    }
  }, [record.id]);

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
      const response = await fetch(`/api/bom/${record.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: bomRows })
      });
      
      if (response.ok) {
        setLastSaved(new Date());
        alert('✅ BOM saved to database successfully!');
      } else {
        throw new Error('Failed to save to database');
      }
    } catch (error) {
      console.error('Failed to save to database:', error);
      alert('⚠️ Could not save to database. Changes are saved locally.');
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
                    <input
                      type="text"
                      value={row.item}
                      onChange={(e) => handleCellChange(idx, "item", e.target.value)}
                      className="w-full px-1 py-0.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Item name"
                    />
                  </td>
                  <td className="border border-black px-3 py-2 text-sm">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => handleCellChange(idx, "description", e.target.value)}
                      className="w-full px-1 py-0.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Description"
                    />
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
