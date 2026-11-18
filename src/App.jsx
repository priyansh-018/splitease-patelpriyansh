import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  PlusCircle,
  Trash2,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  DollarSign,
  Tag,
  HandCoins,
  AlertCircle
} from 'lucide-react'

const THEMES = [
  { id: 'trip', label: '🏖️ Trip' },
  { id: 'hostel', label: '🏠 Hostel' },
  { id: 'flat', label: '🏢 Flat Rent' },
  { id: 'party', label: '🎉 Party' },
]

export default function App() {
  // Clear any old fake demo data from previous sessions
  useEffect(() => {
    if (!localStorage.getItem('spliteasy_cleaned_v1')) {
      localStorage.removeItem('spliteasy_members')
      localStorage.removeItem('spliteasy_expenses')
      localStorage.setItem('spliteasy_cleaned_v1', 'true')
      setMembers([])
      setExpenses([])
    }
  }, [])

  // --- Persistent State ---
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('spliteasy_members')
    return saved ? JSON.parse(saved) : []
  })

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('spliteasy_expenses')
    return saved ? JSON.parse(saved) : []
  })

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('spliteasy_theme') || 'trip'
  })

  // --- Form State ---
  const [newMemberName, setNewMemberName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(members[0] || '')
  const [errorMsg, setErrorMsg] = useState('')

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('spliteasy_members', JSON.stringify(members))
  }, [members])

  useEffect(() => {
    localStorage.setItem('spliteasy_expenses', JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    localStorage.setItem('spliteasy_theme', theme)
  }, [theme])

  // Keep paidBy in sync with active members list
  useEffect(() => {
    if (members.length > 0 && !members.includes(paidBy)) {
      setPaidBy(members[0])
    }
  }, [members, paidBy])

  // --- Calculations (All pure Week 1: Equal Split) ---
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [expenses])

  const memberCount = members.length
  const equalShare = memberCount > 0 ? totalSpent / memberCount : 0

  // Per-person balances: paid minus equal share
  const memberBalances = useMemo(() => {
    return members.map((member) => {
      const paid = expenses
        .filter((e) => e.paidBy === member)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0)

      const net = paid - equalShare // Positive = is owed, Negative = owes
      return {
        name: member,
        paid,
        net,
        status: net > 0.01 ? 'owed' : net < -0.01 ? 'owes' : 'settled',
        diff: Math.abs(net),
      }
    })
  }, [members, expenses, equalShare])

  // Smart Settlement Plan ("Who Pays Whom")
  const settlements = useMemo(() => {
    if (members.length === 0 || expenses.length === 0) return []

    const debtors = []
    const creditors = []

    memberBalances.forEach((b) => {
      if (b.net < -0.01) {
        debtors.push({ name: b.name, amount: Math.abs(b.net) })
      } else if (b.net > 0.01) {
        creditors.push({ name: b.name, amount: b.net })
      }
    })

    // Sort descending for minimum-transfer greedy settlement
    debtors.sort((a, b) => b.amount - a.amount)
    creditors.sort((a, b) => b.amount - a.amount)

    const transfers = []
    let d = 0
    let c = 0

    const dList = debtors.map((item) => ({ ...item }))
    const cList = creditors.map((item) => ({ ...item }))

    while (d < dList.length && c < cList.length) {
      const debtor = dList[d]
      const creditor = cList[c]

      const amountToPay = Math.min(debtor.amount, creditor.amount)
      if (amountToPay > 0.01) {
        transfers.push({
          from: debtor.name,
          to: creditor.name,
          amount: amountToPay,
        })
      }

      debtor.amount -= amountToPay
      creditor.amount -= amountToPay

      if (debtor.amount < 0.01) d++
      if (creditor.amount < 0.01) c++
    }

    return transfers
  }, [memberBalances, members.length, expenses.length])

  // --- Handlers ---
  const handleAddMember = (e) => {
    e.preventDefault()
    setErrorMsg('')
    const trimmed = newMemberName.trim()

    if (!trimmed) {
      setErrorMsg('Please enter a member name.')
      return
    }
    if (members.length >= 6) {
      setErrorMsg('Maximum 6 members allowed.')
      return
    }
    if (members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`"${trimmed}" is already in the group.`)
      return
    }

    setMembers([...members, trimmed])
    setNewMemberName('')
  }

  const handleRemoveMember = (nameToRemove) => {
    const hasExpenses = expenses.some((e) => e.paidBy === nameToRemove)
    if (hasExpenses) {
      if (!window.confirm(`Removing ${nameToRemove} will also remove their recorded expenses. Proceed?`)) {
        return
      }
      setExpenses(expenses.filter((e) => e.paidBy !== nameToRemove))
    }
    setMembers(members.filter((m) => m !== nameToRemove))
    setErrorMsg('')
  }

  const handleAddExpense = (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (members.length < 2) {
      setErrorMsg('Please add at least 2 members in Group Setup first.')
      return
    }

    if (!description.trim()) {
      setErrorMsg('Please enter an expense description.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.')
      return
    }

    if (!paidBy) {
      setErrorMsg('Please select who paid.')
      return
    }

    const newExpense = {
      id: Date.now().toString(),
      description: description.trim(),
      amount: numAmount,
      paidBy,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setExpenses([newExpense, ...expenses])
    setDescription('')
    setAmount('')
    setErrorMsg('')
  }

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter((e) => e.id !== id))
  }

  const handleResetAll = () => {
    if (window.confirm('Clear all members and expenses to start completely fresh?')) {
      setMembers([])
      setExpenses([])
      localStorage.removeItem('spliteasy_members')
      localStorage.removeItem('spliteasy_expenses')
      setErrorMsg('')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">SplitEasy</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                  Week 1
                </span>
              </div>
              <p className="text-xs text-slate-500">The Expense Page • Frontend</p>
            </div>
          </div>

          <button
            onClick={handleResetAll}
            title="Reset and clear all data"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors border border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Error notification banner */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg('')}
              className="text-rose-500 hover:text-rose-800 font-bold ml-2 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Spent</p>
              <p className="text-2xl font-extrabold text-slate-900">₹{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Group Members</p>
              <p className="text-2xl font-extrabold text-slate-900">
                {members.length} <span className="text-xs font-normal text-slate-400">/ 6 people</span>
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Equal Share</p>
              <p className="text-2xl font-extrabold text-slate-900">
                ₹{equalShare.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-400">/ person</span>
              </p>
            </div>
          </div>
        </section>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Group Setup & Expense Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Group Setup Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-semibold text-slate-900">Group Setup</h2>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {members.length} of 6 added
                </span>
              </div>

              {/* Theme Selector */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
                  <Tag className="w-3.5 h-3.5" /> Group Theme
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-colors border ${
                        theme === t.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Member Input */}
              <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Enter name (e.g. Aman, Riya)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  disabled={members.length >= 6}
                  className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={members.length >= 6}
                  className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </form>

              {/* Current Members List */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-400">Group Members (2 to 6 people):</p>
                {members.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No members added yet. Type a name above to start.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {members.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(name)}
                          title={`Remove ${name}`}
                          className="text-slate-400 hover:text-rose-600 transition-colors ml-1 font-bold text-sm"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Expense Form (Pure Week 1: Equal Split) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-2 mb-4">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                <h2 className="font-semibold text-slate-900">Add an Expense</h2>
              </div>

              {members.length < 2 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Please add at least 2 members in the Group Setup above to start recording expenses.</span>
                </div>
              ) : (
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Expense Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dinner, Flat rent, Groceries"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="e.g. 1200"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Paid By
                      </label>
                      <select
                        value={paidBy}
                        onChange={(e) => setPaidBy(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-colors flex items-center justify-center space-x-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Expense</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Settlement Plan, Balance View & Expense List */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3. "Who Pays Whom" (Settlement Plan) */}
            <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm shadow-indigo-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <HandCoins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Who Pays Whom</h2>
                    <p className="text-xs text-slate-500">Direct transfers to settle all debts</p>
                  </div>
                </div>
              </div>

              {members.length < 2 || expenses.length === 0 ? (
                <div className="text-center py-6 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                  Add members and expenses to see who needs to pay whom.
                </div>
              ) : settlements.length === 0 ? (
                <div className="text-center py-6 px-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">All settled up! No money is owed.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {settlements.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 hover:bg-indigo-50/40 transition-colors"
                    >
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-200">
                          {s.from}
                        </span>
                        <div className="flex items-center text-indigo-500">
                          <span className="text-[10px] uppercase font-semibold mr-1">pays</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-200">
                          {s.to}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">
                        ₹{s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Balance Breakdown View */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-semibold text-slate-900">Balance Breakdown</h2>
                </div>
                {members.length > 0 && (
                  <span className="text-xs text-slate-500">
                    Equal share: <strong className="text-slate-800">₹{equalShare.toFixed(2)}</strong>
                  </span>
                )}
              </div>

              {members.length === 0 ? (
                <div className="text-center py-6 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                  No members yet. Add people in the Group Setup box.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {memberBalances.map((b) => (
                    <div
                      key={b.name}
                      className={`p-3.5 rounded-xl border transition-all ${
                        b.status === 'owed'
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : b.status === 'owes'
                          ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900">{b.name}</span>
                        {b.status === 'owed' && (
                          <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <ArrowUpRight className="w-3 h-3 mr-0.5" /> is owed
                          </span>
                        )}
                        {b.status === 'owes' && (
                          <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            <ArrowDownRight className="w-3 h-3 mr-0.5" /> owes
                          </span>
                        )}
                        {b.status === 'settled' && (
                          <span className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 mr-0.5" /> settled
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mb-1.5">
                        Paid: <span className="font-semibold text-slate-700">₹{b.paid.toLocaleString()}</span>
                      </p>

                      <div className="text-sm font-extrabold">
                        {b.status === 'owed' && (
                          <span className="text-emerald-700">+₹{b.diff.toFixed(2)}</span>
                        )}
                        {b.status === 'owes' && (
                          <span className="text-rose-700">-₹{b.diff.toFixed(2)}</span>
                        )}
                        {b.status === 'settled' && (
                          <span className="text-slate-500">₹0.00</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Expense List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-semibold text-slate-900">Expenses History</h2>
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {expenses.length} recorded
                </span>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">No expenses added yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Add your friends and record your first expense.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                          {exp.paidBy.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{exp.description}</p>
                          <p className="text-xs text-slate-500">
                            Paid by <span className="font-medium text-slate-700">{exp.paidBy}</span> •{' '}
                            <span>{exp.createdAt || 'Recent'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-slate-900">
                          ₹{Number(exp.amount).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          title="Delete expense"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
