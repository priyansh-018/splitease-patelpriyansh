import React, { useState, useEffect } from 'react'
import {
  Wallet,
  Users,
  PlusCircle,
  Trash2,
  Receipt,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  DollarSign,
  Tag,
  HandCoins,
  RotateCcw
} from 'lucide-react'

const THEMES = [
  { id: 'trip', label: '🏖️ Trip' },
  { id: 'hostel', label: '🏠 Hostel' },
  { id: 'flat', label: '🏢 Flat Rent' },
  { id: 'party', label: '🎉 Party' },
]

export default function App() {
  // --- State ---
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('members')
    return saved ? JSON.parse(saved) : []
  })

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('expenses')
    return saved ? JSON.parse(saved) : []
  })

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'trip'
  })

  // Form inputs
  const [nameInput, setNameInput] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(members[0] || '')
  const [error, setError] = useState('')

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('members', JSON.stringify(members))
  }, [members])

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  // Update paidBy dropdown default when members list changes
  useEffect(() => {
    if (members.length > 0 && !members.includes(paidBy)) {
      setPaidBy(members[0])
    }
  }, [members, paidBy])

  // --- Calculations (derived on each render) ---
  const totalSpent = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
  const equalShare = members.length > 0 ? totalSpent / members.length : 0

  // Calculate each person's total paid and their balance (paid - equal share)
  const balances = members.map((member) => {
    const paid = expenses
      .filter((e) => e.paidBy === member)
      .reduce((sum, e) => sum + Number(e.amount), 0)

    const net = paid - equalShare // positive: owed money, negative: owes money

    return {
      name: member,
      paid,
      net,
      diff: Math.abs(net),
      status: net > 0.01 ? 'owed' : net < -0.01 ? 'owes' : 'settled',
    }
  })

  // "Who pays whom" settlements
  const settlements = []
  const debtors = balances.filter((b) => b.net < -0.01).map((b) => ({ name: b.name, amount: Math.abs(b.net) }))
  const creditors = balances.filter((b) => b.net > 0.01).map((b) => ({ name: b.name, amount: b.net }))

  let d = 0
  let c = 0
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d]
    const creditor = creditors[c]
    const payment = Math.min(debtor.amount, creditor.amount)

    if (payment > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: payment,
      })
    }

    debtor.amount -= payment
    creditor.amount -= payment

    if (debtor.amount < 0.01) d++
    if (creditor.amount < 0.01) c++
  }

  // --- Handlers ---
  const handleAddMember = (e) => {
    e.preventDefault()
    setError('')
    const trimmed = nameInput.trim()

    if (!trimmed) {
      setError('Please enter a name.')
      return
    }
    if (members.length >= 6) {
      setError('Maximum 6 members allowed.')
      return
    }
    if (members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already in the group.`)
      return
    }

    setMembers([...members, trimmed])
    setNameInput('')
  }

  const handleRemoveMember = (name) => {
    const hasExpenses = expenses.some((e) => e.paidBy === name)
    if (hasExpenses) {
      if (!window.confirm(`Removing ${name} will also delete their expenses. Proceed?`)) {
        return
      }
      setExpenses(expenses.filter((e) => e.paidBy !== name))
    }
    setMembers(members.filter((m) => m !== name))
  }

  const handleAddExpense = (e) => {
    e.preventDefault()
    setError('')

    if (members.length < 2) {
      setError('Please add at least 2 members before adding an expense.')
      return
    }
    if (!description.trim()) {
      setError('Please enter a description.')
      return
    }

    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.')
      return
    }

    const newExpense = {
      id: Date.now().toString(),
      description: description.trim(),
      amount: numAmount,
      paidBy,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setExpenses([newExpense, ...expenses])
    setDescription('')
    setAmount('')
  }

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter((e) => e.id !== id))
  }

  const handleClearAll = () => {
    if (window.confirm('Clear all members and expenses to start fresh?')) {
      setMembers([])
      setExpenses([])
      localStorage.clear()
      setError('')
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans pb-14">
      {/* Header */}
      <header className="border-b border-stone-200 bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">SplitEasy</h1>
          </div>

          <button
            onClick={handleClearAll}
            title="Reset data"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors border border-stone-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold text-xs ml-2 text-rose-500 hover:text-rose-700">
              Dismiss
            </button>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-2xl border border-stone-200 bg-white shadow-2xs flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase font-medium text-stone-500">Total Spent</p>
              <p className="text-xl font-extrabold tracking-tight">₹{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-stone-200 bg-white shadow-2xs flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-stone-100 text-stone-800 border border-stone-200 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase font-medium text-stone-500">Group Members</p>
              <p className="text-xl font-extrabold tracking-tight">
                {members.length} <span className="text-xs font-normal text-stone-400">/ 6</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-stone-200 bg-white shadow-2xs flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase font-medium text-stone-500">Equal Share</p>
              <p className="text-xl font-extrabold tracking-tight">
                ₹{equalShare.toFixed(2)} <span className="text-xs font-normal text-stone-400">/ person</span>
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Group Setup & Expense Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Group Setup */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-stone-800" />
                  <h2 className="font-semibold text-stone-900 text-sm">Group Setup</h2>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  {members.length} of 6 added
                </span>
              </div>

              {/* Theme Selector */}
              <div className="mb-4">
                <label className="text-xs font-medium text-stone-500 flex items-center gap-1 mb-1.5">
                  <Tag className="w-3.5 h-3.5" /> Theme
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`text-xs py-1.5 rounded-lg font-medium border transition-colors ${
                        theme === t.id
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Member Form */}
              <form onSubmit={handleAddMember} className="flex gap-2 mb-3.5">
                <input
                  type="text"
                  placeholder="Add friend's name..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  disabled={members.length >= 6}
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-400"
                />
                <button
                  type="submit"
                  disabled={members.length >= 6}
                  className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl text-sm font-medium bg-stone-900 hover:bg-stone-800 text-white transition-colors disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </form>

              {/* Members Chips */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-stone-400">Current Members (Min 2, Max 6):</p>
                {members.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-1.5">No members added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {members.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-stone-50 text-stone-800 border border-stone-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-700"></span>
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(name)}
                          className="text-stone-400 hover:text-rose-600 transition-colors ml-0.5 text-sm font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Expense Form */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs">
              <div className="flex items-center space-x-2 mb-4">
                <PlusCircle className="w-4 h-4 text-stone-800" />
                <h2 className="font-semibold text-stone-900 text-sm">Add an Expense</h2>
              </div>

              {members.length < 2 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  Add at least 2 members in Group Setup first to record expenses.
                </p>
              ) : (
                <form onSubmit={handleAddExpense} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Dinner, Snacks, Cab"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="900"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-400 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Paid By</label>
                      <select
                        value={paidBy}
                        onChange={(e) => setPaidBy(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-400"
                      >
                        {members.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-2 px-4 rounded-xl text-sm font-medium bg-stone-900 hover:bg-stone-800 text-white transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Expense</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Settlement, Balances & History */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3. Who Pays Whom */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs">
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
                  <HandCoins className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-stone-900 text-sm">Who Pays Whom</h2>
              </div>

              {members.length < 2 || expenses.length === 0 ? (
                <p className="text-xs text-stone-400 py-3 text-center">
                  Add members and expenses to calculate settlements.
                </p>
              ) : settlements.length === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All settled up! Nobody owes any money.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {settlements.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                          {s.from}
                        </span>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
                        <span className="font-semibold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                          {s.to}
                        </span>
                      </div>
                      <span className="font-bold font-mono text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                        ₹{s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Balance Breakdown */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-stone-800" />
                  <h2 className="font-semibold text-stone-900 text-sm">Balance Breakdown</h2>
                </div>
                {members.length > 0 && (
                  <span className="text-xs text-stone-500">
                    Equal share: <strong className="text-stone-900">₹{equalShare.toFixed(2)}</strong>
                  </span>
                )}
              </div>

              {members.length === 0 ? (
                <p className="text-xs text-stone-400 py-3 text-center">No members added yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {balances.map((b) => (
                    <div
                      key={b.name}
                      className={`p-3 rounded-xl border ${
                        b.status === 'owed'
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : b.status === 'owes'
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-stone-900">{b.name}</span>
                        {b.status === 'owed' && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center">
                            <ArrowUpRight className="w-3 h-3 mr-0.5" /> owed
                          </span>
                        )}
                        {b.status === 'owes' && (
                          <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full flex items-center">
                            <ArrowDownRight className="w-3 h-3 mr-0.5" /> owes
                          </span>
                        )}
                        {b.status === 'settled' && (
                          <span className="text-[10px] font-medium text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded-full">
                            settled
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-stone-500 mb-1">
                        Paid: <span className="font-medium text-stone-700">₹{b.paid.toLocaleString()}</span>
                      </p>

                      <p className="text-xs font-bold font-mono">
                        {b.status === 'owed' && <span className="text-emerald-700">+₹{b.diff.toFixed(2)}</span>}
                        {b.status === 'owes' && <span className="text-rose-700">-₹{b.diff.toFixed(2)}</span>}
                        {b.status === 'settled' && <span className="text-stone-400">₹0.00</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Expense List */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-stone-800" />
                  <h2 className="font-semibold text-stone-900 text-sm">Expenses History</h2>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  {expenses.length}
                </span>
              </div>

              {expenses.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center italic">
                  No expenses added yet.
                </p>
              ) : (
                <div className="divide-y divide-stone-100 max-h-[300px] overflow-y-auto">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{exp.description}</p>
                        <p className="text-xs text-stone-500">
                          Paid by <span className="font-semibold text-stone-700">{exp.paidBy}</span> • {exp.time}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-stone-900 font-mono">
                          ₹{Number(exp.amount).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          title="Delete"
                          className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
