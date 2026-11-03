"use client";
import { useEffect, useState } from "react";
import { isStale } from "../lib/catalog.mjs";
export default function ReviewStatus({ date }: { date: string }) {
  const [stale, setStale] = useState<boolean | null>(null);
  useEffect(() => {
    const update = () => setStale(isStale(date));
    const visible = () => {
      if (document.visibilityState === "visible") update();
    };
    update();
    const timer = window.setInterval(update, 60000);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [date]);
  return (
    <span>
      {stale === null
        ? "请结合审核日期判断时效"
        : stale
          ? "待复核"
          : "信息审核期内"}
    </span>
  );
}
