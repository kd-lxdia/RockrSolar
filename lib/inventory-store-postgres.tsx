"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

// Types
export interface InventoryEvent {
  id: string;
  timestamp: number;
  item: string;
  type: string;
  qty: number;
  rate: number;
  source: string;
  supplier: string;
  kind: "IN" | "OUT";
  brand?: string; // Optional brand/make field, defaults to "standard" if empty
}

export interface InventoryContextType {
  events: InventoryEvent[];
  items: string[];
  types: string[];
  sources: string[];
  suppliers: string[];
  brands: string[]; // List of all available brands/makes
  notifications: Array<{ id: string; text: string; kind: "in" | "out"; timestamp: number }>;
  
  addEvent: (event: Omit<InventoryEvent, "id" | "timestamp">) => Promise<void>;
  addItem: (name: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
  addType: (item: string, type: string) => Promise<void>;
  removeType: (item: string, type: string) => Promise<void>;
  addSource: (name: string) => Promise<void>;
  removeSource: (name: string) => Promise<void>;
  addSupplier: (source: string, supplier: string) => Promise<void>;
  removeSupplier: (name: string) => Promise<void>;
  addBrand: (name: string) => Promise<void>;
  removeBrand: (name: string) => Promise<void>;
  getTypesForItem: (item: string) => string[];
  getSuppliersForSource: (source: string) => string[];
  pushNotification: (text: string, kind: "in" | "out") => void;
  clearNotifications: () => void;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  // State
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [typesMap, setTypesMap] = useState<Record<string, string[]>>({});
  const [sources, setSources] = useState<string[]>([]);
  const [suppliersMap, setSuppliersMap] = useState<Record<string, string[]>>({});
  const [brands, setBrands] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; kind: "in" | "out"; timestamp: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data from API
  const refreshData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all data in parallel
      const [itemsRes, typesRes, sourcesRes, suppliersRes, eventsRes, brandsRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/types'),
        fetch('/api/sources'),
        fetch('/api/suppliers'),
        fetch('/api/events'),
        fetch('/api/brands')
      ]);

      const itemsData = await itemsRes.json();
      const typesData = await typesRes.json();
      const sourcesData = await sourcesRes.json();
      const suppliersData = await suppliersRes.json();
      const eventsData = await eventsRes.json();
      const brandsData = await brandsRes.json();

      if (itemsData.success) setItems(itemsData.data);
      if (typesData.success) setTypesMap(typesData.data);
      if (sourcesData.success) setSources(sourcesData.data);
      if (suppliersData.success) setSuppliersMap(suppliersData.data);
      if (eventsData.success) setEvents(eventsData.data);
      if (brandsData.success) setBrands(brandsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize database and fetch data on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Initialize database tables and seed standard types (safe - only runs once)
        await fetch('/api/db/init');
        // Then fetch all data
        await refreshData();
      } catch (error) {
        console.error('Error initializing data:', error);
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Items
  const addItem = async (name: string) => {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        setItems(prev => [...prev, name].sort());
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const removeItem = async (name: string) => {
    try {
      const res = await fetch(`/api/items?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i !== name));
        // Remove associated types
        setTypesMap(prev => {
          const newMap = { ...prev };
          delete newMap[name];
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // Types
  const addType = async (item: string, type: string) => {
    try {
      const res = await fetch('/api/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName: item, typeName: type })
      });
      if (res.ok) {
        setTypesMap(prev => ({
          ...prev,
          [item]: [...(prev[item] || []), type].sort()
        }));
      }
    } catch (error) {
      console.error('Error adding type:', error);
    }
  };

  const removeType = async (item: string, type: string) => {
    try {
      const res = await fetch(`/api/types?itemName=${encodeURIComponent(item)}&typeName=${encodeURIComponent(type)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTypesMap(prev => ({
          ...prev,
          [item]: (prev[item] || []).filter(t => t !== type)
        }));
      }
    } catch (error) {
      console.error('Error removing type:', error);
    }
  };

  const getTypesForItem = (item: string): string[] => {
    return typesMap[item] || [];
  };

  // Sources
  const addSource = async (name: string) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        setSources(prev => [...prev, name].sort());
      }
    } catch (error) {
      console.error('Error adding source:', error);
    }
  };

  const removeSource = async (name: string) => {
    try {
      const res = await fetch(`/api/sources?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSources(prev => prev.filter(s => s !== name));
        // Remove associated suppliers
        setSuppliersMap(prev => {
          const newMap = { ...prev };
          delete newMap[name];
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error removing source:', error);
    }
  };

  // Suppliers
  const addSupplier = async (source: string, supplier: string) => {
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceName: source, supplierName: supplier })
      });
      if (res.ok) {
        setSuppliersMap(prev => ({
          ...prev,
          [source]: [...(prev[source] || []), supplier].sort()
        }));
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
    }
  };

  const removeSupplier = async (name: string) => {
    try {
      const res = await fetch(`/api/suppliers?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Remove from all sources
        setSuppliersMap(prev => {
          const newMap = { ...prev };
          Object.keys(newMap).forEach(source => {
            newMap[source] = newMap[source].filter(s => s !== name);
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error removing supplier:', error);
    }
  };

  const getSuppliersForSource = (source: string): string[] => {
    return suppliersMap[source] || [];
  };

  // Brands
  const addBrand = async (name: string) => {
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        setBrands(prev => [...prev, name].sort());
      }
    } catch (error) {
      console.error('Error adding brand:', error);
    }
  };

  const removeBrand = async (name: string) => {
    try {
      const res = await fetch(`/api/brands?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBrands(prev => prev.filter(b => b !== name));
      }
    } catch (error) {
      console.error('Error removing brand:', error);
    }
  };

  // Events
  const addEvent = async (event: Omit<InventoryEvent, "id" | "timestamp">) => {
    try {
      const newEvent: InventoryEvent = {
        ...event,
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      
      if (res.ok) {
        const result = await res.json();
        setEvents(prev => [result.data, ...prev]);
        pushNotification(
          `${event.kind === "IN" ? "Added" : "Removed"} ${event.qty} ${event.item}(s)`,
          event.kind === "IN" ? "in" : "out"
        );
      }
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  // Notifications
  const pushNotification = (text: string, kind: "in" | "out") => {
    const notification = {
      id: `notif-${Date.now()}`,
      text,
      kind,
      timestamp: Date.now()
    };
    setNotifications(prev => [notification, ...prev].slice(0, 10));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Derive unique types and suppliers for backward compatibility
  const allTypes = Array.from(new Set(Object.values(typesMap).flat())).sort();
  const allSuppliers = Array.from(new Set(Object.values(suppliersMap).flat())).sort();

  const value: InventoryContextType = {
    events,
    items,
    types: allTypes,
    sources,
    suppliers: allSuppliers,
    brands,
    notifications,
    addEvent,
    addItem,
    removeItem,
    addType,
    removeType,
    addSource,
    removeSource,
    addSupplier,
    removeSupplier,
    addBrand,
    removeBrand,
    getTypesForItem,
    getSuppliersForSource,
    pushNotification,
    clearNotifications,
    isLoading,
    refreshData
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within InventoryProvider");
  }
  return context;
}
