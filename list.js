// =================================================
// 自分のFirebase設定に書き換える
// =================================================
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

// --- ここから下は編集不要です ---

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const urlParams = new URLSearchParams(window.location.search);
const staffName = urlParams.get('staff');

const tableBody = document.querySelector('#historyTable tbody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
let fullHistoryList = [];

document.addEventListener('DOMContentLoaded', () => {
    const backLink = document.getElementById('backToCheckLink');
    if (staffName) {
        backLink.href = `checker.html?staff=${staffName}`;
    } else {
        backLink.href = 'index.html';
    }

    const dbRef = database.ref('distribution/live');
    dbRef.once('value').then(snapshot => {
        const liveData = snapshot.val();
        if (!liveData) {
            tableBody.innerHTML = '<tr><td colspan="3">配布履歴はまだありません。</td></tr>';
            return;
        }

        for (const memberId in liveData) {
            fullHistoryList.push({
                id: memberId,
                timestamp: liveData[memberId].timestamp,
                staff: liveData[memberId].staff || '不明'
            });
        }

        fullHistoryList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        let tableHTML = '';
        fullHistoryList.forEach(item => {
            tableHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${new Date(item.timestamp).toLocaleString('ja-JP')}</td>
                    <td>${item.staff}</td>
                </tr>
            `;
        });
        tableBody.innerHTML = tableHTML || '<tr><td colspan="3">配布履歴はまだありません。</td></tr>';
    }).catch(error => {
        console.error("Firebase Error:", error);
        tableBody.innerHTML = '<tr><td colspan="3">履歴の読み込みに失敗しました。</td></tr>';
    });
});

function exportToCSV() {
    if (fullHistoryList.length === 0) {
        alert('エクスポートするデータがありません。');
        return;
    }
    
    let csvContent = "会員番号,配布日時,担当スタッフ\n";
    fullHistoryList.forEach(item => {
        const row = [
            `"${item.id}"`,
            `"${new Date(item.timestamp).toLocaleString('ja-JP')}"`,
            `"${item.staff}"`
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