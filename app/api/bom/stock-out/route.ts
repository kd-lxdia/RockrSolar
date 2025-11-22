import { NextRequest, NextResponse } from "next/server";
import { addEvent, getEvents } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bomId, bomRecord, checkOnly } = body;

    if (!bomRecord) {
      return NextResponse.json(
        { success: false, error: "BOM record is required" },
        { status: 400 }
      );
    }

    let materials: Array<{item: string, type: string, qty: number, description: string}> = [];

    // Check if this is a custom BOM
    console.log('BOM table_option:', bomRecord.table_option);
    console.log('customItems in body:', body.customItems ? body.customItems.length : 'not provided');
    
    if (bomRecord.table_option === "Custom") {
      // For custom BOMs, load the actual items from the edits
      try {
        // Try to get custom items from the request body first
        if (body.customItems && body.customItems.length > 0) {
          materials = body.customItems.map((row: any) => ({
            item: row.item || "",
            type: row.make || row.description || "Custom",
            qty: parseFloat(row.qty) || 0,
            description: row.item || "Custom Item"
          }));
          console.log('✅ Loaded', materials.length, 'custom items');
        } else {
          // If not in body, return error
          console.error('❌ Custom BOM but no customItems provided');
          return NextResponse.json(
            { 
              success: false, 
              error: "Custom BOM items not provided. Please reload the page and try again." 
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error("Error loading custom BOM items:", error);
        return NextResponse.json(
          { success: false, error: "Failed to load custom BOM items" },
          { status: 500 }
        );
      }
    } else {
      // For standard BOMs, use the traditional calculation
      materials = [
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
    }

    // Get current inventory to check availability
    const allEvents = await getEvents();
    
    // Calculate current stock for each item-type combination
    const stockLevels = new Map<string, number>();
    allEvents.forEach(event => {
      const key = `${event.item}::${event.type}`;
      const currentQty = stockLevels.get(key) || 0;
      if (event.kind === "IN") {
        stockLevels.set(key, currentQty + event.qty);
      } else if (event.kind === "OUT") {
        stockLevels.set(key, currentQty - event.qty);
      }
    });

    // Check if all materials are available in sufficient quantity
    const insufficientItems: Array<{description: string, required: number, available: number}> = [];
    
    for (const material of materials) {
      if (material.type && material.type.trim() !== "") {
        const key = `${material.item}::${material.type}`;
        const available = stockLevels.get(key) || 0;
        
        if (available < material.qty) {
          insufficientItems.push({
            description: `${material.description} (${material.type})`,
            required: material.qty,
            available: available
          });
        }
      }
    }

    // If checkOnly flag is set, just return availability status
    if (checkOnly) {
      return NextResponse.json({
        success: true,
        available: insufficientItems.length === 0,
        insufficientItems
      });
    }

    // If items are insufficient, return error
    if (insufficientItems.length > 0) {
      const errorMsg = insufficientItems.map(
        item => `${item.description}: Need ${item.required}, Available ${item.available}`
      ).join('\n');
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Insufficient inventory",
          insufficientItems,
          details: errorMsg
        },
        { status: 400 }
      );
    }

    // Extract all materials from BOM and create stock out events
    const stockOutEvents = [];
    const timestamp = Date.now();

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
