document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const transactionForm = document.getElementById('transaction-form');
    const transactionCategoryInput = document.getElementById('transaction-category');
    const transactionAmountInput = document.getElementById('transaction-amount');
    const totalAmountElement = document.getElementById('total-amount');
    const transactionListElement = document.getElementById('transaction-list');
    const expenseBtn = document.getElementById('expense-btn');
    const incomeBtn = document.getElementById('income-btn');
    const authButton = document.getElementById('auth-button');
    const authButtonLabel = document.getElementById('auth-button-label');
    const userDisplayName = document.getElementById('user-display-name');
    const alertMessage = document.getElementById('alert-message');
    const alertModal = document.getElementById('alert-modal');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');

    if (!transactionForm || !transactionCategoryInput) {
        console.error('Missing expected DOM elements.');
    }

    // Local per-browser "user" id for testing
    function getOrCreateLocalUserId() {
        let uid = localStorage.getItem('monetrax_userId');
        if (!uid) {
            uid = 'guest-' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem('monetrax_userId', uid);
        }
        return uid;
    }

    // Keys
    function lsKey(uid, suffix) { return `monetrax_${uid}_${suffix}`; }

    // App state
    let userId = null;
    let transactions = [];
    let netTotal = 0;

    // Modal helper (reuses existing alert modal)
    function showModal(msg) {
        if (alertMessage) { alertMessage.textContent = msg; }
        const modal = document.getElementById('alert-modal');
        if (modal) modal.style.display = 'flex';
    }

    // UI rendering
    function updateTotalDisplay(val) {
        if (!totalAmountElement) return;
        totalAmountElement.style.transform = 'scale(1.05)';
        totalAmountElement.textContent = `$${Number(val || 0).toFixed(2)}`;
        setTimeout(() => totalAmountElement.style.transform = 'scale(1)', 200);
    }

    function renderTransactions() {
        if (!transactionListElement) return;
        transactionListElement.innerHTML = '';
        transactions.forEach(tx => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center p-3 rounded-lg bg-gray-700 hover:scale-[1.01] transform transition-transform';
            const amountClass = tx.type === 'income' ? 'income-amount' : 'expense-amount';
            const sign = tx.type === 'income' ? '+' : '-';
            li.innerHTML = `
                <span class="text-sm sm:text-base font-medium text-slate-200">${tx.category}</span>
                <span class="font-bold text-sm sm:text-base ${amountClass}">${sign}$${Number(tx.amount).toFixed(2)}</span>
            `;
            transactionListElement.appendChild(li);
        });
    }

    // Local persistence
    function loadLocalData(uid) {
        if (!uid) return;
        try {
            const txs = JSON.parse(localStorage.getItem(lsKey(uid, 'transactions')) || '[]');
            const nt = parseFloat(localStorage.getItem(lsKey(uid, 'netTotal')) || '0');
            transactions = Array.isArray(txs) ? txs : [];
            netTotal = isNaN(nt) ? 0 : nt;
            updateTotalDisplay(netTotal);
            renderTransactions();
        } catch (e) {
            console.error('Failed to load local data', e);
            transactions = [];
            netTotal = 0;
        }
    }

    function saveLocalData(uid) {
        if (!uid) return;
        try {
            localStorage.setItem(lsKey(uid, 'transactions'), JSON.stringify(transactions.slice(0, 100)));
            localStorage.setItem(lsKey(uid, 'netTotal'), netTotal.toString());
        } catch (e) {
            console.error('Failed to save local data', e);
        }
    }

    // Transaction handling
    function addTransaction(type) {
        const category = transactionCategoryInput.value;
        const amount = parseFloat(transactionAmountInput.value);
        if (!category || isNaN(amount) || amount <= 0) {
            showModal('Please select a category and enter a valid positive amount.');
            return;
        }
        const tx = { category, amount, type, timestamp: new Date().toISOString() };
        if (type === 'income') netTotal += amount; else netTotal -= amount;
        transactions.unshift(tx);
        // persist
        saveLocalData(userId);
        // UI
        updateTotalDisplay(netTotal);
        renderTransactions();
        transactionForm.reset();
        transactionAmountInput.focus();
    }

    // Export / Import controls
    function exportLocalData(uid) {
        if (!uid) { showModal('No user found'); return; }
        const payload = {
            userId: uid,
            netTotal,
            transactions,
            createdAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monetrax-${uid}-export.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function importLocalDataFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const obj = JSON.parse(e.target.result);
                if (!obj || !obj.transactions) throw new Error('Invalid export file');
                // Overwrite current user's data (explicit choice)
                transactions = obj.transactions.slice(0, 200);
                netTotal = parseFloat(obj.netTotal) || transactions.reduce((acc, t) => (t.type==='income'?acc+Number(t.amount):acc-Number(t.amount)), 0);
                saveLocalData(userId);
                updateTotalDisplay(netTotal);
                renderTransactions();
                showModal('Import successful for this browser user.');
            } catch (err) {
                console.error('Import failed', err);
                showModal('Import failed: invalid file.');
            }
        };
        reader.readAsText(file);
    }

    // Create or restore a lightweight local "signed-in" state for testing
    function localSignIn() {
        userId = getOrCreateLocalUserId();
        userDisplayName.textContent = `Local: ${userId}`;
        userDisplayName.classList.remove('hidden');
        if (authButtonLabel) authButtonLabel.textContent = 'Sign Out';
        loadLocalData(userId);
    }

    function localSignOut() {
        userId = null;
        userDisplayName.classList.add('hidden');
        if (authButtonLabel) authButtonLabel.textContent = 'Sign In (local)';
        transactions = [];
        netTotal = 0;
        updateTotalDisplay(0);
        renderTransactions();
    }

    // Service worker registration (optional; helps offline on GitHub Pages)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker?.register('sw.js').catch(() => { /* ignore if sw not present */ });
    }

    // Event bindings
    expenseBtn?.addEventListener('click', () => addTransaction('expense'));
    incomeBtn?.addEventListener('click', () => addTransaction('income'));

    // Auth-button: toggle local sign in/out for testing
    authButton?.addEventListener('click', async () => {
        // If currently local signed-in, sign out
        if (userId) { localSignOut(); return; }
        // Otherwise sign in locally
        localSignIn();
    });

    // Export/import wiring
    exportBtn?.addEventListener('click', () => exportLocalData(userId));
    importFile?.addEventListener('change', (ev) => {
        const f = ev.target.files && ev.target.files[0];
        if (f) importLocalDataFile(f);
        // reset input so same file can be reselected later
        importFile.value = '';
    });

    // Ensure we have a userId for testing immediately (creates guest id)
    userId = localStorage.getItem('monetrax_userId') || null;
    if (!userId) {
        // Create but do not auto-sign-in visually — choose to auto sign in for convenience:
        userId = getOrCreateLocalUserId();
        localSignIn();
    } else {
        localSignIn();
    }

    // Save periodically and before unload
    setInterval(() => saveLocalData(userId), 5000);
    window.addEventListener('beforeunload', () => saveLocalData(userId));

    /* --- Added: device sensitivity helpers --- */
    /**
     * Returns true if the current device likely supports touch interactions.
     */
    function isTouchDevice() {
        return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    }

    /**
     * Adjust the layout based on screen size / device type.
     * Adds classes to <body> that CSS uses to adapt spacing and tap targets.
     */
    function adjustLayout() {
        const b = document.body;
        // touch-friendly class
        if (isTouchDevice()) {
            b.classList.add('touch');
        } else {
            b.classList.remove('touch');
        }
        // compact class for very small screens
        if (window.innerWidth < 540 || window.innerHeight < 420) {
            b.classList.add('compact');
        } else {
            b.classList.remove('compact');
        }
        // tweak font scaling for tiny screens
        if (window.innerWidth < 380) {
            document.documentElement.style.fontSize = '14px';
        } else {
            document.documentElement.style.fontSize = '';
        }
    }

    /**
     * Ensure focused inputs are visible when virtual keyboard appears on mobile.
     */
    function ensureInputVisibleOnFocus() {
        // capture focus for all inputs inside the app
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(inp => {
            inp.addEventListener('focus', () => {
                // small timeout to allow keyboard to show
                setTimeout(() => {
                    if (typeof inp.scrollIntoView === 'function') {
                        inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            });
        });
    }

    /* --- Hook up the layout adjustments --- */
    window.addEventListener('resize', adjustLayout, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(adjustLayout, 200), { passive: true });
    document.addEventListener('DOMContentLoaded', () => {
        adjustLayout();
        ensureInputVisibleOnFocus();
        // (If your script has an init function, call it here)
        if (typeof init === 'function') try { init(); } catch(e){/* ignore if not present */ }
    });

    /* --- End added code --- */
});