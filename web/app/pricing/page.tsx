import type { Metadata } from "next"
import LegalPage from "@/components/layout/LegalPage"
import { DataStat } from "@/components/conversion"

export const metadata: Metadata = {
  title: "Pricing — DocAI",
  alternates: { canonical: "/pricing" },
}

export default function PricingPage() {
  return (
    <LegalPage
      title="Pricing."
      intro="Free tier for quick questions against the public knowledge base. Paid tiers for document analysis, drafting assistance, and confidence-scored responses. Every output is reviewed by a human analyst before release on paid plans."
    >
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        <DataStat
          value="Free"
          label="Quick questions — public knowledge base"
          regulator="DocAI"
          asOf="2026-04-19"
          sourceUrl="https://docai.bizlegal-ai.com/pricing"
        />
        <DataStat
          value="$29"
          label="Starter — 10 document analyses / month"
          regulator="DocAI"
          asOf="2026-04-19"
          sourceUrl="https://docai.bizlegal-ai.com/pricing"
          unit="/ month"
        />
        <DataStat
          value="$69"
          label="Team — 50 analyses + drafting assistance"
          regulator="DocAI"
          asOf="2026-04-19"
          sourceUrl="https://docai.bizlegal-ai.com/pricing"
          unit="/ month"
        />
        <DataStat
          value="$99"
          label="Firm — 150 analyses + knowledge-base uploads"
          regulator="DocAI"
          asOf="2026-04-19"
          sourceUrl="https://docai.bizlegal-ai.com/pricing"
          unit="/ month"
        />
      </section>
      <p style={{ marginTop: 32, fontSize: 13, color: "var(--outline, var(--muted))" }}>
        Fleet-wide pricing comparison:{" "}
        <a href="https://bizlegal-ai.com/pricing/all">bizlegal-ai.com/pricing/all</a>
      </p>
    </LegalPage>
  )
}
