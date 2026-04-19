import type { Metadata } from "next"
import LegalPage from "@/components/layout/LegalPage"
import { DISCLAIMER_VERSION } from "@/lib/legal/disclaimer"

export const metadata: Metadata = {
  title: "Methodology — DocAI",
  alternates: { canonical: "/methodology" },
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "DocAI Document Intelligence Methodology",
  description:
    "Published methodology for DocAI document-analysis and drafting intelligence: source documents, knowledge-base retrieval, confidence scoring, and human review.",
  url: "https://docai.bizlegal-ai.com/methodology",
  creator: { "@type": "Organization", name: "BizLegal AI" },
  license: "https://docai.bizlegal-ai.com/terms",
  version: DISCLAIMER_VERSION,
}

export default function MethodologyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LegalPage
        title="DocAI methodology."
        intro="How DocAI produces document intelligence: source handling, knowledge-base retrieval, confidence scoring, human review, and the explicit limits of what we do and do not do with your documents."
      >
        <section>
          <h2 className="lp-h2">Source handling.</h2>
          <p>
            When you submit a document, the text is processed for analysis and the result is
            made available to you. Submitted documents are retained for 30 days unless you
            request earlier deletion, then purged. We do not use customer documents to train
            shared models. The privacy page sets out transfer and retention particulars.
          </p>

          <h2 className="lp-h2">Knowledge-base retrieval.</h2>
          <p>
            For questions DocAI can answer without a submitted document, retrieval runs against
            a vetted knowledge base of public regulatory texts and guidance. Every answer cites
            the source passages it drew from. If the knowledge base does not cover a question,
            the system says so rather than hallucinate.
          </p>

          <h2 className="lp-h2">Confidence scoring.</h2>
          <p>
            Every response carries a confidence score derived from retrieval overlap,
            source-recency, and model self-reported uncertainty. Low-confidence responses are
            flagged explicitly and forwarded to a human reviewer before delivery on paid tiers.
            Free-tier responses ship with the confidence score visible; the user decides
            whether to escalate.
          </p>

          <h2 className="lp-h2">Human review.</h2>
          <p>
            On paid tiers, a named analyst reviews every generated answer or drafted clause
            before delivery. The reviewer verifies that the cited sources actually support the
            claim, flags uncertainty the model did not, and can hold delivery if any assertion
            cannot be substantiated.
          </p>

          <h2 className="lp-h2">What we do not do.</h2>
          <p>
            We do not practice law. We do not send filings on your behalf. We do not represent
            you in any transaction or proceeding. A generated clause is a starting point for
            your attorney, not a finished product for execution. The seven-clause disclosure
            on every page governs.
          </p>

          <h2 className="lp-h2">Versioning.</h2>
          <p>
            Every generated response carries a disclosure version stamp ({DISCLAIMER_VERSION}{" "}
            at the time this page was generated) and an issued_at timestamp. If a response is
            ever challenged, the stamp lets us reproduce exactly which disclosure was in force
            and which knowledge-base version was active when the response was produced.
          </p>

          <h2 className="lp-h2">Incident response.</h2>
          <p>
            If a response is challenged — by a customer, opposing counsel, or a regulator — we
            follow the Liability Incident Response SOP on the hub workflows library.
            Preservation first, notification to counsel next, no fault admission prior to
            review.
          </p>
        </section>
      </LegalPage>
    </>
  )
}
