"use client";

import React from "react";
import { useInventory } from "@/lib/inventory-store-postgres";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { exportStockInToExcel, exportStockOutToExcel } from "@/lib/exportExcel";

/* ------------------------------------------------------------------ */
type GenericDropdownProps = {
  label: string;
  selected?: string;
  options: string[];
  onSelect: (v: string) => void;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
};

function GenericDropdown({
  label,
  selected,
  options,
  onSelect,
  onAdd,
  onRemove,
}: GenericDropdownProps) {
  const [newName, setNewName] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const filteredOptions = React.useMemo(
    () => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const handleDeleteClick = React.useCallback((itemToDelete: string) => {
    setDeleteConfirm(itemToDelete);
    setIsOpen(false); // Close dropdown immediately
  }, []);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md text-sm">
          <span className="text-neutral-400">{label}:</span>
          <span className="font-medium text-neutral-100">
            {selected ?? "Select"}
          </span>
          <ChevronDown size={14} className="text-neutral-500" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-56 bg-[#121317] border-neutral-800 text-neutral-100">
          <div className="px-2 pt-2 pb-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 placeholder:opacity-60"
            />
          </div>

          <DropdownMenuLabel className="text-neutral-400">Choose</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {filteredOptions.map((o) => (
            <div key={o} className="flex items-center justify-between px-2 py-1 hover:bg-neutral-800 rounded-sm">
              <button
                onClick={() => {
                  onSelect(o);
                  setIsOpen(false);
                }}
                className="flex-1 text-left text-neutral-100"
              >
                {o}
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteClick(o);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-1 ml-2 rounded hover:bg-red-900 hover:text-red-300 text-neutral-500 flex-shrink-0"
                aria-label={`Delete ${o}`}
                title={`Delete ${o}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <DropdownMenuSeparator />

          <div className="px-2 py-2">
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`Add ${label.toLowerCase()}`}
                className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
              />
              <Button
                size="sm"
                onClick={() => {
                  const trimmed = newName.trim();
                  if (trimmed) {
                    onAdd(trimmed);
                    setNewName("");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500"
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Confirm Deletion
            </h3>
            <p className="text-neutral-300 mb-6">
              Are you sure you want to delete &quot;{deleteConfirm}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-neutral-400 hover:text-neutral-200 border border-neutral-600 rounded hover:border-neutral-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemove(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ItemDropdown = (props: Omit<GenericDropdownProps, "label">) => (
  <GenericDropdown label="Item" {...props} />
);
const TypeDropdown = (props: Omit<GenericDropdownProps, "label">) => (
  <GenericDropdown label="Type" {...props} />
);
const SupplierDropdown = (props: Omit<GenericDropdownProps, "label">) => (
  <GenericDropdown label="Supplier" {...props} />
);

type ReportRow = {
  id: string;
  at: number;
  item: string;
  type: string;
  qty: number;
  source?: string;
  invoice?: string;
  price?: number;
  gst?: number;
  supplier?: string;
  date?: number;
};

interface StockPanelsProps {
  mode?: "in" | "out" | "total";
}

export default function StockPanels({ mode = "total" }: StockPanelsProps) {
  const inv = useInventory();

  // Selection - start with undefined to avoid showing deleted items
  const [item, setItem] = React.useState<string | undefined>(undefined);
  const [type, setType] = React.useState<string>("");

  const types = item ? inv.getTypesForItem(item) : [];

  // New Stock Out Table - automatically shown
  const [showStockOutTable, setShowStockOutTable] = React.useState<boolean>(true);
  
  // Global fields for stock out (same for all rows)
  const [globalCustomerName, setGlobalCustomerName] = React.useState<string>("");
  const [globalInvoiceNo, setGlobalInvoiceNo] = React.useState<string>("");
  const [globalAddress, setGlobalAddress] = React.useState<string>("");
  
  type StockOutRow = {
    item: string;
    type: string;
    quantity: string;
    price: string;
    gst: string;
    date: string;
    currentStock: number;
  };
  
  const [stockOutRows, setStockOutRows] = React.useState<StockOutRow[]>([]);

  // Stock In
  const [qin, setQin] = React.useState<string>("");
  const [stockInDate, setStockInDate] = React.useState<string>(""); // yyyy-mm-dd
  const [invoiceNo, setInvoiceNo] = React.useState<string>("");
  const [stockInSource, setStockInSource] = React.useState<string>("");
  const [stockInPrice, setStockInPrice] = React.useState<string>("");
  const [stockInGST, setStockInGST] = React.useState<string>("");
  const [hsnMappings, setHsnMappings] = React.useState<Array<{item_name: string, type_name: string, hsn_code: string}>>([]);

  // Load HSN mappings from database
  React.useEffect(() => {
    const loadHSNMappings = async () => {
      try {
        const response = await fetch('/api/hsn');
        const data = await response.json();
        if (data.success) {
          setHsnMappings(data.data);
        }
      } catch (error) {
        console.error('Error loading HSN mappings:', error);
      }
    };
    loadHSNMappings();
  }, []);

  // Get HSN for item and type from database
  const getHSNForType = React.useCallback((itemName: string, typeName: string): string => {
    const mapping = hsnMappings.find(
      m => m.item_name === itemName && m.type_name === typeName
    );
    return mapping?.hsn_code || "";
  }, [hsnMappings]);

  // Initialize item selection when items become available
  React.useEffect(() => {
    if (!item && inv.items.length > 0) {
      setItem(inv.items[0]);
    }
    // Clear item if the selected item is no longer available
    if (item && !inv.items.includes(item)) {
      setItem(inv.items[0] || undefined);
      setType(""); // Clear type as well
    }
  }, [inv.items, item]);

  // Initialize type selection when types become available for selected item
  React.useEffect(() => {
    if (item) {
      const availableTypes = inv.getTypesForItem(item);
      if (!type && availableTypes.length > 0) {
        setType(availableTypes[0]);
      }
      // Clear type if the selected type is no longer available for this item
      if (type && !availableTypes.includes(type)) {
        setType(availableTypes[0] || "");
      }
    } else {
      setType("");
    }
  }, [item, inv.getTypesForItem, type, inv]);

  // Initialize source selection when sources become available
  React.useEffect(() => {
    if (!stockInSource && inv.sources.length > 0) {
      setStockInSource(inv.sources[0]);
    }
    // Clear source if the selected source is no longer available
    if (stockInSource && !inv.sources.includes(stockInSource)) {
      setStockInSource(inv.sources[0] || "");
    }
  }, [inv.sources, stockInSource]);

  // Auto-initialize stock out table when items are available
  React.useEffect(() => {
    if (inv.items.length > 0 && stockOutRows.length === 0) {
      initializeStockOutTable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv.items.length]);

  // Report filters
  const [reportSource, setReportSource] = React.useState<string>("All");
  const [reportFrom, setReportFrom] = React.useState<string>("");
  const [reportTo, setReportTo] = React.useState<string>("");

  const handleStockIn = async () => {
    console.log('Stock In clicked:', { item, type, qin, stockInPrice, stockInSource, invoiceNo });
    
    if (!item || !type || !qin || Number(qin) <= 0) {
      console.log('Validation failed:', { item, type, qin });
      alert('Please fill in Item, Type, and Quantity (must be > 0)');
      return;
    }

    try {
      console.log('Adding stock in event...');
      await inv.addEvent({
        item,
        type,
        qty: Number(qin),
        rate: stockInPrice !== "" ? Number(stockInPrice) : 0,
        source: stockInSource || "Unknown",
        supplier: invoiceNo.trim() || "Unknown",
        kind: "IN"
      });

      console.log('Stock in event added successfully');
      setQin("");
      setInvoiceNo("");
      setStockInPrice("");
      setStockInGST("");
    } catch (error) {
      console.error('Error adding stock in:', error);
      alert('Failed to add stock. Check console for details.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Find all input elements in the form
      const form = e.currentTarget.closest('form') || e.currentTarget.closest('.space-y-3');
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"])')) as HTMLInputElement[];
        const currentIndex = inputs.indexOf(e.currentTarget);
        if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
          // Move to next input
          inputs[currentIndex + 1]?.focus();
        } else {
          // Last field - submit
          handleStockIn();
        }
      }
    }
  };

  const handleStockOutKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Find all inputs in current row
      const row = e.currentTarget.closest('tr');
      if (row) {
        const inputs = Array.from(row.querySelectorAll('input')) as HTMLInputElement[];
        const currentIndex = inputs.indexOf(e.currentTarget);
        if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
          // Move to next input in same row
          inputs[currentIndex + 1]?.focus();
        } else {
          // Last field in row - process if has quantity
          const rowData = stockOutRows[rowIndex];
          if (rowData.item && rowData.type && rowData.quantity && Number(rowData.quantity) > 0) {
            await inv.addEvent({
              item: rowData.item,
              type: rowData.type,
              qty: Number(rowData.quantity),
              rate: Number(rowData.price) || 0,
              source: globalCustomerName || "Bulk Stock Out",
              supplier: globalInvoiceNo || "Unknown",
              kind: "OUT"
            });
            
            // Clear the quantity and price fields after processing
            const newRows = [...stockOutRows];
            newRows[rowIndex] = {
              ...rowData,
              quantity: "",
              price: "",
              gst: "",
              currentStock: getCurrentStock(rowData.item, rowData.type)
            };
            setStockOutRows(newRows);
            
            // Move to first input of next row if exists
            const nextRow = row.nextElementSibling;
            if (nextRow) {
              const nextInputs = Array.from(nextRow.querySelectorAll('input')) as HTMLInputElement[];
              nextInputs[0]?.focus();
            }
          }
        }
      }
    }
  };

  // Stock Out Table Functions
  const getCurrentStock = React.useCallback((itemName: string, type: string): number => {
    if (!itemName || !type) return 0;
    return inv.events
      .filter(e => e.item === itemName && e.type === type)
      .reduce((total, e) => total + (e.kind === "IN" ? e.qty : -e.qty), 0);
  }, [inv.events]);

  const initializeStockOutTable = () => {
    const rows: StockOutRow[] = inv.items.map(itemName => {
      const types = inv.getTypesForItem(itemName);
      const firstType = types[0] || "";
      const currentStock = getCurrentStock(itemName, firstType);
      
      return {
        item: itemName,
        type: firstType,
        quantity: "",
        price: "",
        gst: "",
        date: new Date().toISOString().split('T')[0],
        currentStock
      };
    });
    setStockOutRows(rows);
    setShowStockOutTable(true);
  };

  const updateStockOutRow = (index: number, field: keyof StockOutRow, value: string) => {
    setStockOutRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };
      
      // If type is changed, recalculate current stock
      if (field === 'type') {
        const item = newRows[index].item;
        const type = value;
        const currentStock = getCurrentStock(item, type);
        newRows[index].currentStock = currentStock;
      }
      
      return newRows;
    });
  };

  // Update stock-out table when inventory changes
  React.useEffect(() => {
    if (showStockOutTable && stockOutRows.length > 0) {
      setStockOutRows(prev => prev.map(row => ({
        ...row,
        currentStock: getCurrentStock(row.item, row.type)
      })));
    }
  }, [inv.events, showStockOutTable, getCurrentStock, stockOutRows.length]);

  const processStockOutTable = async () => {
    console.log('Process Stock Out clicked. Rows:', stockOutRows);
    
    // Filter valid rows
    const validRows = stockOutRows.filter(row => row.item && row.type && row.quantity && Number(row.quantity) > 0);
    console.log('Valid rows to process:', validRows.length);
    
    if (validRows.length === 0) {
      alert('No valid rows to process. Please fill in Item, Type, and Quantity.');
      return;
    }
    
    // Check stock availability for all rows
    const insufficientStock: string[] = [];
    const unavailableItems: string[] = [];
    
    validRows.forEach(row => {
      const currentStock = getCurrentStock(row.item, row.type);
      const requestedQty = Number(row.quantity);
      
      if (currentStock === 0) {
        unavailableItems.push(`${row.item} - ${row.type}`);
      } else if (currentStock < requestedQty) {
        insufficientStock.push(`${row.item} - ${row.type} (Available: ${currentStock}, Requested: ${requestedQty})`);
      }
    });
    
    // Show error if any items are unavailable or insufficient
    if (unavailableItems.length > 0) {
      alert(`❌ Items NOT AVAILABLE in stock:\n\n${unavailableItems.join('\n')}\n\nPlease remove these items or add stock first.`);
      return;
    }
    
    if (insufficientStock.length > 0) {
      alert(`⚠️ INSUFFICIENT STOCK for:\n\n${insufficientStock.join('\n')}\n\nPlease reduce quantities or add more stock.`);
      return;
    }
    
    try {
      // Process all rows with await
      const promises = validRows.map(row => {
        console.log('Processing row:', row);
        return inv.addEvent({
          item: row.item,
          type: row.type,
          qty: Number(row.quantity),
          rate: Number(row.price) || 0,
          source: globalCustomerName || "Bulk Stock Out",
          supplier: globalInvoiceNo || "Unknown",
          kind: "OUT"
        });
      });
      
      // Wait for all events to be saved
      await Promise.all(promises);
      console.log('All stock out events processed successfully');
      
      // Reset table after all events are saved
      setStockOutRows([]);
      setShowStockOutTable(false);
      alert('✅ Stock OUT processed successfully!');
    } catch (error) {
      console.error('Error processing stock out:', error);
      alert('Failed to process stock out. Check console for details.');
    }
  };

  const buildReport = React.useCallback((): ReportRow[] => {
    const fromTs = reportFrom ? new Date(reportFrom).getTime() : -Infinity;
    const toTs = reportTo
      ? new Date(reportTo).getTime() + 24 * 60 * 60 * 1000
      : Infinity;

    return inv.events
      .filter((e) => e.timestamp >= fromTs && e.timestamp <= toTs)
      .filter((e) => (reportSource !== "All" ? e.source === reportSource : true))
      .map<ReportRow>((e) => ({
        id: e.id,
        at: e.timestamp,
        item: e.item,
        type: e.type,
        qty: e.qty,
        source: e.source,
        invoice: e.supplier, // Using supplier as invoice for now
        price: e.rate,
        gst: undefined, // Not in new structure
        supplier: e.supplier,
        date: e.timestamp,
      }));
  }, [inv.events, reportFrom, reportTo, reportSource]);

  const reportResults = buildReport();

  const handleDownloadExcel = () => {
    const rows = reportResults.map((r) => {
      // Find the original event to get the "kind" field
      const event = inv.events.find(e => e.id === r.id);
      // Get HSN code for this item+type
      const hsn = getHSNForType(r.item, r.type);
      
      return {
        "Selected Date": r.date
          ? new Date(r.date).toLocaleDateString()
          : new Date(r.at).toLocaleDateString(),
        "Recorded At": new Date(r.at).toLocaleString(),
        "Invoice No.": r.invoice ?? "",
        Item: r.item,
        Type: r.type,
        "HSN Code": hsn || "",
        Kind: event?.kind ?? "",
        Quantity: r.qty,
        Invoice: r.supplier ?? r.source ?? "",
        Price: typeof r.price === "number" ? r.price : "",
        GST: r.gst ?? "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Apply color coding: green for IN, red for OUT
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      // Get the "Kind" cell value (column G, index 6 - moved because HSN was added)
      const kindCell = ws[XLSX.utils.encode_cell({ r: R, c: 6 })];
      if (kindCell && kindCell.v) {
        const fillColor = kindCell.v === "IN" ? "C6EFCE" : "FFC7CE"; // Light green for IN, light red for OUT
        
        // Apply color to the entire row
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          
          if (!ws[cellAddress].s) ws[cellAddress].s = {};
          ws[cellAddress].s.fill = {
            fgColor: { rgb: fillColor }
          };
        }
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Report");
    XLSX.writeFile(wb, "stock_report.xlsx");
  };

  return (
    <div className={`grid gap-4 ${
      mode === "in" ? "grid-cols-1" : 
      mode === "out" ? "grid-cols-1" : 
      "grid-cols-1 md:grid-cols-3"
    }`}>
      {/* STOCK IN - Show only on 'in' or 'total' mode */}
      {(mode === "in" || mode === "total") && (
        <Card className={`bg-neutral-900/60 border-neutral-800 ${mode === "total" ? "md:col-span-1" : ""}`}>
          <CardHeader>
            <CardTitle className="text-xs tracking-wider text-neutral-400">
              STOCK IN
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
          <ItemDropdown
            selected={item}
            onSelect={(v) => {
              setItem(v);
              const first = inv.getTypesForItem(v)[0] ?? "";
              setType(first);
            }}
            onAdd={(name) => inv.addItem(name)}
            onRemove={(name) => {
              // If the deleted item was currently selected, clear selection or select first available
              if (item === name) {
                const remainingItems = inv.items.filter(i => i !== name);
                const newItem = remainingItems[0];
                setItem(newItem);
                const newType = newItem ? inv.getTypesForItem(newItem)[0] ?? "" : "";
                setType(newType);
              }
              inv.removeItem(name);
            }}
            options={inv.items}
          />

          <TypeDropdown
            selected={type}
            onSelect={(v) => setType(v)}
            onAdd={(name) => item && inv.addType(item, name)}
            onRemove={(name) => {
              // If the deleted type was currently selected, clear selection or select first available
              if (type === name && item) {
                const remainingTypes = inv.getTypesForItem(item).filter(t => t !== name);
                setType(remainingTypes[0] ?? "");
              }
              if (item) {
                inv.removeType(item, name);
              }
            }}
            options={types}
          />

          <SupplierDropdown
            selected={stockInSource}
            onSelect={(v) => setStockInSource(v)}
            onAdd={(name) => inv.addSource(name)}
            onRemove={(name) => {
              // If the deleted source was currently selected, clear selection or select first available
              if (stockInSource === name) {
                const remainingSources = inv.sources.filter(s => s !== name);
                setStockInSource(remainingSources[0] ?? "");
              }
              inv.removeSource(name);
            }}
            options={inv.sources}
          />
          </div>

          <div className="flex flex-wrap gap-2">
            <Input
              type="number"
              value={qin}
              onChange={(e) => setQin(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Quantity..."
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <Input
              type="date"
              value={stockInDate}
              onChange={(e) => setStockInDate(e.target.value)}
              onKeyPress={handleKeyPress}
              max={new Date().toISOString().split('T')[0]}
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <Input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Invoice No."
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <Input
              type="number"
              step="0.01"
              value={stockInPrice}
              onChange={(e) => setStockInPrice(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Price"
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <Input
              type="number"
              value={stockInGST}
              onChange={(e) => setStockInGST(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="GST (%)"
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
          </div>

          <div className="flex gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-500 flex-1"
              onClick={handleStockIn}
            >
              Add Stock
            </Button>
            {mode === "in" && (
              <Button
                className="bg-green-600 hover:bg-green-500"
                onClick={async () => await exportStockInToExcel(inv.events)}
              >
                📥 Export Stock IN
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* STOCK OUT - Show only on 'out' or 'total' mode */}
      {(mode === "out" || mode === "total") && (
        <Card className={`bg-neutral-900/60 border-neutral-800 ${mode === "total" ? "md:col-span-2" : ""}`}>
          <CardHeader>
            <CardTitle className="text-xs tracking-wider text-neutral-400">
              STOCK OUT
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-3">
          {!showStockOutTable ? (
            <Button
              className="w-full bg-orange-500 hover:bg-orange-400"
              onClick={initializeStockOutTable}
            >
              Open Stock Out Table
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Global Customer Info */}
              <div className="bg-neutral-800/50 p-4 rounded-lg space-y-3 border border-neutral-700">
                <h3 className="text-sm font-semibold text-neutral-200 mb-3">Customer Information (Same for all items)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Customer Name</label>
                    <Input
                      type="text"
                      value={globalCustomerName}
                      onChange={(e) => setGlobalCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      className="bg-neutral-900 border-neutral-800 text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Invoice No.</label>
                    <Input
                      type="text"
                      value={globalInvoiceNo}
                      onChange={(e) => setGlobalInvoiceNo(e.target.value)}
                      placeholder="Enter invoice number"
                      className="bg-neutral-900 border-neutral-800 text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Address</label>
                    <Input
                      type="text"
                      value={globalAddress}
                      onChange={(e) => setGlobalAddress(e.target.value)}
                      placeholder="Enter address"
                      className="bg-neutral-900 border-neutral-800 text-neutral-100"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-auto border border-neutral-800 rounded-md">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="border-neutral-800">
                      <TableHead className="text-neutral-400 min-w-[120px]">Item</TableHead>
                      <TableHead className="text-neutral-400 min-w-[120px]">Type</TableHead>
                      <TableHead className="text-neutral-400 min-w-[100px]">Quantity</TableHead>
                      <TableHead className="text-neutral-400 min-w-[100px]">Price</TableHead>
                      <TableHead className="text-neutral-400 min-w-[80px]">GST (%)</TableHead>
                      <TableHead className="text-neutral-400 min-w-[120px]">Date</TableHead>
                      <TableHead className="text-neutral-400 min-w-[100px]">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockOutRows.map((row, index) => (
                      <TableRow key={index} className="border-neutral-800">
                        <TableCell className="text-neutral-100 font-medium">
                          {row.item}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-neutral-200 px-2 py-1 rounded text-sm">
                              {row.type || "Select Type"}
                              <ChevronDown className="h-3 w-3" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-neutral-900 border-neutral-800">
                              {inv.getTypesForItem(row.item).map((type) => (
                                <DropdownMenuItem
                                  key={type}
                                  className="text-neutral-200 cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
                                  onClick={() => {
                                    updateStockOutRow(index, 'type', type);
                                  }}
                                >
                                  {type}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={(e) => updateStockOutRow(index, 'quantity', e.target.value)}
                            onKeyDown={(e) => handleStockOutKeyPress(e, index)}
                            placeholder="Qty"
                            className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.price}
                            onChange={(e) => updateStockOutRow(index, 'price', e.target.value)}
                            onKeyDown={(e) => handleStockOutKeyPress(e, index)}
                            placeholder="Price"
                            className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.gst}
                            onChange={(e) => updateStockOutRow(index, 'gst', e.target.value)}
                            onKeyDown={(e) => handleStockOutKeyPress(e, index)}
                            placeholder="GST"
                            className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateStockOutRow(index, 'date', e.target.value)}
                            onKeyDown={(e) => handleStockOutKeyPress(e, index)}
                            max={new Date().toISOString().split('T')[0]}
                            className="bg-neutral-900 border-neutral-800 text-neutral-100 w-32"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`font-bold px-2 py-1 rounded text-sm ${
                              getCurrentStock(row.item, row.type) < Number(row.quantity || 0) 
                                ? "bg-red-900 text-red-300" 
                                : "bg-green-900 text-green-300"
                            }`}>
                              {getCurrentStock(row.item, row.type)}
                            </span>
                            {(getCurrentStock(row.item, row.type) - Number(row.quantity || 0)) === 0 && (
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 text-green-600 bg-neutral-800 border-neutral-600 rounded focus:ring-green-500"
                                title="Stock will reach zero after this transaction"
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  className="bg-green-600 hover:bg-green-500"
                  onClick={processStockOutTable}
                >
                  Process All Stock Out
                </Button>
                {mode === "out" && (
                  <Button
                    className="bg-orange-600 hover:bg-orange-500"
                    onClick={async () => await exportStockOutToExcel(inv.events)}
                  >
                    📤 Export Stock OUT
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                  onClick={() => {
                    setStockOutRows([]);
                    setShowStockOutTable(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}


      {/* REPORT - Show only on 'total' mode */}
      {mode === "total" && (
        <Card className="bg-neutral-900/60 border-neutral-800 md:col-span-3">
          <CardHeader>
            <CardTitle className="text-xs tracking-wider text-neutral-400">
              REPORT & EXPORT
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              type="date"
              value={reportFrom}
              onChange={(e) => setReportFrom(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <Input
              type="date"
              value={reportTo}
              onChange={(e) => setReportTo(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <select
              value={reportSource}
              onChange={(e) => setReportSource(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
            >
              <option value="All">All</option>
              {inv.sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="bg-green-600 hover:bg-green-500"
            onClick={handleDownloadExcel}
          >
            Download Excel
          </Button>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
