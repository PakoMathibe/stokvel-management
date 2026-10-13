import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-emerald-700">Stokvel Manager</h1>
      <p className="mt-4 text-lg text-gray-600 max-w-xl text-center">
        Digitize your savings group — track contributions, manage payouts, and
        keep every member accountable.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/login" className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          Log in
        </Link>
        <Link href="/signup" className="px-6 py-3 border border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50">
          Create account
        </Link>
      </div>
    </main>
  )
}