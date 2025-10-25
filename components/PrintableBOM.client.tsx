"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

export default function PrintableBOM({ record }: { record: any }) {
  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error("Print failed:", err);
      alert("Printing is not supported in this environment.");
    }
  };

  const handleDownloadPDF = () => {
    // Use browser's print-to-PDF feature
    try {
      // Open print dialog which allows saving as PDF
      window.print();
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("PDF download not supported. Please use Print and select 'Save as PDF' in the print dialog.");
    }
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="text-sm text-neutral-600">
        <div className="font-semibold">{record.name}</div>
        <div className="text-xs">{record.project_in_kw}kW • {record.phase}</div>
      </div>
      <div className="flex gap-2">
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
          Save as PDF
        </Button>
      </div>
    </div>
  );
}
