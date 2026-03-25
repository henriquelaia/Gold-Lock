export function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Saldo Total */}
      <div className="glass-card p-6">
        <p className="text-sm text-gray-500">Saldo Total</p>
        <p className="text-4xl font-bold mt-1">— €</p>
        <p className="text-sm text-gray-400 mt-2">A implementar no Sprint 5</p>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-sm text-gray-500">Receitas (mês)</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">— €</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-gray-500">Despesas (mês)</p>
          <p className="text-2xl font-semibold text-red-500 mt-1">— €</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-gray-500">Poupança (mês)</p>
          <p className="text-2xl font-semibold text-primary-600 mt-1">— €</p>
        </div>
      </div>

      {/* Placeholder para gráficos */}
      <div className="glass-card p-6 h-64 flex items-center justify-center">
        <p className="text-gray-400">Gráfico de despesas por categoria — Sprint 5</p>
      </div>
    </div>
  )
}
