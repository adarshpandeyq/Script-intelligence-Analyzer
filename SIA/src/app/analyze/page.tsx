import type { Metadata } from "next";
import AnalyzeClient from "@/components/AnalyzeClient";

export const metadata: Metadata = {
  title: "Analyze Script — Script Intelligence Analyzer",
  description: "Upload a PDF or TXT screenplay and run the full NLP analysis pipeline.",
};

export default function AnalyzePage() {
  return <AnalyzeClient />;
}
