// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyBtH75a-FnCjDg-oNrbHMevujzRNm1t5TU",
  authDomain: "my-fanclub-system.firebaseapp.com",
  databaseURL: "https://my-fanclub-system-default-rtdb.firebaseio.com",
  projectId: "my-fanclub-system",
  storageBucket: "my-fanclub-system.firebasestorage.app",
  messagingSenderId: "814188795449",
  appId: "1:814188795449:web:b88161206776ff5455dfe8",
  measurementId: "G-22JXRK9NQE"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// URL パラメータ取得
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const staffName = decodeURIComponent(urlParams.get('staffName') || '不明');

// 必須情報のバリデーション
if (!mode || !staffName || (mode !== 'test' && mode !== 'live')) {
    alert('情報が不正です。トップページに戻ります。');
    window.location.href = 'index.html';
}

// HTML要素の参照
const pageTitle = document.getElementById('pageTitle');
const memberIdInput = document.getElementById('memberIdInput');
const checkButton = document.getElementById('checkButton');
const resultDiv = document.getElementById('result');
const dailyCountEl = document.getElementById('dailyCount');
const totalCountEl = document.getElementById('totalCount');
const startScanBtn = document.getElementById('startScanBtn');
const qrReaderDiv = document.getElementById('qr-reader');
const staffInfo = document.getElementById('staffInfo');
const toListLink = document.getElementById('toListLink');

// 状態管理変数
let lastCheckedId = '';
let isChecking = false;
let isScanning = false;
let html5QrCode; // ← ここで宣言だけ

// ページが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', function () {
    staffInfo.textContent = `担当: ${staffName}`;
    toListLink.href = `list.html?mode=${mode}&staff=${encodeURIComponent(staffName)}`;

    html5QrCode = new Html5Qrcode("qr-reader"); // ← ここで初期化！

    if (mode === 'test') {
        pageTitle.textContent = '特典チェッカー (テスト)';
    } else {
        pageTitle.textContent = '🚨 特典チェッカー (本番)';
    }

    listenToSummary();

    checkButton.addEventListener('click', () => checkMember(memberIdInput.value));
    memberIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkMember(memberIdInput.value);
    });

    startScanBtn.onclick = toggleScan;
});

// 会員番号をチェックする関数
function checkMember(memberId) {
    memberId = memberId.trim();
    if (!memberId) {
        alert("会員番号を入力またはスキャンしてください。");
        return;
    }
    if (isChecking) return;
    if (memberId === lastCheckedId) {
        alert('同じ会員番号が連続で入力されました。');
        return;
    }

    isChecking = true;
    lastCheckedId = memberId;

    const dbRef = database.ref(`distribution/${mode}/${memberId}`);
    dbRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const distributedDate = new Date(data.timestamp).toLocaleString('ja-JP');
            resultDiv.innerHTML = `<p style="color: var(--danger-color);">【配布済み】</p><p>会員番号: ${memberId}</p><p><small>配布日時: ${distributedDate}</small></p><p><small>担当: ${data.staff || '不明'}</small></p>`;
            resultDiv.style.backgroundColor = 'rgba(242, 139, 130, 0.1)';
        } else {
            resultDiv.innerHTML = `<p style="color: var(--success-color);">【未配布】</p><p>会員番号: ${memberId}</p><button id="distributeBtn" class="btn">この会員に配布する</button>`;
            resultDiv.style.backgroundColor = 'rgba(129, 201, 149, 0.1)';
            document.getElementById('distributeBtn').onclick = () => markAsDistributed(memberId);
        }
        setTimeout(() => {
            lastCheckedId = '';
            isChecking = false;
        }, 3000);
    }).catch(error => {
        console.error("Firebase Error:", error);
        alert("データベース接続に失敗しました。");
        isChecking = false;
    });
}

// 配布処理を行う関数
function markAsDistributed(memberId) {
    const today = new Date().toISOString().slice(0, 10);
    const record = {
        distributed: true,
        timestamp: new Date().toISOString(),
        staff: staffName
    };
    database.ref(`distribution/${mode}/${memberId}`).set(record);

    const summaryRef = database.ref(`summary/${mode}`);
    summaryRef.transaction((currentData) => {
        if (currentData === null) return { total: 1, daily: { [today]: 1 } };
        currentData.total = (currentData.total || 0) + 1;
        if (!currentData.daily) currentData.daily = {};
        currentData.daily[today] = (currentData.daily[today] || 0) + 1;
        return currentData;
    });

    resultDiv.innerHTML = `<p>会員番号: ${memberId} を配布済みにしました。</p>`;
    resultDiv.style.backgroundColor = 'rgba(255,255,255,0.05)';
}

// 配布数の監視
function listenToSummary() {
    const today = new Date().toISOString().slice(0, 10);
    const summaryRef = database.ref(`summary/${mode}`);
    summaryRef.on('value', (snapshot) => {
        const data = snapshot.val();
        totalCountEl.textContent = data?.total || 0;
        dailyCountEl.textContent = data?.daily?.[today] || 0;
    });
}

// QRコードが読み取られたときのコールバック
const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    if (isScanning) {
        memberIdInput.value = decodedText;
        html5QrCode.stop();
        isScanning = false;
        qrReaderDiv.style.display = 'none';
        startScanBtn.innerHTML = '<span class="icon">📷</span> QRスキャン開始';
        checkMember(decodedText);
    }
};

// QRコードスキャンの設定
const config = { fps: 10, qrbox: { width: 250, height: 250 } };

// スキャンの開始/停止
function toggleScan() {
    if (isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false;
            qrReaderDiv.style.display = 'none';
            startScanBtn.innerHTML = '<span class="icon">📷</span> QRスキャン開始';
        }).catch(err => {});
    } else {
        isScanning = true;
        qrReaderDiv.style.display = 'block';
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .catch(err => {
                alert("カメラを開始できません。カメラのアクセスを許可してください。");
                qrReaderDiv.style.display = 'none';
                isScanning = false;
            });
        startScanBtn.innerHTML = '<span class="icon">⏹️</span> スキャン停止';
    }
}
