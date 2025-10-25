import { NextRequest, NextResponse } from "next/server";
import { addEvent } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bomId, bomRecord } = body;

    if (!bomRecord) {
      return NextResponse.json(
        { success: false, error: "BOM record is required" },
        { status: 400 }
      );
    }

    // Extract all materials from BOM and create stock out events
    const stockOutEvents = [];
    const timestamp = Date.now();

    // Define materials to deduct from BOM
    const materials = [
      { item: "Wires", type: bomRecord.ac_wire, qty: 1, description: "AC Wire" },
      { item: "Wires", type: bomRecord.dc_wire, qty: 1, description: "DC Wire" },
      { item: "Wires", type: bomRecord.la_wire, qty: 1, description: "LA Wire" },
      { item: "Wires", type: bomRecord.earthing_wire, qty: 1, description: "Earthing Wire" },
      { item: "Solar Panels", type: `${bomRecord.wattage_of_panels}W`, qty: Math.ceil(bomRecord.project_in_kw * 1000 / bomRecord.wattage_of_panels), description: "Solar Panels" },
      { item: "Inverter", type: `${bomRecord.project_in_kw}KW ${bomRecord.phase}`, qty: 1, description: "Inverter" },
    ];

    // Add legs if specified
    if (bomRecord.no_of_legs > 0) {
      materials.push({
        item: "Structure Legs",
        type: bomRecord.front_leg || "Front Leg",
        qty: Math.ceil(bomRecord.no_of_legs / 2),
        description: "Front Legs"
      });
      materials.push({
        item: "Structure Legs",
        type: bomRecord.back_leg || "Back Leg",
        qty: Math.floor(bomRecord.no_of_legs / 2),
        description: "Back Legs"
      });
    }

    // Create stock out events for each material
    const errors = [];
    for (const material of materials) {
      if (material.type && material.type.trim() !== "") {
        try {
          const eventId = `stockout-${bomId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await addEvent({
            id: eventId,
            timestamp: timestamp,
            item: material.item,
            type: material.type,
            qty: material.qty,
            rate: 0, // Rate is 0 for stock out from BOM
            source: "BOM Stock Out",
            supplier: `Customer: ${bomRecord.name}`,
            kind: "OUT",
          });

          stockOutEvents.push({
            item: material.item,
            type: material.type,
            qty: material.qty,
            description: material.description,
          });
        } catch (error) {
          console.error(`Error creating stock out for ${material.description}:`, error);
          errors.push(`${material.description} (${material.type})`);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          success: true, 
          data: stockOutEvents,
          warnings: `Some items could not be deducted: ${errors.join(", ")}`
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, data: stockOutEvents },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing stock out:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process stock out" },
      { status: 500 }
    );
  }
}
