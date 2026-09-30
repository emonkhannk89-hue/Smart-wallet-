// প্রাথমিক ব্যালেন্স তথ্য (একাউন্ট ডাটা)
const accounts = {
    bkash: { name: 'বিকাশ (bKash)', balance: 25000, type: 'wallet', displayId: 'bkashBalDisplay' },
    nagad: { name: 'নগদ (Nagad)', balance: 15450, type: 'wallet', displayId: 'nagadBalDisplay' },
    rocket: { name: 'রকেট (Rocket)', balance: 15000, type: 'wallet', displayId: 'rocketBalDisplay' },
    upay: { name: 'উপায় (upay)', balance: 10000, type: 'wallet', displayId: 'upayBalDisplay' },
    ebl: { name: 'Eastern Bank PLC', balance: 60000, type: 'bank', displayId: 'eblBalDisplay' },
    city: { name: 'City Bank PLC', balance: 75000, type: 'bank', displayId: 'cityBalDisplay' },
    ib: { name: 'ইসলামী ব্যাংক', balance: 50000, type: 'bank', displayId: 'ibBalDisplay' }
};

// প্রাথমিক লেনদেনের ইতিহাস
let transactions = [
    { title: 'স্যালারি ডিপোজিট', channel: 'City Bank PLC', account: 'Acc: 310XXXXXX', date: '৩০ সেপ, ২০২৬ (০৯:৩০ AM)', amount: 75000, type: 'in' },
    { title: 'অনলাইন ফান্ড ট্রান্সফার', channel: 'Eastern Bank PLC', account: 'Acc: 101XXXXXX', date: '২৯ সেপ, ২০২৬ (০৪:১৫ PM)', amount: 60000, type: 'in' },
    { title: 'ক্যাশ ইন', channel: 'upay', account: '01612-XXXXXX', date: '২৮ সেপ, ২০২৬ (১১:২০ AM)', amount: 10000, type: 'in' }
];

// প্রয়োজনীয় এলিমেন্ট লোড হওয়ার পর ড্যাশবোর্ড আপডেট করা
document.addEventListener('DOMContentLoaded', () => {
    updateDashboardUI();
    renderTransactions();
});

// টাকা ফরম্যাট করার ফাংশন (যেমন: 25000 -> ৳ ২৫,০০০)
function formatCurrency(amount) {
    return '৳ ' + amount.toLocaleString('bn-BD');
}

// বর্তমান তারিখ ও সময়ের স্ট্রিং তৈরি করা
function getCurrentDateTimeFormatted() {
    const now = new Date();
    const months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ', 'অক্টো', 'নভে', 'ডিসেম্বর'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()}`;
    
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');
    
    // ইংরেজি সংখ্যাকে বাংলায় রূপান্তর
    const banglaNumbers = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
    const convertToBangla = (str) => str.replace(/[0-9]/g, match => banglaNumbers[match]);

    return convertToBangla(`${dateStr} (${hoursStr}:${minutes} ${ampm})`);
}

// সর্বমোট ও সিঙ্গেল অ্যাকাউন্টের ব্যালেন্স হিসাব করা
function updateDashboardUI() {
    let totalWallet = 0;
    let totalBank = 0;

    for (const key in accounts) {
        const acc = accounts[key];
        if (acc.type === 'wallet') {
            totalWallet += acc.balance;
        } else if (acc.type === 'bank') {
            totalBank += acc.balance;
        }
        document.getElementById(acc.displayId).innerText = formatCurrency(acc.balance);
    }

    const grandTotal = totalWallet + totalBank;
    document.getElementById('walletTotalDisplay').innerText = formatCurrency(totalWallet);
    document.getElementById('bankTotalDisplay').innerText = formatCurrency(totalBank);
    document.getElementById('totalBalanceDisplay').innerText = formatCurrency(grandTotal);
}

// লেনদেনের তালিকা রেন্ডার করা
function renderTransactions() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';

    transactions.forEach(trx => {
        const tr = document.createElement('tr');
        
        const isIncome = trx.type === 'in';
        const amountClass = isIncome ? 'text-green' : 'text-red';
        const amountSign = isIncome ? '+ ' : '- ';

        tr.innerHTML = `
            <td>${trx.title}</td>
            <td><span class="badge">${trx.channel}</span></td>
            <td><span style="font-family: monospace; font-size: 13px;">${trx.account}</span></td>
            <td style="color: #94a3b8; font-size: 13px;">${trx.date}</td>
            <td class="text-right ${amountClass}">${amountSign}${formatCurrency(trx.amount)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// মডাল খোলা ও বন্ধ করা
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// ট্রান্সফার সাবমিট হলে কাজ করার ফাংশন
function handleTransferSubmit() {
    const fromKey = document.getElementById('transferFromSelect').value;
    const accountNo = document.getElementById('transferAccountInput').value.trim();
    const amountVal = parseFloat(document.getElementById('transferAmountInput').value);

    if (!accountNo) {
        alert('অনুগ্রহ করে প্রাপকের মোবাইল নম্বর বা অ্যাকাউন্ট নম্বর লিখুন।');
        return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
        alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।');
        return;
    }

    const selectedAcc = accounts[fromKey];

    if (selectedAcc.balance < amountVal) {
        alert(`পর্যাপ্ত ব্যালেন্স নেই! আপনার ${selectedAcc.name} ব্যালেন্স হল ${formatCurrency(selectedAcc.balance)}`);
        return;
    }

    // ব্যালেন্স বিয়োগ করা
    selectedAcc.balance -= amountVal;

    // নতুন লেনদেন তালিকায় যোগ করা
    transactions.unshift({
        title: 'টাকা ট্রান্সফার / সেন্ড মানি',
        channel: selectedAcc.name,
        account: accountNo,
        date: getCurrentDateTimeFormatted(),
        amount: amountVal,
        type: 'out'
    });

    updateDashboardUI();
    renderTransactions();
    closeModal('transferModal');

    // ইনপুট ফর্ম ক্লিয়ার করা
    document.getElementById('transferAccountInput').value = '';
    document.getElementById('transferAmountInput').value = '';

    alert(`সফলভাবে ${formatCurrency(amountVal)} পাঠানো হয়েছে (${accountNo}) নম্বরে!`);
}

// ফান্ড অ্যাড সাবমিট হলে কাজ করার ফাংশন
function handleAddMoneySubmit() {
    const toKey = document.getElementById('addToSelect').value;
    const accountNo = document.getElementById('addAccountInput').value.trim() || 'ক্যাশ ডিপোজিট';
    const amountVal = parseFloat(document.getElementById('addAmountInput').value);

    if (isNaN(amountVal) || amountVal <= 0) {
        alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।');
        return;
    }

    const selectedAcc = accounts[toKey];

    // ব্যালেন্স যোগ করা
    selectedAcc.balance += amountVal;

    // নতুন লেনদেন তালিকায় যোগ করা
    transactions.unshift({
        title: 'ফান্ড যুক্ত / ক্যাশ ইন',
        channel: selectedAcc.name,
        account: accountNo,
        date: getCurrentDateTimeFormatted(),
        amount: amountVal,
        type: 'in'
    });

    updateDashboardUI();
    renderTransactions();
    closeModal('addModal');

    // ইনপুট ফর্ম ক্লিয়ার করা
    document.getElementById('addAccountInput').value = '';
    document.getElementById('addAmountInput').value = '';

    alert(`সফলভাবে ${formatCurrency(amountVal)} যুক্ত করা হয়েছে!`);
}
