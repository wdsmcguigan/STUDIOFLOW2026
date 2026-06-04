"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Density = "comfortable" | "compact";

export function DensityToggle() {
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    const saved = (localStorage.getItem("sf-density") as Density) || "comfortable";
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
