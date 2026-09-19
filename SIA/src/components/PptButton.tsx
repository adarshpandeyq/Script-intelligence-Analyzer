"use client";

import Link from "next/link";
import { Presentation } from "lucide-react";

/**
 * Opens the in-app slide viewer at /ppt (always works, even when the browser
 * blocks downloads inside a preview iframe). The viewer itself offers both a
 * one-click .pptx download and a direct link to the generated file.
 */
export default function PptButton({
  className = "btn-primary",
  label = "📊 PROJECT PPT",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link href="/ppt" className={className} prefetch={false}>
      <Presentation size={15} />
      {label}
    </Link>
  );
}
