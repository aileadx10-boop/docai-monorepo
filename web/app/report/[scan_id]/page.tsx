import { notFound } from "next/navigation";

import { ReportView } from "@/components/report-view";
import type { AnalyzeResult } from "@/lib/contract-analysis";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ScanRow = {
  id: string;
  email: string | null;
  filename: string;
  contract_type: string | null;
  score: number | null;
  paid: boolean | null;
  ai_content: AnalyzeResult | string | null;
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ scan_id: string }>;
}) {
  const { scan_id } = await params;

  const { data, error } = await supabaseAdmin
    .from("contract_scans")
    .select("id, email, filename, contract_type, score, paid, ai_content")
    .eq("id", scan_id)
    .single();

  if (error || !data) {
    notFound();
  }

  const scan = data as ScanRow;
  const analysis =
    typeof scan.ai_content === "string" ? (JSON.parse(scan.ai_content) as AnalyzeResult) : (scan.ai_content as AnalyzeResult);

  return (
    <ReportView
      scanId={scan.id}
      email={scan.email || ""}
      filename={scan.filename}
      contractType={scan.contract_type || analysis.contract_type}
      paid={Boolean(scan.paid)}
      riskLevel={analysis.risk_level}
      riskScore={scan.score ?? analysis.risk_score}
      analysis={analysis}
      payoneerLink={process.env.PAYONEER_DOCAI_LINK || null}
    />
  );
}
