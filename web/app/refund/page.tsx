export default function RefundPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&family=Playfair+Display:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #0b1326; color: #dae2fd; }
        .prose h2 { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #dae2fd; margin: 32px 0 12px; }
        .prose p, .prose li { font-size: 15px; color: rgba(218,226,253,0.7); line-height: 1.8; margin-bottom: 12px; }
        .prose ul { padding-left: 20px; }
        .prose a { color: #b3c5ff; }
      `}</style>

      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        background: 'rgba(11,19,38,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(218,226,253,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 32px', height: 64,
      }}>
        <a href="/" style={{
          fontFamily: 'Playfair Display, serif', fontWeight: 800, fontSize: 18,
          background: 'linear-gradient(135deg, #b3c5ff, #6288ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>DocAI Hub</a>
        <a href="https://bizlegal-ai.com" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(218,226,253,0.55)' }}>← Back to BizLegal AI</a>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '96px 32px 80px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Refund Policy</h1>
        <p style={{ fontSize: 13, color: 'rgba(218,226,253,0.4)', marginBottom: 40 }}>Last updated: April 2026</p>

        <div className="prose">
          <h2>14-Day Money-Back Guarantee</h2>
          <p>
            DocAI Hub by BizLegal AI offers a 14-day money-back guarantee. If you are not satisfied with your
            document scan or generated contract, you may request a full refund within 14 days of purchase.
          </p>

          <h2>Eligible for Refund</h2>
          <ul>
            <li>✓ Purchases within the last 14 days</li>
            <li>✓ Technical errors preventing report delivery</li>
            <li>✓ Duplicate charges for the same document</li>
            <li>✓ Service outages that prevented access</li>
          </ul>

          <h2>Non-Refundable</h2>
          <ul>
            <li>✕ Full reports delivered more than 14 days ago</li>
            <li>✕ Dissatisfaction with AI-generated analysis (see Disclaimer)</li>
            <li>✕ Contract generation reports already downloaded and used</li>
          </ul>

          <h2>Document-Specific Terms</h2>
          <p>
            Once a full document analysis report has been delivered and the results accessed by email or download,
            refunds are only available if a technical error prevented proper delivery. Free tier scans (limited
            risk checks) are not eligible for refund as they are provided at no cost.
          </p>

          <h2>Pricing Tiers</h2>
          <ul>
            <li>Free Scan — $0 (limited risk check, no refund applicable)</li>
            <li>Standard Report — $29</li>
            <li>Professional Report — $69</li>
            <li>Enterprise Report — $99</li>
          </ul>

          <h2>How to Request a Refund</h2>
          <p>
            Email <a href="mailto:team@bizlegal-ai.com">team@bizlegal-ai.com</a> with your order ID and reason.
            Refunds are processed within 5 business days to the original payment method.
          </p>

          <h2>Contact</h2>
          <p>
            BizLegal AI<br />
            Email: <a href="mailto:team@bizlegal-ai.com">team@bizlegal-ai.com</a>
          </p>
        </div>

        <div style={{ borderTop: '1px solid rgba(218,226,253,0.08)', marginTop: 40, paddingTop: 20, display: 'flex', justifyContent: 'space-between' }}>
          <a href="/privacy" style={{ color: '#b3c5ff', fontSize: 14, textDecoration: 'none' }}>← Privacy Policy</a>
          <a href="/acceptable-use" style={{ color: '#b3c5ff', fontSize: 14, textDecoration: 'none' }}>Acceptable Use →</a>
        </div>
      </main>

      <footer style={{
        borderTop: '1px solid rgba(68,70,80,0.3)',
        background: 'rgba(6,14,32,0.8)', padding: '24px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'rgba(218,226,253,0.4)', display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' as const }}>
          <a href="/" style={{ color: 'inherit' }}>DocAI Hub</a>
          <a href="/terms" style={{ color: 'inherit' }}>Terms of Service</a>
          <a href="/privacy" style={{ color: 'inherit' }}>Privacy Policy</a>
          <a href="/disclaimer" style={{ color: 'inherit' }}>Disclaimer</a>
          <a href="/acceptable-use" style={{ color: 'inherit' }}>Acceptable Use</a>
        </div>
      </footer>
    </>
  )
}