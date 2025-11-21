import React from "react";
import { getBOMRecords } from "@/lib/db";
import EditableBOM from "@/components/EditableBOM.client";

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

  return <EditableBOM record={record} />;
}
