"use client";
import React, { useEffect, useState } from "react";
import EditableBOM from "@/components/EditableBOM.client";
import type { BOMRecord } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

export default function Page(props: Props) {
  const [id, setId] = useState<string>("");
  const [record, setRecord] = useState<BOMRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    props.params.then(p => setId(p.id));
  }, [props.params]);

  useEffect(() => {
    if (!id) return;

    async function loadBOM() {
      try {
        const response = await fetch('/api/bom');
        const data = await response.json();
        
        if (data.success && data.data) {
          const found = data.data.find((r: BOMRecord) => r.id === id);
          if (found) {
            setRecord(found);
          } else {
            setError(`No BOM record found for ID: ${id}`);
          }
        } else {
          setError('Failed to load BOMs');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadBOM();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="text-neutral-400">Loading BOM...</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-8 min-h-screen bg-[#0b0c10]">
        <h2 className="text-xl font-semibold text-white">BOM not found</h2>
        <p className="text-sm text-neutral-500 mt-2">No BOM record found for ID: {id}</p>
        {error && <p className="text-xs text-red-500 mt-2">Error: {error}</p>}
        <button 
          onClick={() => window.location.href = '/'} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <EditableBOM record={record} />;
}
