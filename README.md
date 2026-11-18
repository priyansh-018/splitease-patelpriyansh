# SplitEasy - Shared Expense Tracker

SplitEasy is a clean, responsive shared expense tracking web application built for **Week 1** of the **CodGen Full Stack Track (MERN)**.

The app allows friends, flatmates, or travel groups to record shared expenses and instantly see who paid what, the equal share per person, individual balances, and an exact settlement plan of who needs to pay whom.

---

## 🚀 Features

- **Group Setup:** Add 2 to 6 members with custom group themes (*Trip*, *Hostel*, *Flat Rent*, *Party*).
- **Add Expenses:** Enter description, amount, and choose who paid from the group members.
- **Totals & Equal Share:** Instant calculation of total group spend and per-person equal share.
- **Balance Breakdown:** Live balance for each person showing how much they paid and whether they owe or are owed money (`paid - equal share`).
- **Settlement Plan ("Who Pays Whom"):** Clear breakdown showing direct transfers to settle all group debts with minimum transactions.
- **Expense History:** List of all recorded expenses with timestamps and 1-click delete.
- **Data Persistence:** Automatically saves all members and expenses to the browser's `localStorage`.

---

## 🧮 Calculation Logic

1. **Total Spent:**
   $$\text{Total} = \sum \text{expenses}$$

2. **Equal Share:**
   $$\text{Equal Share} = \frac{\text{Total Spent}}{\text{Number of Members}}$$

3. **Individual Balance:**
   $$\text{Net Balance} = \text{Amount Paid} - \text{Equal Share}$$
   - If $\text{Net} > 0$: Member **is owed** money.
   - If $\text{Net} < 0$: Member **owes** money.
   - If $\text{Net} = 0$: Member is **settled up**.

4. **Test Case Verification:**
   - Members: **Aman**, **Riya**, **Karan**
   - Expenses: Aman paid ₹900 (dinner), Riya paid ₹300 (snacks), Karan paid ₹0
   - Total = **₹1,200** | Equal Share = **₹400**
   - Result:
     - **Aman:** is owed ₹500
     - **Riya:** owes ₹100
     - **Karan:** owes ₹400
     - **Settlement:** Riya pays Aman ₹100, Karan pays Aman ₹400.

---

## 🛠️ Tech Stack

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Storage:** Browser LocalStorage

---

## 💻 Getting Started Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/priyansh-018/SplitEasy
   cd SplitEasy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.
