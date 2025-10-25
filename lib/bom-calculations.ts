/**
 * BOM Calculations - Ported from Google Apps Script
 * This module contains all the calculation logic for generating BOM sheets
 */

export interface BOMRecord {
  id: string;
  name: string;
  project_in_kw: number;
  wattage_of_panels: number;
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
  created_at: number;
}

export interface BOMRow {
  sr: number;
  item: string;
  description: string;
  make: string;
  qty: string | number;
  unit: string;
}

export interface InverterConfig {
  units: number;
  eachKw: number;
  desc: string;
}

// Constants
const EARTHING_WIRE_SIZE = '6 sq mm';
const LA_WIRE_SIZE = '16 sq mm';
const COMPUTE_PER_LEG_TOTALS = true;

// Helper functions
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Calculate number of solar panels needed
 */
export function computePanels(kw: number, wattVal: number): number | string {
  if (!kw || !wattVal) return '';
  const wp = wattVal >= 100 ? wattVal : (wattVal * 1000);
  return Math.ceil((kw * 1000) / wp);
}

/**
 * Calculate inverter configuration
 * Returns units, individual kW rating, and description
 */
export function computeInverterCfg(kw: number, phase: string): InverterConfig {
  if (!kw) return { units: 0, eachKw: 0, desc: '' };
  
  if (phase === 'TRIPLE') {
    return { 
      units: 1, 
      eachKw: kw, 
      desc: `1 x ${round1(kw)} kW, 3-Phase` 
    };
  }
  
  // SINGLE phase
  if (kw < 7) {
    return { 
      units: 1, 
      eachKw: kw, 
      desc: `1 x ${round1(kw)} kW, 1-Phase` 
    };
  } else if (kw >= 7 && kw < 13) {
    const each = kw / 2;
    return { 
      units: 2, 
      eachKw: each, 
      desc: `2 x ${round1(each)} kW, 1-Phase` 
    };
  } else {
    const each = kw / 3;
    return { 
      units: 3, 
      eachKw: each, 
      desc: `3 x ${round1(each)} kW, 1-Phase` 
    };
  }
}

/**
 * Compute DCDB description based on project kW
 */
export function computeDCDB(kw: number): string {
  if (kw <= 6) return '1 IN 1 OUT';
  if (kw >= 7 && kw <= 12) return '2 IN 2 OUT';
  if (kw >= 13 && kw <= 18) return '3 IN 3 OUT';
  if (kw >= 19 && kw <= 20) return '4 IN 4 OUT';
  return 'AS PER DESIGN';
}

/**
 * Select AC main wire size for long runs (item 13)
 */
export function selectACMainSize(kw: number, phase: string): string {
  if (phase === 'SINGLE') {
    if (kw <= 3) return '6 sq mm Armoured';
    if (kw >= 4 && kw <= 6) return '10 sq mm Armoured';
    if (kw >= 7 && kw <= 10) return '16 sq mm Armoured';
    return '16 sq mm Armoured';
  } else if (phase === 'TRIPLE') {
    if (kw >= 5 && kw <= 10) return '6 sq mm';
    if (kw >= 11 && kw <= 20) return '10 sq mm';
    return 'AS PER DESIGN';
  }
  return '';
}

/**
 * Select AC wire from Inverter to ACDB (item 14)
 */
export function selectACInvToACDB(kw: number, phase: string): string {
  if (phase === 'SINGLE') {
    return (kw <= 10) ? '2 CORE 6 SQ MM' : '2 CORE 10 SQ MM';
  } else if (phase === 'TRIPLE') {
    return (kw <= 10) ? '4 CORE 4 SQ MM' : '4 CORE 6 SQ MM';
  }
  return '';
}

/**
 * Calculate DC wire size based on length
 */
export function selectDCWireSize(dcWireLenMeters: number): string {
  return (dcWireLenMeters > 50) ? '6 sq mm' : '4 sq mm';
}

/**
 * Get wire tape colors based on phase
 */
export function getWireTapeColors(phase: string): string {
  return (phase === 'TRIPLE') 
    ? 'RED, BLUE, BLACK, YELLOW' 
    : 'RED, BLUE, GREEN';
}

/**
 * Calculate per-leg quantity
 */
function perLeg(qty: number, noOfLegs: number): number {
  return COMPUTE_PER_LEG_TOTALS && noOfLegs ? round2(qty * noOfLegs) : qty;
}

/**
 * Parse wire length from string (extract numbers)
 */
function parseWireLength(wireStr: string): number {
  const m = (wireStr || '').toString().match(/[\d.]+/g);
  if (!m) return 0;
  return parseFloat(m.join('')) || 0;
}

/**
 * Generate complete BOM table rows for a given BOM record
 */
export function generateBOMRows(record: BOMRecord): BOMRow[] {
  const rows: BOMRow[] = [];
  
  const PROJECT_IN_KW = record.project_in_kw;
  const WATTAGE_PANEL = record.wattage_of_panels;
  const PHASE = record.phase;
  const NO_OF_LEGS = record.no_of_legs || 0;
  
  // Parse wire lengths from stored strings
  const AC_WIRE_LEN_m = parseWireLength(record.ac_wire);
  const DC_WIRE_LEN_m = parseWireLength(record.dc_wire);
  const LA_WIRE_LEN_m = parseWireLength(record.la_wire);
  const E_WIRE_LEN_m = parseWireLength(record.earthing_wire);
  
  // Computations
  const panelCount = computePanels(PROJECT_IN_KW, WATTAGE_PANEL);
  const invCfg = computeInverterCfg(PROJECT_IN_KW, PHASE);
  const dcdbDesc = computeDCDB(PROJECT_IN_KW);
  
  // ACDB rating
  const acdbRating = (PROJECT_IN_KW <= 5) ? '32A' : '63A';
  
  // MCB/ELCB rating
  const mcbElcbAmp = (() => {
    if (PROJECT_IN_KW <= 5) return 32;
    if (PROJECT_IN_KW > 5 && PROJECT_IN_KW <= 15) return 63;
    if (PROJECT_IN_KW > 15 && PROJECT_IN_KW <= 20) return 100;
    return null;
  })();
  
  const poleText = (PHASE === 'SINGLE') ? '2 POLE' : (PHASE === 'TRIPLE' ? '4 POLE' : '');
  const mcbText = mcbElcbAmp ? `${mcbElcbAmp}A ${poleText}` : `AS PER DESIGN ${poleText}`;
  const elcbText = mcbText;
  
  // Wire descriptors
  const acInvToAcdbDesc = selectACInvToACDB(PROJECT_IN_KW, PHASE);
  const acMainSize = selectACMainSize(PROJECT_IN_KW, PHASE);
  const dcWireSize = selectDCWireSize(DC_WIRE_LEN_m);
  const tapeDesc = getWireTapeColors(PHASE);
  
  // Helper to add row
  const addRow = (sr: number, item: string, desc: string, make: string, qty: string | number, unit: string) => {
    rows.push({
      sr,
      item,
      description: desc,
      make,
      qty: qty === '' ? '' : String(qty),
      unit
    });
  };
  
  // 1. Solar Panels
  addRow(1, 'Solar Panel', '', '', panelCount, 'Nos');
  
  // 2. Inverter
  addRow(2, 'Inverter', invCfg.desc, '', invCfg.units, 'Nos');
  
  // 3. DCDB
  addRow(3, 'DCDB', dcdbDesc, 'ELMEX = Fuse  HAVELLS = SPD', 1, 'Nos');
  
  // 4. ACDB
  addRow(4, 'ACDB', acdbRating, 'HAVELLS = MCB EL', 1, 'Nos');
  
  // 5-12. Protection & accessories
  addRow(5, 'MCB', mcbText, 'HAVELLS', 1, 'Nos');
  addRow(6, 'ELCB', elcbText, 'HAVELLS', 1, 'Nos');
  addRow(7, 'Loto Box', '', '', 1, 'Nos');
  addRow(8, 'Danger Plate', '230V', '', 1, 'Nos');
  addRow(9, 'Fire Cylinder Co2', '1 KG', '', 1, 'Nos');
  addRow(10, 'Copper Thimble for (ACDB)', 'Pin types 6mmsq', '', 12, 'Nos');
  addRow(11, 'Copper Thimble for ( Earthing , Inverter, Structure)', 'Ring types 6mmsq', '', 6, 'Nos');
  addRow(12, 'Copper Thimble for ( LA)', 'Ring types 16mmsq', '', 2, 'Nos');
  
  // 13-17. Cables
  addRow(13, 'AC wire', acMainSize, 'Polycab', AC_WIRE_LEN_m || '', 'mtr');
  addRow(14, 'AC wire Inverter to ACDB', acInvToAcdbDesc, 'Polycab', 2, 'mtr');
  addRow(15, 'Dc wire Tin copper', dcWireSize, 'Polycab', DC_WIRE_LEN_m || '', 'mtr');
  addRow(16, 'Earthing Wire', EARTHING_WIRE_SIZE, 'Polycab', E_WIRE_LEN_m || '', 'mtr');
  addRow(17, 'LA Earthing Wire', LA_WIRE_SIZE, 'Polycab', LA_WIRE_LEN_m || '', 'mtr');
  
  // 18-35. Civil/consumables
  addRow(18, 'Earthing Pit Cover', 'STANDARD', '', 3, 'Nos');
  addRow(19, 'LA', '1 MTR', '', 1, 'Nos');
  addRow(20, 'LA Fastner / LA', 'M6', 'MS', 4, 'Nos');
  
  // Earthing Rod/Plate length by kW
  const earthingRodDesc = (PROJECT_IN_KW <= 10 ? '1 MTR' : '2 MTR') + ' | COPPER COATING';
  addRow(21, 'Earthing Rod/Plate', earthingRodDesc, '', 3, 'Nos');
  
  // Earthing Chemical bags by kW
  const chemicalBags = PROJECT_IN_KW <= 10 ? 1 : 2;
  addRow(22, 'Earthing Chemical', 'CHEMICAL', '', chemicalBags, 'BAG');
  
  addRow(23, 'Mc4 Connector', '1000V', '', 2, 'PAIR');
  addRow(24, 'Cable Tie UV', '200MM', '', 0.5, 'PKT');
  addRow(25, 'Cable Tie UV', '300MM', '', 0.5, 'PKT');
  addRow(26, 'Screw', '1.5 INCH', '', 100, 'Nos');
  addRow(27, 'Gitti', '1.5 INCH', '', 2, 'Pkt');
  addRow(28, 'Wire PVC Tape', tapeDesc, '', 3, 'Nos');
  addRow(29, 'UPVC Pipe', '20mm', '', 0.5, 'Lot');
  addRow(30, 'UPVC Cable Tray', '50*25', '', 1.5, 'Mtr');
  addRow(31, 'UPVC Shedal', '20mm', '', 1, 'Pkt');
  addRow(32, 'GI Shedal', '20mm', '', 40, 'Nos');
  addRow(33, 'UPVC Tee Band', '20mm', '', 3, 'Nos');
  
  // UPVC Elbow qty from Earthing Wire length
  const upvcElbowQty = (E_WIRE_LEN_m > 60) ? 12 : 6;
  addRow(34, 'UPVC Elbow', '20mm', '', upvcElbowQty, 'Nos');
  
  addRow(35, 'Flexible Pipe', '20mm', '', 5, 'Mtr');
  
  // Structure Nut Bolt
  if (PROJECT_IN_KW <= 5) {
    addRow(36, 'Structure Nut Bolt', 'M10*25', '', 40, 'Nos');
  } else {
    addRow(36, 'Structure Nut Bolt', 'M10*25', 'AS PER REQUIREMENT', '', '');
  }
  
  // Per-leg items
  addRow(37, 'Thread Rod / Fastner', 'M10', '', perLeg(4, NO_OF_LEGS), 'Nos');
  addRow(38, 'Farma', '', '', perLeg(1, NO_OF_LEGS), 'Nos');
  addRow(39, 'Civil Material', '', '', perLeg(1.5, NO_OF_LEGS), 'Nos');
  
  return rows;
}

/**
 * Get list of all materials required for BOM stock-out
 * Returns item-type pairs that should be deducted from inventory
 */
export function getBOMMaterials(record: BOMRecord): Array<{item: string, type: string, qty: number, description: string}> {
  const materials: Array<{item: string, type: string, qty: number, description: string}> = [];
  
  const rows = generateBOMRows(record);
  
  // Map BOM rows to inventory items
  // This is a simplified mapping - you may need to adjust based on your inventory structure
  rows.forEach(row => {
    if (row.qty && row.qty !== '' && typeof row.qty === 'number' || (typeof row.qty === 'string' && row.qty.trim() !== '')) {
      const qty = typeof row.qty === 'string' ? parseFloat(row.qty) : row.qty;
      if (isNaN(qty) || qty <= 0) return;
      
      materials.push({
        item: row.item,
        type: row.description || row.item,
        qty: qty,
        description: `${row.item} - ${row.description || ''}`
      });
    }
  });
  
  return materials;
}
