// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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


// Firebaseの初期化
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// URLからモードを取得
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');

// モードが不正ならトップページに戻す
if (!mode || (mode !== 'test' && mode !== 'live')) {
    alert('モードが指定されていません。トップページに戻ります。');
    window.location.href = 'index.html';
}

// DOM要素の取得
const pageTitle = document.getElementById('pageTitle');
const memberIdInput = document.getElementById('memberIdInput');
const checkButton = document.getElementById('checkButton');
const resultDiv = document.getElementById('result');
const dailyCountEl = document.getElementById('dailyCount');
const totalCountEl = document.getElementById('totalCount');
const startScanBtn = document.getElementById('startScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const qrReaderDiv = document.getElementById('qr-reader');

// 誤操作防止用の変数
let lastCheckedId = '';
let isChecking = false; // チェック処理中のフラグ

// ページの初期設定
document.addEventListener('DOMContentLoaded', () => {
    if (mode === 'test') {
        pageTitle.textContent = '特典チェッカー (テスト)';
        pageTitle.style.color = 'var(--test-color)';
    } else {
        pageTitle.textContent = '🚨 特典チェッカー (本番)';
        pageTitle.style.color = 'var(--danger-color)';
    }
    document.getElementById('backToCheckLink').href = `checker.html?mode=${mode}`;
    listenToSummary();
});


// 配布状況をチェックするメイン関数
function checkMember(memberId) {
    memberId = memberId.trim();
    if (!memberId) {
        alert("会員番号を入力またはスキャンしてください。");
        return;
    }
    // 短時間での連続チェックを防止
    if (isChecking) return;
    if (memberId === lastCheckedId) {
        alert('同じ会員番号が連続で入力されました。誤操作の可能性があります。');
        return;
    }

    isChecking = true;
    lastCheckedId = memberId;

    const dbRef = database.ref(`distribution/${mode}/${memberId}`);

    dbRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const distributedDate = new Date(data.timestamp).toLocaleString('ja-JP');
            resultDiv.innerHTML = `<p style="color: var(--danger-color);">【配布済み】</p><p>会員番号: ${memberId}</p><p><small>配布日時: ${distributedDate}</small></p>`;
            resultDiv.style.backgroundColor = '#ffebee';
        } else {
            resultDiv.innerHTML = `<p style="color: var(--success-color);">【未配布】</p><p>会員番号: ${memberId}</p><button id="distributeBtn" class="btn">配布済みにする</button>`;
            resultDiv.style.backgroundColor = '#e8f5e9';
            document.getElementById('distributeBtn').onclick = () => {
                markAsDistributed(memberId);
            };
        }
        // 3秒後に連続チェック防止を解除
        setTimeout(() => { lastCheckedId = ''; isChecking = false; }, 3000);
    }).catch(error => {
        console.error("Firebase Error:", error);
        alert("データベースへの接続に失敗しました。");
        isChecking = false;
    });
}

// 配布済みにマークする関数
function markAsDistributed(memberId) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    database.ref(`distribution/${mode}/${memberId}`).set({
        distributed: true,
        timestamp: new Date().toISOString()
    });

    const summaryRef = database.ref(`summary/${mode}`);
    summaryRef.transaction((currentData) => {
        if (currentData === null) {
            return { total: 1, daily: { [today]: 1 } };
        } else {
            currentData.total = (currentData.total || 0) + 1;
            if (!currentData.daily) currentData.daily = {};
            currentData.daily[today] = (currentData.daily[today] || 0) + 1;
            return currentData;
        }
    });

    resultDiv.innerHTML = `<p>会員番号: ${memberId} を配布済みにしました。</p>`;
    resultDiv.style.backgroundColor = '#e0e0e0';
}

// 集計データをリアルタイムで監視・表示する
function listenToSummary() {
    const today = new Date().toISOString().slice(0, 10);
    const summaryRef = database.ref(`summary/${mode}`);
    
    summaryRef.on('value', (snapshot) => {
        const data = snapshot.val();
        totalCountEl.textContent = data?.total || 0;
        dailyCountEl.textContent = data?.daily?.[today] || 0;
    });
}

// QRコードリーダーの設定
const html5QrCode = new Html5Qrcode("qr-reader");
const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    memberIdInput.value = decodedText;
    checkMember(decodedText);
    stopScan();
};
const config = { fps: 10, qrbox: { width: 250, height: 250 } };

function startScan() {
    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
        .then(() => {
            startScanBtn.style.display = 'none';
            stopScanBtn.style.display = 'block';
            qrReaderDiv.style.display = 'block';
        })
        .catch(err => {
            alert("カメラを開始できませんでした。カメラのアクセスを許可してください。");
        });
}

function stopScan() {
    html5QrCode.stop().then(() => {
        startScanBtn.style.display = 'block';
        stopScanBtn.style.display = 'none';
    }).catch(err => console.error("QRリーダーの停止に失敗", err));
}

// イベントリスナーの設定
checkButton.addEventListener('click', () => checkMember(memberIdInput.value));
memberIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkMember(memberIdInput.value);
});
startScanBtn.addEventListener('click', startScan);
stopScanBtn.addEventListener('click', stopScan);