export default function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-emerald-700 mt-1">{value}</p>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
    )
  }