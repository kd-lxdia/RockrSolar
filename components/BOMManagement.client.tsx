"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Download, Plus, FileText, FileSpreadsheet, Edit, PackageMinus } from "lucide-react";
import * as XLSX from "xlsx";
import CustomBOMCreator from "./CustomBOMCreator.client";

export interface BOMRecord {
  id: string;
  name: string;
  project_in_kw: number;
  wattage_of_panels: number;
  panel_name?: string;
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
  address?: string;
  created_at: number;
}

// BOM Calculation Logic (from Google Apps Script)
function computeBOMItems(record: BOMRecord) {
  const kw = Number(record.project_in_kw) || 0;
  const wattage = Number(record.wattage_of_panels) || 0;
  const phase = record.phase;
  
  // Helper to parse wire lengths
  const parseWireLength = (val: string): number => {
    const match = val.match(/[\d.]+/g);
    return match ? parseFloat(match.join('')) : 0;
  };

  const acWireLen = parseWireLength(record.ac_wire || '');
  const dcWireLen = parseWireLength(record.dc_wire || '');
  const laWireLen = parseWireLength(record.la_wire || '');
  const earthingWireLen = parseWireLength(record.earthing_wire || '');
  const noOfLegs = Number(record.no_of_legs) || 0;

  // 1. Panel count
  const wp = wattage >= 100 ? wattage : wattage * 1000;
  const panelCount = Math.ceil((kw * 1000) / wp);

  // 2. Inverter configuration
  let inverterDesc = "";
  let inverterUnits = 1;
  if (phase === "TRIPLE") {
    inverterDesc = `1 x ${kw.toFixed(1)} kW, 3-Phase`;
    inverterUnits = 1;
  } else {
    if (kw < 7) {
      inverterDesc = `1 x ${kw.toFixed(1)} kW, 1-Phase`;
      inverterUnits = 1;
    } else if (kw >= 7 && kw < 13) {
      const each = kw / 2;
      inverterDesc = `2 x ${each.toFixed(1)} kW, 1-Phase`;
      inverterUnits = 2;
    } else {
      const each = kw / 3;
      inverterDesc = `3 x ${each.toFixed(1)} kW, 1-Phase`;
      inverterUnits = 3;
    }
  }

  // 3. DCDB description
  let dcdbDesc = "";
  if (kw <= 6) dcdbDesc = "1 IN 1 OUT";
  else if (kw >= 7 && kw <= 12) dcdbDesc = "2 IN 2 OUT";
  else if (kw >= 13 && kw <= 18) dcdbDesc = "3 IN 3 OUT";
  else if (kw >= 19 && kw <= 20) dcdbDesc = "4 IN 4 OUT";
  else dcdbDesc = "AS PER DESIGN";

  // 4. ACDB rating
  const acdbRating = kw <= 5 ? "32A" : "63A";

  // 5. MCB/ELCB rating
  let mcbElcbAmp: number | null = null;
  if (kw <= 5) mcbElcbAmp = 32;
  else if (kw > 5 && kw <= 15) mcbElcbAmp = 63;
  else if (kw > 15 && kw <= 20) mcbElcbAmp = 100;
  
  const poleText = phase === "SINGLE" ? "2 POLE" : phase === "TRIPLE" ? "4 POLE" : "";
  const mcbText = mcbElcbAmp ? `${mcbElcbAmp}A ${poleText}` : `AS PER DESIGN ${poleText}`;

  // 6. AC wire sizes
  let acMainSize = "";
  if (phase === "SINGLE") {
    if (kw <= 3) acMainSize = "6 sq mm Armoured";
    else if (kw >= 4 && kw <= 6) acMainSize = "10 sq mm Armoured";
    else acMainSize = "16 sq mm Armoured";
  } else if (phase === "TRIPLE") {
    if (kw >= 5 && kw <= 10) acMainSize = "6 sq mm";
    else if (kw >= 11 && kw <= 20) acMainSize = "10 sq mm";
    else acMainSize = "AS PER DESIGN";
  }

  let acInvToAcdbDesc = "";
  if (phase === "SINGLE") {
    acInvToAcdbDesc = kw <= 10 ? "2 CORE 6 SQ MM" : "2 CORE 10 SQ MM";
  } else if (phase === "TRIPLE") {
    acInvToAcdbDesc = kw <= 10 ? "4 CORE 4 SQ MM" : "4 CORE 6 SQ MM";
  }

  // 7. DC wire size
  const dcWireSize = dcWireLen > 50 ? "6 sq mm" : "4 sq mm";

  // 8. Tape colors
  const tapeDesc = phase === "TRIPLE" ? "RED, BLUE, BLACK, YELLOW" : "RED, BLUE, GREEN";

  // 9. Per-leg calculations
  const perLeg = (qty: number) => noOfLegs > 0 ? Math.round(qty * noOfLegs * 100) / 100 : qty;

  // Build BOM table rows
  const bomRows = [
    { sr: 1, item: "Solar Panel", desc: "", make: "", qty: panelCount, unit: "Nos" },
    { sr: 2, item: "Inverter", desc: inverterDesc, make: "", qty: inverterUnits, unit: "Nos" },
    { sr: 3, item: "DCDB", desc: dcdbDesc, make: "ELMEX = Fuse  HAVELLS = SPD", qty: 1, unit: "Nos" },
    { sr: 4, item: "ACDB", desc: acdbRating, make: "HAVELLS = MCB EL", qty: 1, unit: "Nos" },
    { sr: 5, item: "MCB", desc: mcbText, make: "HAVELLS", qty: 1, unit: "Nos" },
    { sr: 6, item: "ELCB", desc: mcbText, make: "HAVELLS", qty: 1, unit: "Nos" },
    { sr: 7, item: "Loto Box", desc: "", make: "", qty: 1, unit: "Nos" },
    { sr: 8, item: "Danger Plate", desc: "230V", make: "", qty: 1, unit: "Nos" },
    { sr: 9, item: "Fire Cylinder Co2", desc: "1 KG", make: "", qty: 1, unit: "Nos" },
    { sr: 10, item: "Copper Thimble for (ACDB)", desc: "Pin types 6mmsq", make: "", qty: 12, unit: "Nos" },
    { sr: 11, item: "Copper Thimble for (Earthing, Inverter, Structure)", desc: "Ring types 6mmsq", make: "", qty: 6, unit: "Nos" },
    { sr: 12, item: "Copper Thimble for (LA)", desc: "Ring types 16mmsq", make: "", qty: 2, unit: "Nos" },
    { sr: 13, item: "AC wire", desc: acMainSize, make: "Polycab", qty: acWireLen || "", unit: "mtr" },
    { sr: 14, item: "AC wire Inverter to ACDB", desc: acInvToAcdbDesc, make: "Polycab", qty: 2, unit: "mtr" },
    { sr: 15, item: "Dc wire Tin copper", desc: dcWireSize, make: "Polycab", qty: dcWireLen || "", unit: "mtr" },
    { sr: 16, item: "Earthing Wire", desc: "6 sq mm", make: "Polycab", qty: earthingWireLen || "", unit: "mtr" },
    { sr: 17, item: "LA Earthing Wire", desc: "16 sq mm", make: "Polycab", qty: laWireLen || "", unit: "mtr" },
    { sr: 18, item: "Earthing Pit Cover", desc: "STANDARD", make: "", qty: 3, unit: "Nos" },
    { sr: 19, item: "LA", desc: "1 MTR", make: "", qty: 1, unit: "Nos" },
    { sr: 20, item: "LA Fastner / LA", desc: "M6", make: "MS", qty: 4, unit: "Nos" },
    { sr: 21, item: "Earthing Rod/Plate", desc: `${kw <= 10 ? "1 MTR" : "2 MTR"} | COPPER COATING`, make: "", qty: 3, unit: "Nos" },
    { sr: 22, item: "Earthing Chemical", desc: "CHEMICAL", make: "", qty: kw <= 10 ? 1 : 2, unit: "BAG" },
    { sr: 23, item: "Mc4 Connector", desc: "1000V", make: "", qty: 2, unit: "PAIR" },
    { sr: 24, item: "Cable Tie UV", desc: "200MM", make: "", qty: 0.5, unit: "PKT" },
    { sr: 25, item: "Cable Tie UV", desc: "300MM", make: "", qty: 0.5, unit: "PKT" },
    { sr: 26, item: "Screw", desc: "1.5 INCH", make: "", qty: 100, unit: "Nos" },
    { sr: 27, item: "Gitti", desc: "1.5 INCH", make: "", qty: 2, unit: "Pkt" },
    { sr: 28, item: "Wire PVC Tape", desc: tapeDesc, make: "", qty: 3, unit: "Nos" },
    { sr: 29, item: "UPVC Pipe", desc: "20mm", make: "", qty: 0.5, unit: "Lot" },
    { sr: 30, item: "UPVC Cable Tray", desc: "50*25", make: "", qty: 1.5, unit: "Mtr" },
    { sr: 31, item: "UPVC Shedal", desc: "20mm", make: "", qty: 1, unit: "Pkt" },
    { sr: 32, item: "GI Shedal", desc: "20mm", make: "", qty: 40, unit: "Nos" },
    { sr: 33, item: "UPVC Tee Band", desc: "20mm", make: "", qty: 3, unit: "Nos" },
    { sr: 34, item: "UPVC Elbow", desc: "20mm", make: "", qty: earthingWireLen > 60 ? 12 : 6, unit: "Nos" },
    { sr: 35, item: "Flexible Pipe", desc: "20mm", make: "", qty: 5, unit: "Mtr" },
    { sr: 36, item: "Structure Nut Bolt", desc: "M10*25", make: kw <= 5 ? "" : "AS PER REQUIREMENT", qty: kw <= 5 ? 40 : "", unit: kw <= 5 ? "Nos" : "" },
    { sr: 37, item: "Thread Rod / Fastner", desc: "M10", make: "", qty: perLeg(4), unit: "Nos" },
    { sr: 38, item: "Farma", desc: "", make: "", qty: perLeg(1), unit: "Nos" },
    { sr: 39, item: "Civil Material", desc: "", make: "", qty: perLeg(1.5), unit: "Nos" }
  ];

  return bomRows;
}

// Generate and download BOM as HTML (printable/PDF-ready)
function generateBOMHTML(record: BOMRecord) {
  const bomRows = computeBOMItems(record);
  const today = new Date().toLocaleDateString();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>BOM - ${record.name}</title>
  <style>
    @media print {
      body { margin: 0; }
      @page { margin: 1cm; }
    }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 10px;
    }
    .header-info {
      text-align: center;
      margin-bottom: 20px;
      color: #666;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #333;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .sr-col { width: 5%; text-align: center; }
    .item-col { width: 20%; }
    .desc-col { width: 30%; }
    .make-col { width: 20%; }
    .qty-col { width: 10%; text-align: right; }
    .unit-col { width: 15%; }
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    }
    @media print {
      .print-button { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  
  <h1>BILL OF MATERIALS (BOM)</h1>
  
  <div class="header-info">
    <strong>Customer:</strong> ${record.name} &nbsp;|&nbsp;
    <strong>Project:</strong> ${record.project_in_kw} kW &nbsp;|&nbsp;
    <strong>Phase:</strong> ${record.phase} &nbsp;|&nbsp;
    <strong>Date:</strong> ${today}
  </div>

  <table>
    <thead>
      <tr>
        <th class="sr-col">SR NO</th>
        <th class="item-col">ITEM</th>
        <th class="desc-col">DESCRIPTION</th>
        <th class="make-col">MAKE</th>
        <th class="qty-col">QTY</th>
        <th class="unit-col">UNIT</th>
      </tr>
    </thead>
    <tbody>
      ${bomRows.map(row => `
        <tr>
          <td class="sr-col">${row.sr}</td>
          <td class="item-col">${row.item}</td>
          <td class="desc-col">${row.desc}</td>
          <td class="make-col">${row.make}</td>
          <td class="qty-col">${row.qty}</td>
          <td class="unit-col">${row.unit}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  return html;
}

// Export BOM as HTML file
function exportBOMAsHTML(record: BOMRecord) {
  const html = generateBOMHTML(record);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BOM_${record.name}_${record.project_in_kw}kW_${record.phase}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Open BOM in new window for printing/PDF
function openBOMForPrint(record: BOMRecord) {
  const html = generateBOMHTML(record);
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}

// Export all BOMs to Excel
function exportAllBOMsToExcel(records: BOMRecord[]) {
  if (records.length === 0) {
    alert("No BOM records to export!");
    return;
  }

  const allBOMData: Record<string, string | number>[] = [];

  records.forEach((record) => {
    const bomItems = computeBOMItems(record);
    
    // Add header row for this BOM
    allBOMData.push({
      "Customer": record.name,
      "Project (KW)": record.project_in_kw,
      "Phase": record.phase,
      "Panel Wattage": record.wattage_of_panels,
      "Created": new Date(record.created_at).toLocaleDateString(),
      "": "",
      "": "",
      "": ""
    });

    // Add column headers
    allBOMData.push({
      "Customer": "SR NO",
      "Project (KW)": "ITEM",
      "Phase": "DESCRIPTION",
      "Panel Wattage": "MAKE",
      "Created": "QTY",
      "": "UNIT",
      "": "",
      "": ""
    });

    // Add BOM items
    bomItems.forEach(row => {
      allBOMData.push({
        "Customer": row.sr,
        "Project (KW)": row.item,
        "Phase": row.desc,
        "Panel Wattage": row.make,
        "Created": row.qty,
        "": row.unit,
        "": "",
        "": ""
      });
    });

    // Add separator row
    allBOMData.push({
      "Customer": "",
      "Project (KW)": "",
      "Phase": "",
      "Panel Wattage": "",
      "Created": "",
      "": "",
      "": "",
      "": ""
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(allBOMData, { skipHeader: true });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "All BOMs");

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // SR NO / Customer
    { wch: 35 }, // Item / Project
    { wch: 35 }, // Description / Phase
    { wch: 20 }, // Make / Panel Wattage
    { wch: 10 }, // QTY / Created
    { wch: 10 }, // Unit
    { wch: 10 },
    { wch: 10 }
  ];

  const fileName = `All_BOMs_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export default function BOMManagement() {
  const [records, setRecords] = useState<BOMRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    project_in_kw: "",
    wattage_of_panels: "",
    panel_name: "",
    table_option: "Option 1",
    phase: "SINGLE" as "SINGLE" | "TRIPLE",
    ac_wire: "",
    dc_wire: "",
    la_wire: "",
    earthing_wire: "",
    no_of_legs: "",
    front_leg: "",
    back_leg: "",
    roof_design: "",
    address: "",
  });

  const fetchRecords = async () => {
    try {
      const response = await fetch("/api/bom");
      if (!response.ok) {
        console.warn(`BOM fetch returned status: ${response.status}`);
        setRecords([]);
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setRecords(data.data);
      } else {
        console.warn("BOM data format unexpected:", data);
        setRecords([]);
      }
    } catch (error) {
      console.warn("Error fetching BOM records:", error);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newRecord: BOMRecord = {
      id: `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name,
      project_in_kw: parseFloat(formData.project_in_kw),
      wattage_of_panels: parseFloat(formData.wattage_of_panels),
      panel_name: formData.panel_name || undefined,
      table_option: formData.table_option,
      phase: formData.phase,
      ac_wire: formData.ac_wire,
      dc_wire: formData.dc_wire,
      la_wire: formData.la_wire,
      earthing_wire: formData.earthing_wire,
      no_of_legs: parseInt(formData.no_of_legs),
      front_leg: formData.front_leg,
      back_leg: formData.back_leg,
      roof_design: formData.roof_design,
      address: formData.address,
      created_at: Date.now(),
    };

    try {
      const response = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setRecords([data.data, ...records]);
        setFormData({
          name: "",
          project_in_kw: "",
          wattage_of_panels: "",
          panel_name: "",
          table_option: "Option 1",
          phase: "SINGLE",
          ac_wire: "",
          dc_wire: "",
          la_wire: "",
          earthing_wire: "",
          no_of_legs: "",
          front_leg: "",
          back_leg: "",
          roof_design: "",
          address: "",
        });
        setShowForm(false);
        alert("BOM record added successfully!");
      } else {
        alert(`Failed to add BOM: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error adding BOM record:", error);
      alert("Network error. Please check your connection and try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this BOM record?")) return;

    try {
      const response = await fetch(`/api/bom?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        setRecords(records.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Error deleting BOM record:", error);
    }
  };

  const handleStockOut = async (record: BOMRecord) => {
    const confirmMsg = `This will deduct all materials from this BOM from your inventory:\n\n` +
      `• AC Wire: ${record.ac_wire || "N/A"}\n` +
      `• DC Wire: ${record.dc_wire || "N/A"}\n` +
      `• LA Wire: ${record.la_wire || "N/A"}\n` +
      `• Earthing Wire: ${record.earthing_wire || "N/A"}\n` +
      `• Solar Panels: ${Math.ceil(record.project_in_kw * 1000 / record.wattage_of_panels)} units${record.panel_name ? ` (${record.panel_name})` : ""}\n` +
      `• Inverter: ${record.project_in_kw}KW ${record.phase}\n` +
      (record.no_of_legs > 0 ? `• Structure Legs: ${record.no_of_legs} units\n` : "") +
      `\nCustomer: ${record.name}\n\n` +
      `Are you sure you want to proceed?`;

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch("/api/bom/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bomId: record.id,
          bomRecord: record,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        let message = `✅ Stock Out Successful!\n\nDeducted materials for ${record.name}:\n`;
        data.data.forEach((item: { description: string; qty: number; type: string }) => {
          message += `\n• ${item.description}: ${item.qty} x ${item.type}`;
        });
        
        if (data.warnings) {
          message += `\n\n⚠️ Warnings:\n${data.warnings}`;
        }
        
        alert(message);
        window.location.reload();
      } else {
        alert(`❌ Stock Out Failed\n\n${data.error || "Unknown error occurred"}`);
      }
    } catch (error) {
      console.error("Error processing stock out:", error);
      alert("❌ Network error. Please check your connection and try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-400">Loading BOM records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">BOM Generation</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Manage Bill of Materials for customer projects
            </p>
          </div>
          <div className="flex gap-2">
            {records.length > 0 && (
              <Button
                onClick={() => exportAllBOMsToExcel(records)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Export All to Excel
              </Button>
            )}
            {!showForm && !showCustomCreator && !showCreateOptions && (
              <Button
                onClick={() => setShowCreateOptions(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create BOM
              </Button>
            )}
            {showCreateOptions && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowForm(true);
                    setShowCreateOptions(false);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Fill Form
                </Button>
                <Button
                  onClick={() => {
                    setShowCustomCreator(true);
                    setShowCreateOptions(false);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Create Your Own
                </Button>
                <Button
                  onClick={() => setShowCreateOptions(false)}
                  variant="outline"
                  className="border-neutral-700 text-neutral-400"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {showCustomCreator && (
          <CardContent className="border-t border-neutral-800 pt-4">
            <CustomBOMCreator
              onSave={async (bomName, rows) => {
                // Create a custom BOM record
                const customBOM: BOMRecord = {
                  id: `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  name: bomName,
                  project_in_kw: 0, // Custom BOM doesn't have these fields
                  wattage_of_panels: 0,
                  panel_name: "Custom BOM",
                  table_option: "Custom",
                  phase: "SINGLE",
                  ac_wire: "",
                  dc_wire: "",
                  la_wire: "",
                  earthing_wire: "",
                  no_of_legs: 0,
                  front_leg: "",
                  back_leg: "",
                  roof_design: "Custom",
                  created_at: Date.now(),
                };

                try {
                  // Save the BOM record first
                  const response = await fetch("/api/bom", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(customBOM),
                  });

                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  const data = await response.json();
                  if (data.success) {
                    // Save the custom rows to edits API
                    await fetch("/api/bom/edits", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        bomId: customBOM.id,
                        data: rows,
                      }),
                    });

                    // Also save to localStorage as backup
                    localStorage.setItem(`bom-${customBOM.id}`, JSON.stringify(rows));

                    setRecords([data.data, ...records]);
                    setShowCustomCreator(false);
                    alert(`✅ Custom BOM "${bomName}" created successfully with ${rows.length} items!`);
                  } else {
                    throw new Error(data.error || "Failed to create BOM");
                  }
                } catch (error) {
                  console.error("Error creating custom BOM:", error);
                  alert("❌ Failed to create custom BOM. Please try again.");
                }
              }}
              onCancel={() => setShowCustomCreator(false)}
            />
          </CardContent>
        )}

        {showForm && (
          <CardContent className="border-t border-neutral-800 pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="Customer address (optional)"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Project (KW) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.project_in_kw}
                  onChange={(e) => setFormData({ ...formData, project_in_kw: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="e.g., 5.5"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Panel Wattage *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.wattage_of_panels}
                  onChange={(e) => setFormData({ ...formData, wattage_of_panels: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="e.g., 550"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Solar Panel Name</label>
                <input
                  type="text"
                  value={formData.panel_name}
                  onChange={(e) => setFormData({ ...formData, panel_name: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="e.g., Trina 550W Mono PERC"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Phase *</label>
                <select
                  required
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value as "SINGLE" | "TRIPLE" })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                >
                  <option value="SINGLE">SINGLE</option>
                  <option value="TRIPLE">TRIPLE</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">AC Wire Length (meters)</label>
                <input
                  type="text"
                  value={formData.ac_wire}
                  onChange={(e) => setFormData({ ...formData, ac_wire: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="e.g., 50"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">DC Wire Length (meters)</label>
                <input
                  type="text"
                  value={formData.dc_wire}
                  onChange={(e) => setFormData({ ...formData, dc_wire: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="e.g., 60"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">LA Wire Length (meters)</label>
                <input
                  type="text"
                  value={formData.la_wire}
                  onChange={(e) => setFormData({ ...formData, la_wire: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="e.g., 10"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Earthing Wire Length (meters)</label>
                <input
                  type="text"
                  value={formData.earthing_wire}
                  onChange={(e) => setFormData({ ...formData, earthing_wire: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="e.g., 70"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">No. of Legs</label>
                <input
                  type="number"
                  value={formData.no_of_legs}
                  onChange={(e) => setFormData({ ...formData, no_of_legs: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="e.g., 4"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Front Leg</label>
                <input
                  type="text"
                  value={formData.front_leg}
                  onChange={(e) => setFormData({ ...formData, front_leg: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="Front leg details"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Back Leg</label>
                <input
                  type="text"
                  value={formData.back_leg}
                  onChange={(e) => setFormData({ ...formData, back_leg: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="Back leg details"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-xs text-neutral-400 mb-1 block">Roof Design</label>
                <input
                  type="text"
                  value={formData.roof_design}
                  onChange={(e) => setFormData({ ...formData, roof_design: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 text-sm"
                  placeholder="Roof design specifications"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Add BOM Record
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              No BOM records yet. Click &quot;Add BOM&quot; to create one.
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer name..."
                  className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 placeholder:text-neutral-500 w-64"
                />
              </div>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800 hover:bg-transparent">
                    <TableHead className="text-neutral-400">Customer</TableHead>
                    <TableHead className="text-neutral-400">Project (KW)</TableHead>
                    <TableHead className="text-neutral-400">Panel Wattage</TableHead>
                    <TableHead className="text-neutral-400">Phase</TableHead>
                    <TableHead className="text-neutral-400">AC Wire (m)</TableHead>
                    <TableHead className="text-neutral-400">DC Wire (m)</TableHead>
                    <TableHead className="text-neutral-400">No. of Legs</TableHead>
                    <TableHead className="text-neutral-400">Created</TableHead>
                    <TableHead className="text-neutral-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records
                    .filter(record => 
                      searchQuery.trim() === "" || 
                      record.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((record) => (
                    <TableRow key={record.id} className="border-neutral-800 hover:bg-neutral-800/50">
                      <TableCell className="text-neutral-200 font-medium">{record.name}</TableCell>
                      <TableCell className="text-neutral-300">{record.project_in_kw} KW</TableCell>
                      <TableCell className="text-neutral-300">{record.wattage_of_panels}W</TableCell>
                      <TableCell className="text-neutral-300">
                        <span className={`px-2 py-1 rounded text-xs ${
                          record.phase === 'SINGLE' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {record.phase}
                        </span>
                      </TableCell>
                      <TableCell className="text-neutral-300">{record.ac_wire ? `${record.ac_wire}m` : '-'}</TableCell>
                      <TableCell className="text-neutral-300">{record.dc_wire ? `${record.dc_wire}m` : '-'}</TableCell>
                      <TableCell className="text-neutral-300">{record.no_of_legs || '-'}</TableCell>
                      <TableCell className="text-neutral-400 text-xs">
                        {new Date(record.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => window.open(`/bom/${record.id}`, '_blank')}
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/50"
                            title="Edit BOM (View, Edit, Print, Export)"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleStockOut(record)}
                            variant="ghost"
                            size="sm"
                            className="text-orange-400 hover:text-orange-300 hover:bg-orange-950/50"
                            title="Stock Out - Deduct materials from inventory"
                          >
                            <PackageMinus className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => exportBOMAsHTML(record)}
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300 hover:bg-green-950/50"
                            title="Download BOM as HTML"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(record.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                            title="Delete BOM record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}