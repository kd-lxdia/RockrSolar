"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  X as CloseIcon,
  ChevronLeft,
} from "lucide-react";
import { LowStockAlert } from "@/components/LowStockAlert";
import { useInventory } from "@/lib/inventory-store-postgres";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  
  useEffect(() => {
    // Set initial time on client side only
    setNow(new Date());
    
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  
  return now;
}

function formatTime(d: Date) {
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${h12}:${m} ${ampm}`;
}

export function RightSidebar() {
  const now = useClock();
  const inventory = useInventory();
  const [isMinimized, setIsMinimized] = useState(false);

  const [locationText, setLocationText] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mounted) return;
          const { latitude, longitude } = pos.coords;
          setLocationText(`Near ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        },
        () => {
          if (!mounted) return;
          setLocationText(Intl.DateTimeFormat().resolvedOptions().timeZone);
        },
        { enableHighAccuracy: false, maximumAge: 600_000, timeout: 5000 }
      );
    } else {
      setLocationText(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
    return () => {
      mounted = false;
    };
  }, []);

  // show only today's notifications
  const todaysNotifications = useMemo(() => {
    if (!now) return [];
    
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    // Filter notifications from today
    return inventory.notifications.filter((notification) => {
      const notificationDate = new Date(notification.timestamp);
      return notificationDate >= start && notificationDate < end;
    });
  }, [now, inventory.notifications]);

  if (isMinimized) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-l-lg shadow-lg transition-all hover:pr-4"
          title="Show sidebar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="hidden lg:flex w-full md:w-80 bg-[#0e0f12] border-l border-neutral-800 text-neutral-200 flex-col relative h-full overflow-y-auto shrink-0">
      {/* Close Button */}
      <button
        onClick={() => setIsMinimized(true)}
        className="absolute top-4 right-4 z-10 p-1.5 hover:bg-neutral-800 rounded transition-colors"
        title="Hide sidebar"
      >
        <CloseIcon className="h-4 w-4 text-neutral-400 hover:text-neutral-200" />
      </button>

      <div className="p-4 border-b border-neutral-800">
        <div className="text-[10px] uppercase tracking-widest text-neutral-400">
          {now ? now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase() : "LOADING..."}
        </div>
        <div className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          {now ? formatTime(now) : "--:-- --"}
        </div>
        <div className="mt-1 text-xs text-neutral-400 flex items-center gap-2">
          {now ? now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Loading date..."}
          <span className="text-neutral-600">•</span>
          <span>{locationText || Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-neutral-800">
        <div className="text-[11px] uppercase tracking-widest text-blue-400">
          Inventory Alerts
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          Low stock & missing items
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Render low / missing stocks in the sidebar */}
          <LowStockAlert />
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-neutral-800">
        <div className="text-[11px] uppercase tracking-widest text-blue-400 mb-2">
          Messages
        </div>
        <ScrollArea className="max-h-48">
          <ul className="space-y-2">
            <li className="text-xs text-neutral-500">No messages</li>
          </ul>
        </ScrollArea>
      </div>
    </aside>
  );
}
