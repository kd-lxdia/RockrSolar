import React from "react";
import { getBOMRecords } from "@/lib/db";
import { generateBOMRows } from "@/lib/bom-calculations";
import PrintableBOM from "@/components/PrintableBOM.client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page(props: Props) {
  const params = await props.params;
  const { id } = params;
  
  let record = null;
  let errorMsg: string | null = null;
  
  try {
    const records = await getBOMRecords();
    console.log('Found records:', records.length, 'Looking for ID:', id);
    record = records.find((r) => r.id === id) || null;
    if (!record) {
      console.log('Record not found. Available IDs:', records.map(r => r.id));
    }
  } catch (err) {
    console.error("Failed to load BOM record:", err);
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  if (!record) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold">BOM not found</h2>
        <p className="text-sm text-neutral-500 mt-2">No BOM record found for ID: {id}</p>
        {errorMsg && <p className="text-xs text-red-500 mt-2">Error: {errorMsg}</p>}
      </div>
    );
  }

  // Generate all BOM rows using the calculation library
  const bomRows = generateBOMRows(record);

  // Render complete BOM sheet with all rows
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
        }
      `}} />
      
      <div className="p-8 bg-white text-black min-h-screen print-page">
        <div className="no-print">
          <PrintableBOM record={record} />
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
              </tr>
            </thead>
            <tbody>
              {bomRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-black px-3 py-2 text-sm text-center font-semibold">{row.sr}</td>
                  <td className="border border-black px-3 py-2 text-sm font-medium">{row.item}</td>
                  <td className="border border-black px-3 py-2 text-sm">{row.description}</td>
                  <td className="border border-black px-3 py-2 text-sm">{row.make}</td>
                  <td className="border border-black px-3 py-2 text-sm text-center font-semibold">{row.qty}</td>
                  <td className="border border-black px-3 py-2 text-sm text-center">{row.unit}</td>
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
