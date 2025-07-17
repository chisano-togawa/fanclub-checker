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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const staffName = urlParams.get('staff');

const tableBody = document.querySelector('#historyTable tbody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
let fullHistoryList = [];

document.addEventListener('DOMContentLoaded', () => {
    // チェッカーページに戻るリンクを設定
    const backLink = document.getElementById('backToCheckLink');
    if (mode && staffName) {
        backLink.href = `checker.html?mode=${mode}&staff=${staffName}`;
    } else {
        backLink.href = 'index.html'; // Fallback
    }

    const dbRef = database.ref('distribution');
    dbRef.once('value').then(snapshot => {
        const allData = snapshot.val();
        if (!allData) {
            tableBody.innerHTML = '<tr><td colspan="4">配布履歴はまだありません。</td></tr>';
            return;
        }

        for (const mode in allData) {
            const modeData = allData[mode];
            for (const memberId in modeData) {
                fullHistoryList.push({
                    id: memberId,
                    timestamp: modeData[memberId].timestamp,
                    staff: modeData[memberId].staff || '不明',
                    mode: mode
                });
            }
        }

        fullHistoryList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        let tableHTML = '';
        fullHistoryList.forEach(item => {
            tableHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${new Date(item.timestamp).toLocaleString('ja-JP')}</td>
                    <td>${item.staff}</td>
                    <td>${item.mode === 'live' ? '本番' : 'テスト'}</td>
                </tr>
            `;
        });
        tableBody.innerHTML = tableHTML || '<tr><td colspan="4">配布履歴はまだありません。</td></tr>';
    }).catch(error => {
        console.error("Firebase Error:", error);
        tableBody.innerHTML = '<tr><td colspan="4">履歴の読み込みに失敗しました。</td></tr>';
    });
});

function exportToCSV() {
    if (fullHistoryList.length === 0) {
        alert('エクスポートするデータがありません。');
        return;
    }
    
    let csvContent = "会員番号,配布日時,担当スタッフ,モード\n";
    fullHistoryList.forEach(item => {
        const row = [
            `"${item.id}"`,
            `"${new Date(item.timestamp).toLocaleString('ja-JP')}"`,
            `"${item.staff}"`,
            `"${item.mode === 'live' ? '本番' : 'テスト'}"`
        ].join(",");
        csvContent += row + "\n";
    });

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `配布履歴_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

exportCsvBtn.addEventListener('click', exportToCSV);