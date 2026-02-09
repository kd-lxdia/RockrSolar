// Stock threshold settings stored in localStorage
// Used by LowStockAlert, StockAlertsView, and Settings

const STORAGE_KEY = "stock-thresholds";

export interface StockThresholds {
  critical: number; // Items at or below this are "critical"
  low: number;      // Items at or below this are "low stock"
}

export interface ThresholdSettings {
  global: StockThresholds;
  items: Record<string, StockThresholds>; // Item-specific thresholds
}

const DEFAULT_THRESHOLDS: StockThresholds = {
  critical: 5,
  low: 10,
};

const DEFAULT_SETTINGS: ThresholdSettings = {
  global: DEFAULT_THRESHOLDS,
  items: {},
};

// Get all threshold settings (global + per-item)
export function getAllThresholdSettings(): ThresholdSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        global: {
          critical: Number(parsed.global?.critical) || DEFAULT_THRESHOLDS.critical,
          low: Number(parsed.global?.low) || DEFAULT_THRESHOLDS.low,
        },
        items: parsed.items || {},
      };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

// Get global thresholds (for backward compatibility)
export function getStockThresholds(): StockThresholds {
  return getAllThresholdSettings().global;
}

// Get thresholds for a specific item (falls back to global if not set)
export function getThresholdsForItem(itemName: string): StockThresholds {
  const settings = getAllThresholdSettings();
  return settings.items[itemName] || settings.global;
}

// Set global thresholds
export function setStockThresholds(thresholds: StockThresholds): void {
  if (typeof window === "undefined") return;
  const settings = getAllThresholdSettings();
  settings.global = thresholds;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("stock-thresholds-changed"));
}

// Set threshold for a specific item
export function setItemThreshold(itemName: string, thresholds: StockThresholds): void {
  if (typeof window === "undefined") return;
  const settings = getAllThresholdSettings();
  settings.items[itemName] = thresholds;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("stock-thresholds-changed"));
}

// Remove item-specific threshold (reverts to global)
export function removeItemThreshold(itemName: string): void {
  if (typeof window === "undefined") return;
  const settings = getAllThresholdSettings();
  delete settings.items[itemName];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("stock-thresholds-changed"));
}
