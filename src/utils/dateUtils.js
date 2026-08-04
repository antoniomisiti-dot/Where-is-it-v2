/**
 * Utility functions for date formatting
 */

export function formatBadge(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", { 
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: false 
  });
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
}
