// Stock threshold settings stored in localStorage
// Used by LowStockAlert, StockAlertsView, and Settings

const STORAGE_KEY = "stock-thresholds";

export interface StockThresholds {
  critical: number; // Items at or below this are "critical"
  low: number;      // Items at or below this are "low stock"
}

const DEFAULT_THRESHOLDS: StockThresholds = {
  critical: 5,
  low: 10,
};

export function getStockThresholds(): StockThresholds {
  if (typeof window === "undefined") return DEFAULT_THRESHOLDS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        critical: Number(parsed.critical) || DEFAULT_THRESHOLDS.critical,
        low: Number(parsed.low) || DEFAULT_THRESHOLDS.low,
      };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_THRESHOLDS;
}

export function setStockThresholds(thresholds: StockThresholds): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
  // Dispatch a storage event so other components can react
  window.dispatchEvent(new Event("stock-thresholds-changed"));
}
