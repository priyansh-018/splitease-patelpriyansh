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
  AlertCircle,
  Palette,
  Sparkles,
  Layers,
  Moon,
  Sun
} from 'lucide-react'

const UI_STYLES = [
  { id: 'neobank', label: 'Neo-Bank', icon: '✨' },
  { id: 'fintech', label: 'FinTech Dark', icon: '⚡' },
  { id: 'bento', label: 'Warm Bento', icon: '📖' },
]

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

  // --- UI Style Mode ---
  const [uiStyle, setUiStyle] = useState(() => {
    return localStorage.getItem('spliteasy_ui_style') || 'neobank'
  })

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
    localStorage.setItem('spliteasy_ui_style', uiStyle)
  }, [uiStyle])

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

  // --- Calculations ---
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

  // --- Dynamic Style Helper Maps ---
  const isDark = uiStyle === 'fintech'
  const isBento = uiStyle === 'bento'

  const styles = {
    pageBg: isDark
      ? 'bg-slate-950 text-slate-100'
      : isBento
      ? 'bg-[#FAF8F5] text-stone-900'
      : 'bg-slate-50/80 text-slate-900',
    headerBg: isDark
      ? 'bg-slate-900/90 border-slate-800'
      : isBento
      ? 'bg-[#FAF8F5]/90 border-stone-200'
      : 'bg-white/90 border-slate-200',
    card: isDark
      ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-md shadow-black/30'
      : isBento
      ? 'bg-white border-stone-200/90 text-stone-900 shadow-2xs'
      : 'bg-white border-slate-200 text-slate-900 shadow-xs',
    subCard: isDark
      ? 'bg-slate-800/60 border-slate-700/60'
      : isBento
      ? 'bg-stone-50 border-stone-200'
      : 'bg-slate-50 border-slate-200',
    input: isDark
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-emerald-500'
      : isBento
      ? 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:ring-stone-400'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-indigo-500',
    buttonPrimary: isDark
      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-xs shadow-emerald-500/20'
      : isBento
      ? 'bg-stone-900 hover:bg-stone-800 text-white font-medium'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs shadow-indigo-200',
    logoBg: isDark
      ? 'bg-emerald-500 text-slate-950'
      : isBento
      ? 'bg-stone-900 text-white'
      : 'bg-indigo-600 text-white shadow-md shadow-indigo-200',
    textMuted: isDark ? 'text-slate-400' : isBento ? 'text-stone-500' : 'text-slate-500',
  }

  return (
    <div className={`min-h-screen ${styles.pageBg} font-sans antialiased pb-12 transition-colors duration-200`}>
      {/* Top Navbar */}
      <header className={`border-b sticky top-0 z-30 shadow-xs backdrop-blur-md ${styles.headerBg} transition-colors duration-200`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title Only */}
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${styles.logoBg}`}>
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SplitEasy</h1>
          </div>

          {/* Right Tools: Style Switcher & Clear */}
          <div className="flex items-center space-x-3">
            {/* Style Switcher Pill */}
            <div
              className={`flex items-center p-1 rounded-xl border text-xs font-medium ${
                isDark ? 'bg-slate-800/80 border-slate-700' : isBento ? 'bg-stone-100 border-stone-200' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <span className={`px-2 text-[11px] font-semibold flex items-center gap-1 ${styles.textMuted}`}>
                <Palette className="w-3.5 h-3.5" /> Style:
              </span>
              <div className="flex space-x-1">
                {UI_STYLES.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setUiStyle(st.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                      uiStyle === st.id
                        ? isDark
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                          : isBento
                          ? 'bg-white text-stone-900 font-bold shadow-xs'
                          : 'bg-white text-indigo-700 font-bold shadow-xs'
                        : styles.textMuted + ' hover:opacity-80'
                    }`}
                  >
                    <span>{st.icon}</span>
                    <span className="hidden sm:inline">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All Button */}
            <button
              onClick={handleResetAll}
              title="Clear all members and expenses"
              className={`p-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800'
                  : isBento
                  ? 'text-stone-500 hover:text-stone-800 hover:bg-stone-100 border-stone-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Error notification banner */}
        {errorMsg && (
          <div
            className={`mb-6 p-3.5 rounded-xl border text-sm flex items-center justify-between ${
              isDark
                ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg('')}
              className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className={`p-5 rounded-2xl border ${styles.card} flex items-center space-x-4`}>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${styles.textMuted}`}>Total Spent</p>
              <p className="text-2xl font-extrabold">₹{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border ${styles.card} flex items-center space-x-4`}>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-indigo-950 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${styles.textMuted}`}>Group Members</p>
              <p className="text-2xl font-extrabold">
                {members.length} <span className={`text-xs font-normal ${styles.textMuted}`}>/ 6 people</span>
              </p>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border ${styles.card} flex items-center space-x-4`}>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-amber-950 text-amber-400' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${styles.textMuted}`}>Equal Share</p>
              <p className="text-2xl font-extrabold">
                ₹{equalShare.toFixed(2)}{' '}
                <span className={`text-xs font-normal ${styles.textMuted}`}>/ person</span>
              </p>
            </div>
          </div>
        </section>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Group Setup & Expense Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Group Setup Box */}
            <div className={`p-5 rounded-2xl border ${styles.card}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className={isDark ? 'w-5 h-5 text-emerald-400' : 'w-5 h-5 text-indigo-600'} />
                  <h2 className="font-semibold">Group Setup</h2>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.subCard}`}>
                  {members.length} of 6 added
                </span>
              </div>

              {/* Theme Selector */}
              <div className="mb-4">
                <label className={`text-xs font-medium flex items-center gap-1 mb-2 ${styles.textMuted}`}>
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
                          ? isDark
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                            : isBento
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : styles.subCard + ' ' + styles.textMuted
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
                  className={`flex-1 text-sm px-3.5 py-2 rounded-xl border focus:outline-hidden focus:ring-2 disabled:opacity-50 ${styles.input}`}
                />
                <button
                  type="submit"
                  disabled={members.length >= 6}
                  className={`inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 ${styles.buttonPrimary}`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </form>

              {/* Current Members List */}
              <div className="space-y-1.5">
                <p className={`text-xs font-medium ${styles.textMuted}`}>Group Members (2 to 6 people):</p>
                {members.length === 0 ? (
                  <p className={`text-xs italic py-2 ${styles.textMuted}`}>
                    No members added yet. Type a name above to start.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {members.map((name) => (
                      <span
                        key={name}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${styles.subCard}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-indigo-500'}`}></span>
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(name)}
                          title={`Remove ${name}`}
                          className="opacity-60 hover:opacity-100 hover:text-rose-500 transition-colors ml-1 font-bold text-sm"
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
            <div className={`p-5 rounded-2xl border ${styles.card}`}>
              <div className="flex items-center space-x-2 mb-4">
                <PlusCircle className={isDark ? 'w-5 h-5 text-emerald-400' : 'w-5 h-5 text-indigo-600'} />
                <h2 className="font-semibold">Add an Expense</h2>
              </div>

              {members.length < 2 ? (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-center space-x-2 ${
                    isDark
                      ? 'bg-amber-950/50 border-amber-800 text-amber-300'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Please add at least 2 members in the Group Setup above to start recording expenses.</span>
                </div>
              ) : (
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${styles.textMuted}`}>
                      Expense Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dinner, Flat rent, Groceries"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`w-full text-sm px-3.5 py-2 rounded-xl border focus:outline-hidden focus:ring-2 ${styles.input}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${styles.textMuted}`}>
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="e.g. 1200"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full text-sm px-3.5 py-2 rounded-xl border focus:outline-hidden focus:ring-2 font-semibold ${styles.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${styles.textMuted}`}>
                        Paid By
                      </label>
                      <select
                        value={paidBy}
                        onChange={(e) => setPaidBy(e.target.value)}
                        className={`w-full text-sm px-3 py-2 rounded-xl border focus:outline-hidden focus:ring-2 ${styles.input}`}
                      >
                        {members.map((name) => (
                          <option key={name} value={name} className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full mt-2 py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 ${styles.buttonPrimary}`}
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
            <div className={`p-5 rounded-2xl border ${styles.card}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isDark ? 'bg-emerald-950 text-emerald-400' : isBento ? 'bg-stone-100 text-stone-900' : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <HandCoins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Who Pays Whom</h2>
                    <p className={`text-xs ${styles.textMuted}`}>Direct transfers to settle all debts</p>
                  </div>
                </div>
              </div>

              {members.length < 2 || expenses.length === 0 ? (
                <div className={`text-center py-6 px-4 border rounded-xl text-xs ${styles.subCard} ${styles.textMuted}`}>
                  Add members and expenses to see who needs to pay whom.
                </div>
              ) : settlements.length === 0 ? (
                <div
                  className={`text-center py-6 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 border ${
                    isDark
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                      : 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">All settled up! No money is owed.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {settlements.map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${styles.subCard}`}
                    >
                      <div className="flex items-center space-x-2 text-xs">
                        <span className={`font-bold px-2 py-1 rounded-md border ${styles.card}`}>
                          {s.from}
                        </span>
                        <div className={`flex items-center ${isDark ? 'text-emerald-400' : 'text-indigo-500'}`}>
                          <span className="text-[10px] uppercase font-semibold mr-1">pays</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                        <span className={`font-bold px-2 py-1 rounded-md border ${styles.card}`}>
                          {s.to}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-extrabold px-2.5 py-1 rounded-lg border ${
                          isDark
                            ? 'text-emerald-400 bg-slate-900 border-emerald-500/30 font-mono'
                            : 'text-indigo-700 bg-white border-indigo-100'
                        }`}
                      >
                        ₹{s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Balance Breakdown View */}
            <div className={`p-5 rounded-2xl border ${styles.card}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Wallet className={isDark ? 'w-5 h-5 text-emerald-400' : 'w-5 h-5 text-indigo-600'} />
                  <h2 className="font-semibold">Balance Breakdown</h2>
                </div>
                {members.length > 0 && (
                  <span className={`text-xs ${styles.textMuted}`}>
                    Equal share: <strong className={isDark ? 'text-slate-100' : 'text-slate-900'}>₹{equalShare.toFixed(2)}</strong>
                  </span>
                )}
              </div>

              {members.length === 0 ? (
                <div className={`text-center py-6 px-4 border rounded-xl text-xs ${styles.subCard} ${styles.textMuted}`}>
                  No members yet. Add people in the Group Setup box.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {memberBalances.map((b) => (
                    <div
                      key={b.name}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isDark
                          ? b.status === 'owed'
                            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-100'
                            : b.status === 'owes'
                            ? 'bg-rose-950/40 border-rose-800/80 text-rose-100'
                            : 'bg-slate-800/60 border-slate-700 text-slate-200'
                          : b.status === 'owed'
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : b.status === 'owes'
                          ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{b.name}</span>
                        {b.status === 'owed' && (
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isDark ? 'text-emerald-300 bg-emerald-950 border border-emerald-800' : 'text-emerald-700 bg-emerald-100'
                          }`}>
                            <ArrowUpRight className="w-3 h-3 mr-0.5" /> is owed
                          </span>
                        )}
                        {b.status === 'owes' && (
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isDark ? 'text-rose-300 bg-rose-950 border border-rose-800' : 'text-rose-700 bg-rose-100'
                          }`}>
                            <ArrowDownRight className="w-3 h-3 mr-0.5" /> owes
                          </span>
                        )}
                        {b.status === 'settled' && (
                          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-600 bg-slate-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 mr-0.5" /> settled
                          </span>
                        )}
                      </div>

                      <p className={`text-xs mb-1.5 ${styles.textMuted}`}>
                        Paid: <span className="font-semibold">{isDark ? '₹' : '₹'}{b.paid.toLocaleString()}</span>
                      </p>

                      <div className="text-sm font-extrabold">
                        {b.status === 'owed' && (
                          <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>+₹{b.diff.toFixed(2)}</span>
                        )}
                        {b.status === 'owes' && (
                          <span className={isDark ? 'text-rose-400' : 'text-rose-700'}>-₹{b.diff.toFixed(2)}</span>
                        )}
                        {b.status === 'settled' && (
                          <span className={styles.textMuted}>₹0.00</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Expense List */}
            <div className={`p-5 rounded-2xl border ${styles.card}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Receipt className={isDark ? 'w-5 h-5 text-emerald-400' : 'w-5 h-5 text-indigo-600'} />
                  <h2 className="font-semibold">Expenses History</h2>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    isDark ? 'bg-slate-800 text-emerald-400' : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {expenses.length} recorded
                </span>
              </div>

              {expenses.length === 0 ? (
                <div className={`text-center py-10 px-4 border-2 border-dashed rounded-xl ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <Receipt className={`w-8 h-8 mx-auto mb-2 opacity-40 ${styles.textMuted}`} />
                  <p className="text-sm font-medium">No expenses added yet</p>
                  <p className={`text-xs mt-0.5 ${styles.textMuted}`}>
                    Add your friends and record your first expense.
                  </p>
                </div>
              ) : (
                <div className={`divide-y max-h-[380px] overflow-y-auto pr-1 ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className={`py-3 px-2 flex items-center justify-between rounded-xl transition-colors ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${
                            isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {exp.paidBy.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{exp.description}</p>
                          <p className={`text-xs ${styles.textMuted}`}>
                            Paid by <span className="font-medium">{exp.paidBy}</span> •{' '}
                            <span>{exp.createdAt || 'Recent'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`text-sm font-bold ${isDark ? 'font-mono' : ''}`}>
                          ₹{Number(exp.amount).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          title="Delete expense"
                          className="p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
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
