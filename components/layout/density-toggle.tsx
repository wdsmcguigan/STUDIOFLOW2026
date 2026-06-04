"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Density = "comfortable" | "compact";

export function DensityToggle() {
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    // One-time sync from the persisted external store (localStorage) on mount.
    // SSR can't read localStorage, so this must happen in an effect, not a lazy
    // initializer — the intended use of the escape hatch.
    const saved = (localStorage.getItem("sf-density") as Density) || "comfortable";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDensity(saved);
    document.documentElement.setAttribute("data-density", saved);
  }, []);

  const toggle = () => {
    const next: Density = density === "comfortable" ? "compact" : "comfortable";
    setDensity(next);
    document.documentElement.setAttribute("data-density", next);
    localStorage.setItem("sf-density", next);
  };

  return (
    <Button variant="ghost" size="sm" aria-label="Toggle density" onClick={toggle}>
      {density === "comfortable" ? "Comfortable" : "Compact"}
    </Button>
  );
}
