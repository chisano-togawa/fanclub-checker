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

// DOM要素の取得
const memberIdInput = document.getElementById('memberIdInput');
const checkButton = document.getElementById('checkButton');
const resultDiv = document.getElementById('result');
const dailyCountEl = document.getElementById('dailyCount');
const totalCountEl = document.getElementById('totalCount');

// 現在のモードを取得する関数
function getMode() {
    return document.querySelector('input[name="mode"]:checked').value;
}

// 今日の日付をYYYY-MM-DD形式で取得
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 配布状況をチェックするメイン関数
function checkMember(memberId) {
    if (!memberId) {
        alert("会員番号を入力してください。");
        return;
    }
    const mode = getMode();
    const dbRef = database.ref(`distribution/${mode}/${memberId}`);

    dbRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            // 配布済みの場合
            const data = snapshot.val();
            const distributedDate = new Date(data.timestamp).toLocaleString('ja-JP');
            resultDiv.innerHTML = `<p style="color: red;">【配布済み】</p><p>会員番号: ${memberId}</p><p>配布日時: ${distributedDate}</p>`;
            resultDiv.style.backgroundColor = '#ffdddd';
        } else {
            // 未配布の場合
            resultDiv.innerHTML = `<p style="color: green;">【未配布】</p><p>会員番号: ${memberId}</p><button id="distributeBtn">配布済みにする</button>`;
            resultDiv.style.backgroundColor = '#ddffdd';
            
            // 「配布済みにする」ボタンのイベントリスナーを設定
            document.getElementById('distributeBtn').onclick = () => {
                markAsDistributed(memberId);
            };
        }
    });
}

// 配布済みにマークする関数
function markAsDistributed(memberId) {
    const mode = getMode();
    const today = getTodayString();
    
    // 1. 配布記録を保存
    database.ref(`distribution/${mode}/${memberId}`).set({
        distributed: true,
        timestamp: new Date().toISOString()
    });

    // 2. 集計を更新 (トランザクション処理で安全に)
    const summaryRef = database.ref(`summary/${mode}`);
    summaryRef.transaction((currentData) => {
        if (currentData === null) {
            return { total: 1, daily: { [today]: 1 } };
        } else {
            currentData.total = (currentData.total || 0) + 1;
            if (!currentData.daily) {
                currentData.daily = {};
            }
            currentData.daily[today] = (currentData.daily[today] || 0) + 1;
            return currentData;
        }
    });

    resultDiv.innerHTML = `<p>会員番号: ${memberId} を配布済みにしました。</p>`;
    resultDiv.style.backgroundColor = '#e0e0e0';
}

// 集計データをリアルタイムで監視・表示する
function listenToSummary() {
    const mode = getMode();
    const today = getTodayString();
    const summaryRef = database.ref(`summary/${mode}`);
    
    summaryRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            totalCountEl.textContent = data.total || 0;
            dailyCountEl.textContent = (data.daily && data.daily[today]) ? data.daily[today] : 0;
        } else {
            totalCountEl.textContent = 0;
            dailyCountEl.textContent = 0;
        }
    });
}

// モードが変更されたら、集計のリスナーを切り替える
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
        // 既存のリスナーを停止
        database.ref(`summary/test`).off();
        database.ref(`summary/live`).off();
        // 新しいモードでリスナーを開始
        listenToSummary();
        // 結果表示をリセット
        resultDiv.innerHTML = '<p>ここに結果が表示されます</p>';
        resultDiv.style.backgroundColor = 'transparent';
    });
});


// QRコードリーダーの設定
const html5QrCode = new Html5Qrcode("qr-reader");
const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    // スキャン成功時の処理
    memberIdInput.value = decodedText;
    checkMember(decodedText);
    html5QrCode.stop().catch(err => console.error("QRリーダーの停止に失敗", err));
};
const config = { fps: 10, qrbox: { width: 250, height: 250 } };

// ページが読み込まれたらカメラを開始
html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
    .catch(err => console.log("QRコードのスキャンを開始できませんでした。カメラの許可を確認してください。"));


// ボタンと入力欄のイベント設定
checkButton.addEventListener('click', () => checkMember(memberIdInput.value.trim()));
memberIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkMember(memberIdInput.value.trim());
    }
});

// 初期状態でリスナーを開始
listenToSummary();