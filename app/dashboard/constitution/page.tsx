export default function ConstitutionPage() {
    return (
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Constitution</h1>
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold mb-1">1. Purpose</h2>
            <p>This group operates as a {`{type}`} stokvel per its registered constitution, promoting
            collective saving and financial discipline among members.</p>
          </section>
          <section>
            <h2 className="font-semibold mb-1">2. Contributions</h2>
            <p>Each member contributes a fixed amount on the agreed schedule (weekly, fortnightly, or monthly).
            Late payments are subject to the penalties set out at the last AGM.</p>
          </section>
          <section>
            <h2 className="font-semibold mb-1">3. Banking</h2>
            <p>The group holds a dedicated bank account requiring two or more signatories for any withdrawal.
            Executive members (Chairperson, Treasurer, Secretary) hold signing rights.</p>
          </section>
          <section>
            <h2 className="font-semibold mb-1">4. Payouts</h2>
            <p>Payouts follow the schedule agreed by members. Rotational payouts occur [cycle], grocery
            distributions occur in November/December, and burial claims are processed within 48 hours.</p>
          </section>
          <section>
            <h2 className="font-semibold mb-1">5. Dispute Resolution</h2>
            <p>Disputes are handled internally first; if unresolved, escalated to NASASA or a mutually
            agreed mediator.</p>
          </section>
          <section>
            <h2 className="font-semibold mb-1">6. Membership</h2>
            <p>New members join by invitation and majority vote. Members leaving must give 30 days' notice;
            accumulated contributions are refundable per the exit clause.</p>
          </section>
        </div>
      </div>
    )
  }