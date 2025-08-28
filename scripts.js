document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const transactionForm = document.getElementById('transaction-form');
    const transactionCategoryInput = document.getElementById('transaction-category');
    const transactionAmountInput = document.getElementById('transaction-amount');
    const totalAmountElement = document.getElementById('total-amount');
    const transactionListElement = document.getElementById('transaction-list');
    const expenseBtn = document.getElementById('expense-btn');
    const incomeBtn = document.getElementById('income-btn');
    
    // Initialize total amounts and transactions array
    let netTotal = 0;
    let transactions = [];

    /**
     * Updates the displayed total amount and applies a subtle animation.
     * @param {number} newTotal The new total to display.
     */
    function updateTotalDisplay(newTotal) {
        totalAmountElement.style.transform = 'scale(1.05)';
        totalAmountElement.textContent = `$${newTotal.toFixed(2)}`;
        setTimeout(() => {
            totalAmountElement.style.transform = 'scale(1)';
        }, 200);
    }

    /**
     * Renders the list of transactions to the DOM.
     */
    function renderTransactions() {
        // Clear the existing list
        transactionListElement.innerHTML = '';
        
        // Render each transaction
        transactions.forEach(transaction => {
            const li = document.createElement('li');
            li.classList.add('flex', 'justify-between', 'items-center', 'p-3', 'rounded-lg', 'bg-gray-700', 'hover:scale-[1.01]', 'transform', 'transition-transform');
            
            const amountClass = transaction.type === 'income' ? 'income-amount' : 'expense-amount';
            const sign = transaction.type === 'income' ? '+' : '-';

            li.innerHTML = `
                <span class="text-sm sm:text-base font-medium text-slate-200">${transaction.category}</span>
                <span class="font-bold text-sm sm:text-base ${amountClass}">${sign}$${transaction.amount.toFixed(2)}</span>
            `;
            transactionListElement.appendChild(li);
        });
    }


    function loadData() {
        // Load net total
        const storedTotal = localStorage.getItem('monetraxNetTotal');
        if (storedTotal) {
            netTotal = parseFloat(storedTotal);
            updateTotalDisplay(netTotal);
        }

        // Load transactions
        const storedTransactions = localStorage.getItem('monetraxTransactions');
        if (storedTransactions) {
            transactions = JSON.parse(storedTransactions);
            renderTransactions();
        }
    }
    
    // Add a click listener to the expense and income buttons
    expenseBtn.addEventListener('click', () => handleTransaction('expense'));
    incomeBtn.addEventListener('click', () => handleTransaction('income'));

    /**
     * Handles the transaction logic for both income and expenses.
     * @param {string} type The transaction type ('income' or 'expense').
     */
    function handleTransaction(type) {
        const category = transactionCategoryInput.value;
        const amount = parseFloat(transactionAmountInput.value);

        // Basic validation
        if (!category || isNaN(amount) || amount <= 0) {
            alert('Please select a category and enter a valid positive amount.');
            return;
        }

        // Create a new transaction object
        const newTransaction = {
            category: category,
            amount: amount,
            type: type,
            timestamp: new Date().toISOString()
        };
        
        // Add the new transaction to the beginning of the array
        transactions.unshift(newTransaction);
        
        // Keep the list to a reasonable size (e.g., last 10 transactions)
        if (transactions.length > 10) {
            transactions.pop();
        }

        // Update the net total based on the transaction type
        if (type === 'income') {
            netTotal += amount;
        } else {
            netTotal -= amount;
        }
        
        // Save data to local storage
        localStorage.setItem('monetraxNetTotal', netTotal.toFixed(2));
        localStorage.setItem('monetraxTransactions', JSON.stringify(transactions));

        // Update the UI
        updateTotalDisplay(netTotal);
        renderTransactions();

        // Reset the form and focus on the amount field
        transactionForm.reset();
        transactionAmountInput.focus();
    }

    // Initial data load
    loadData();
});