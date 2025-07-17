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
const tableBody = document.querySelector('#historyTable tbody');

// 履歴データを読み込んで表示する
document.addEventListener('DOMContentLoaded', () => {
    const dbRef = database.ref('distribution');
    
    dbRef.once('value').then(snapshot => {
        const allData = snapshot.val();
        if (!allData) {
            tableBody.innerHTML = '<tr><td colspan="3">配布履歴はまだありません。</td></tr>';
            return;
        }

        const historyList = [];
        // testモードとliveモードのデータを集める
        for (const mode in allData) {
            const modeData = allData[mode];
            for (const memberId in modeData) {
                historyList.push({
                    id: memberId,
                    timestamp: modeData[memberId].timestamp,
                    mode: mode
                });
            }
        }

        // 日付が新しい順に並び替え
        historyList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // テーブルを生成
        let tableHTML = '';
        historyList.forEach(item => {
            const date = new Date(item.timestamp).toLocaleString('ja-JP');
            const modeText = item.mode === 'live' ? '本番' : 'テスト';
            tableHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${date}</td>
                    <td>${modeText}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = tableHTML || '<tr><td colspan="3">配布履歴はまだありません。</td></tr>';

    }).catch(error => {
        console.error("Firebase Error:", error);
        tableBody.innerHTML = '<tr><td colspan="3">履歴の読み込みに失敗しました。</td></tr>';
    });
});