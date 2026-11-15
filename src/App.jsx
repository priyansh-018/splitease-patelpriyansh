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
  Sparkles,
  DollarSign,
  Tag,
  Check,
  Split,
  Layers,
  SlidersHorizontal,
  HandCoins
} from 'lucide-react'

// Default sample matching Week 1 problem statement
const SAMPLE_MEMBERS = ['Aman', 'Riya', 'Karan']
const SAMPLE_EXPENSES = [
  {
    id: '1',
    description: 'Dinner',
    amount: 900,
    paidBy: 'Aman',
    splitType: 'equal',
    selectedMembers: ['Aman', 'Riya', 'Karan'],
    createdAt: 'Today, 8:30 PM',
  },
  {
    id: '2',
    description: 'Snacks',
    amount: 300,
    paidBy: 'Riya',
    splitType: 'equal',
    selectedMembers: ['Aman', 'Riya', 'Karan'],
    createdAt: 'Today, 9:15 PM',
  },
]

const THEMES = [
  { id: 'trip', label: '🏖️ Trip' },
  { id: 'hostel', label: '🏠 Hostel' },
  { id: 'flat', label: '🏢 Flat Rent' },
  { id: 'party', label: '🎉 Party' },
]

export default function App() {
  // --- Persistent State ---
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('spliteasy_members')
    return saved ? JSON.parse(saved) : SAMPLE_MEMBERS
  })

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('spliteasy_expenses')
    return saved ? JSON.parse(saved) : SAMPLE_EXPENSES
  })

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('spliteasy_theme') || 'trip'
  })

  // --- Form State ---
  const [newMemberName, setNewMemberName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(members[0] || '')
  
  // Split Strategy: 'equal' (all), 'selected' (subset of friends), 'custom' (exact amounts per person)
  const [splitType, setSplitType] = useState('equal')
  const [selectedMembers, setSelectedMembers] = useState(members)
  const [customAmounts, setCustomAmounts] = useState({})
  
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

  // Keep paidBy and selectedMembers in sync if members list changes
  useEffect(() => {
    if (members.length > 0 && !members.includes(paidBy)) {
      setPaidBy(members[0])
    }
    // Remove any selected member that was removed from group
    setSelectedMembers((prev) => prev.filter((m) => members.includes(m)))
  }, [members, paidBy])

  // Reset custom amounts and selections when members change
  useEffect(() => {
    if (splitType === 'selected' && selectedMembers.length === 0) {
      setSelectedMembers(members)
    }
  }, [splitType, members, selectedMembers.length])

  // --- Calculations ---
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [expenses])

  // Calculate detailed balances per member (paid vs owed share)
  const memberBalances = useMemo(() => {
    const paidMap = {}
    const shareMap = {}

    members.forEach((m) => {
      paidMap[m] = 0
      shareMap[m] = 0
    })

    expenses.forEach((exp) => {
      const expAmount = Number(exp.amount || 0)
      if (exp.paidBy && paidMap[exp.paidBy] !== undefined) {
        paidMap[exp.paidBy] += expAmount
      }

      if (exp.splitType === 'custom' && exp.customAmounts) {
        Object.entries(exp.customAmounts).forEach(([person, val]) => {
          if (shareMap[person] !== undefined) {
            shareMap[person] += Number(val || 0)
          }
        })
      } else if (exp.splitType === 'selected' && exp.selectedMembers && exp.selectedMembers.length > 0) {
        const share = expAmount / exp.selectedMembers.length
        exp.selectedMembers.forEach((person) => {
          if (shareMap[person] !== undefined) {
            shareMap[person] += share
          }
        })
      } else {
        // Equal split among all current members or members associated
        const participants = exp.selectedMembers?.length ? exp.selectedMembers : members
        const count = participants.length > 0 ? participants.length : members.length
        const share = count > 0 ? expAmount / count : 0
        participants.forEach((person) => {
          if (shareMap[person] !== undefined) {
            shareMap[person] += share
          }
        })
      }
    })

    return members.map((member) => {
      const paid = paidMap[member] || 0
      const share = shareMap[member] || 0
      const net = paid - share

      return {
        name: member,
        paid,
        share,
        net,
        status: net > 0.01 ? 'owed' : net < -0.01 ? 'owes' : 'settled',
        diff: Math.abs(net),
      }
    })
  }, [members, expenses])

  // --- Smart Settlement Algorithm ("Who Pays Whom") ---
  const settlements = useMemo(() => {
    const debtors = []
    const creditors = []

    memberBalances.forEach((b) => {
      if (b.net < -0.01) {
        debtors.push({ name: b.name, amount: Math.abs(b.net) })
      } else if (b.net > 0.01) {
        creditors.push({ name: b.name, amount: b.net })
      }
    })

    // Sort descending for greedy minimum-transaction settlement
    debtors.sort((a, b) => b.amount - a.amount)
    creditors.sort((a, b) => b.amount - a.amount)

    const transfers = []
    let d = 0
    let c = 0

    // Clone to prevent mutating state
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
  }, [memberBalances])

  // Custom Split helper totals
  const totalCustomAllocated = useMemo(() => {
    return Object.values(customAmounts).reduce((sum, val) => sum + Number(val || 0), 0)
  }, [customAmounts])

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
      setErrorMsg('Maximum 6 members allowed in group setup.')
      return
    }
    if (members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`${trimmed} is already in the group.`)
      return
    }

    const updated = [...members, trimmed]
    setMembers(updated)
    setSelectedMembers(updated)
    setNewMemberName('')
  }

  const handleRemoveMember = (nameToRemove) => {
    if (members.length <= 2) {
      setErrorMsg('At least 2 members are required to split expenses.')
      return
    }
    const hasExpenses = expenses.some(
      (e) => e.paidBy === nameToRemove || (e.selectedMembers && e.selectedMembers.includes(nameToRemove))
    )
    if (hasExpenses) {
      if (!window.confirm(`${nameToRemove} is involved in recorded expenses. Removing them may affect calculations. Proceed?`)) {
        return
      }
    }
    setMembers(members.filter((m) => m !== nameToRemove))
    setErrorMsg('')
  }

  const toggleSelectMember = (name) => {
    if (selectedMembers.includes(name)) {
      if (selectedMembers.length <= 1) {
        setErrorMsg('At least 1 person must share this expense.')
        return
      }
      setSelectedMembers(selectedMembers.filter((m) => m !== name))
    } else {
      setSelectedMembers([...selectedMembers, name])
    }
    setErrorMsg('')
  }

  const handleCustomAmountChange = (person, val) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [person]: val === '' ? '' : Math.max(0, parseFloat(val) || 0),
    }))
  }

  const handleAddExpense = (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!description.trim()) {
      setErrorMsg('Please provide an expense description.')
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

    if (splitType === 'selected') {
      if (selectedMembers.length === 0) {
        setErrorMsg('Please select at least 1 person who shares this expense.')
        return
      }
    }

    if (splitType === 'custom') {
      const diff = Math.abs(numAmount - totalCustomAllocated)
      if (diff > 0.05) {
        setErrorMsg(
          `Custom amounts (₹${totalCustomAllocated}) must equal the total expense amount (₹${numAmount}). Difference: ₹${(numAmount - totalCustomAllocated).toFixed(2)}`
        )
        return
      }
    }

    const newExpense = {
      id: Date.now().toString(),
      description: description.trim(),
      amount: numAmount,
      paidBy,
      splitType,
      selectedMembers: splitType === 'equal' ? members : [...selectedMembers],
      customAmounts: splitType === 'custom' ? { ...customAmounts } : null,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setExpenses([newExpense, ...expenses])
    setDescription('')
    setAmount('')
    setCustomAmounts({})
    setSplitType('equal')
    setSelectedMembers(members)
    setErrorMsg('')
  }

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter((e) => e.id !== id))
  }

  const handleLoadDemo = () => {
    setMembers(SAMPLE_MEMBERS)
    setExpenses(SAMPLE_EXPENSES)
    setSelectedMembers(SAMPLE_MEMBERS)
    setCustomAmounts({})
    setSplitType('equal')
    setErrorMsg('')
  }

  const handleResetAll = () => {
    if (window.confirm('Reset everything to an empty group?')) {
      setMembers(['Aman', 'Riya'])
      setExpenses([])
      setSelectedMembers(['Aman', 'Riya'])
      setCustomAmounts({})
      setErrorMsg('')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12">
      {/* Top Header Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">SplitEasy</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                  Week 1 + Stretch Goal
                </span>
              </div>
              <p className="text-xs text-slate-500">Shared expense tracker with smart settlements</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleLoadDemo}
              title="Loads Aman (900), Riya (300), Karan (0) test example"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Test Example</span>
            </button>
            <button
              onClick={handleResetAll}
              title="Reset all data"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Error notification banner */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between animate-fadeIn">
            <span>{errorMsg}</span>
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
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Group Size</p>
              <p className="text-2xl font-extrabold text-slate-900">
                {members.length} <span className="text-xs font-normal text-slate-400">/ 6 people</span>
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HandCoins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Settlements Needed</p>
              <p className="text-2xl font-extrabold text-slate-900">
                {settlements.length}{' '}
                <span className="text-xs font-normal text-slate-400">
                  {settlements.length === 1 ? 'transfer' : 'transfers'}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Group Setup & Expense Form (lg:col-span-5) */}
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
                  placeholder="e.g. Aman, Riya, Rahul"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  disabled={members.length >= 6}
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
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

              {/* Current Members Badges */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-400">Current Members (Min 2, Max 6):</p>
                <div className="flex flex-wrap gap-2">
                  {members.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 group"
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {name}
                      {members.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(name)}
                          title={`Remove ${name}`}
                          className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Expense Form with Flexible Splitting */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <PlusCircle className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-semibold text-slate-900">Add an Expense</h2>
                </div>
                <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
                  Equal & Custom Splits
                </span>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Expense Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dinner, Rent, Light Bill, Snacks"
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
                      placeholder="900"
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

                {/* Split Method Tabs */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    How should this be split?
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setSplitType('equal')}
                      className={`py-1.5 px-2 rounded-lg transition-all ${
                        splitType === 'equal'
                          ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      👥 Everyone
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitType('selected')}
                      className={`py-1.5 px-2 rounded-lg transition-all ${
                        splitType === 'selected'
                          ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🎯 Select Friends
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitType('custom')}
                      className={`py-1.5 px-2 rounded-lg transition-all ${
                        splitType === 'custom'
                          ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⚖️ Unequal (₹)
                    </button>
                  </div>
                </div>

                {/* Split Option 1: Equal among everyone */}
                {splitType === 'equal' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                    Split equally among all <strong>{members.length} members</strong>
                    {amount && parseFloat(amount) > 0 && (
                      <span className="text-indigo-600 font-semibold ml-1">
                        (₹{(parseFloat(amount) / members.length).toFixed(2)} each)
                      </span>
                    )}
                  </div>
                )}

                {/* Split Option 2: Split among selected friends */}
                {splitType === 'selected' && (
                  <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-700">Choose who shares this expense:</p>
                      {amount && parseFloat(amount) > 0 && selectedMembers.length > 0 && (
                        <span className="text-xs text-indigo-600 font-semibold">
                          ₹{(parseFloat(amount) / selectedMembers.length).toFixed(2)} / person
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {members.map((name) => {
                        const isSelected = selectedMembers.includes(name)
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleSelectMember(name)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border flex items-center space-x-1 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Split Option 3: Custom Unequal exact amounts */}
                {splitType === 'custom' && (
                  <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">Specify exact amount per person:</span>
                      <span
                        className={`font-semibold ${
                          amount && Math.abs(parseFloat(amount) - totalCustomAllocated) < 0.05
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      >
                        Total: ₹{totalCustomAllocated} / ₹{amount || 0}
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {members.map((name) => (
                        <div key={name} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-700 font-medium">{name}</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={customAmounts[name] ?? ''}
                              onChange={(e) => handleCustomAmountChange(name, e.target.value)}
                              className="w-24 px-2 py-1 bg-white rounded-lg border border-slate-200 text-right text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-colors flex items-center justify-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Expense</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Settlement Plan, Balance View & Expense List (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3. "WHO PAYS WHOM" (Smart Settlement Plan) */}
            <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm shadow-indigo-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <HandCoins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Who Pays Whom (Settlement Plan)</h2>
                    <p className="text-xs text-slate-500">Minimum transfers needed to settle all debts</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Simplified Debts
                </span>
              </div>

              {settlements.length === 0 ? (
                <div className="text-center py-6 px-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">All settled up! Nobody owes any money.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {settlements.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-indigo-50/40 transition-colors"
                    >
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-2xs">
                          {s.from}
                        </span>
                        <div className="flex items-center text-indigo-500">
                          <span className="text-[10px] uppercase font-semibold mr-1">pays</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-2xs">
                          {s.to}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-100 shadow-2xs">
                        ₹{s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Individual Balances & Total Consumed */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-semibold text-slate-900">Member Balances</h2>
                </div>
                <span className="text-xs text-slate-500">Net = Paid − Share</span>
              </div>

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
                    <div className="flex items-center justify-between mb-1.5">
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

                    <div className="text-xs text-slate-500 space-y-0.5 mb-2">
                      <div className="flex justify-between">
                        <span>Paid:</span>
                        <span className="font-semibold text-slate-700">₹{b.paid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Share:</span>
                        <span className="font-semibold text-slate-700">₹{b.share.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Net Balance:</span>
                      <span
                        className={`text-sm font-extrabold ${
                          b.status === 'owed'
                            ? 'text-emerald-700'
                            : b.status === 'owes'
                            ? 'text-rose-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {b.status === 'owed' && `+₹${b.diff.toFixed(2)}`}
                        {b.status === 'owes' && `-₹${b.diff.toFixed(2)}`}
                        {b.status === 'settled' && '₹0.00'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
                    Use the form on the left to record your first shared expense.
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
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-semibold text-slate-900">{exp.description}</p>
                            {exp.splitType === 'selected' && (
                              <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                {exp.selectedMembers?.length} friends
                              </span>
                            )}
                            {exp.splitType === 'custom' && (
                              <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-md">
                                Custom split
                              </span>
                            )}
                          </div>
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

        {/* Verification Check Banner */}
        <section className="mt-8 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-indigo-900">
          <div>
            <strong>CodGen Week 1 Reference Check:</strong> Aman paid ₹900, Riya paid ₹300, Karan paid ₹0.
            <div className="mt-0.5 text-indigo-700">
              Total = ₹1,200 | Equal share = ₹400/person | Aman is owed ₹500, Riya owes ₹100, Karan owes ₹400.
            </div>
          </div>
          <button
            onClick={handleLoadDemo}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-xs"
          >
            Verify with Test Data
          </button>
        </section>
      </main>
    </div>
  )
}
