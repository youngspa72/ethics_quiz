// 관리자 비밀번호 (실제 사용 시 서버 측에서 처리해야 함)
const ADMIN_PASSWORD = "ethics2504";

// API 설정
const API_URL = 'http://localhost:3000/api';

// 점수 데이터 가져오기 (서버 또는 로컬 스토리지에서)
async function getScores() {
    try {
        console.log('서버에서 점수 데이터 가져오는 중...');
        const response = await fetch(`${API_URL}/scores`);
        if (!response.ok) {
            throw new Error('서버에서 점수를 가져오는데 실패했습니다.');
        }
        const scores = await response.json();
        console.log('서버에서 가져온 점수 데이터:', scores);
        return scores;
    } catch (error) {
        console.error('서버에서 점수 가져오기 실패:', error);
        // 서버에서 가져오기 실패 시 로컬 스토리지에서 가져오기
        console.log('로컬 스토리지에서 점수 데이터 가져오는 중...');
        const leaderboard = localStorage.getItem('quizLeaderboard');
        const localScores = leaderboard ? JSON.parse(leaderboard) : [];
        console.log('로컬 스토리지에서 가져온 점수 데이터:', localScores);
        return localScores;
    }
}

// JSON 형식으로 점수 데이터 다운로드
async function downloadScoresAsJSON() {
    const scores = await getScores();
    if (scores.length === 0) {
        alert('저장된 점수 데이터가 없습니다.');
        return;
    }
    
    const scoresJSON = JSON.stringify(scores, null, 2);
    const blob = new Blob([scoresJSON], { type: 'application/json' });
    saveAs(blob, `quiz_scores_${new Date().toISOString().slice(0, 10)}.json`);
}

// CSV 형식으로 점수 데이터 다운로드
async function downloadScoresAsCSV() {
    const scores = await getScores();
    if (scores.length === 0) {
        alert('저장된 점수 데이터가 없습니다.');
        return;
    }
    
    // CSV 헤더
    let csv = '소속팀명,사번,이름,점수,참여일,참여시간\n';
    
    // 각 점수를 CSV 행으로 변환
    scores.forEach(player => {
        csv += `${player.team || ''},${player.id || ''},${player.name || ''},${player.score || 0},${player.date || ''},${player.time || ''}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `quiz_scores_${new Date().toISOString().slice(0, 10)}.csv`);
}

// 모든 점수 초기화
async function resetAllScores() {
    if (confirm('정말로 모든 점수 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        try {
            // 서버 API 호출하여 점수 초기화
            const response = await fetch(`${API_URL}/scores`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('서버에서 점수 초기화에 실패했습니다.');
            }
            
            // 로컬 스토리지도 함께 초기화
            localStorage.removeItem('quizLeaderboard');
            
            alert('모든 점수 기록이 초기화되었습니다.');
            await displayAllScores(); // 점수 목록 업데이트
        } catch (error) {
            console.error('점수 초기화 실패:', error);
            alert('점수 초기화 중 오류가 발생했습니다: ' + error.message);
            
            // 서버 초기화 실패시 로컬 스토리지라도 초기화
            localStorage.removeItem('quizLeaderboard');
            await displayAllScores();
        }
    }
}

// 모든 점수 표시
async function displayAllScores() {
    const scores = await getScores();
    const scoresContainer = document.getElementById('all-scores');
    
    if (scores.length === 0) {
        scoresContainer.innerHTML = '<div class="no-scores">저장된 점수 데이터가 없습니다.</div>';
        return;
    }
    
    // 테이블 생성
    let tableHTML = `
        <table class="scores-table">
            <thead>
                <tr>
                    <th>순위</th>
                    <th>소속팀명</th>
                    <th>사번</th>
                    <th>이름</th>
                    <th>점수</th>
                    <th>참여일</th>
                    <th>참여시간</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // 점수 기준으로 정렬
    scores.sort((a, b) => b.score - a.score);
    
    // 각 점수를 테이블 행으로 변환
    scores.forEach((player, index) => {
        tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${player.team || ''}</td>
                <td>${player.id || ''}</td>
                <td>${player.name || ''}</td>
                <td>${player.score || 0}점</td>
                <td>${player.date || ''}</td>
                <td>${player.time || ''}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    scoresContainer.innerHTML = tableHTML;
}

// 관리자 패널 표시
function showAdminPanel() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
}

// 초기화 및 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    // 관리자 로그인 버튼
    document.getElementById('admin-login-btn').addEventListener('click', () => {
        const password = document.getElementById('admin-password').value;
        
        if (password === ADMIN_PASSWORD) {
            showAdminPanel();
        } else {
            alert('비밀번호가 올바르지 않습니다.');
        }
    });
    
    // 관리자 패널 버튼들
    document.getElementById('view-scores-btn').addEventListener('click', async () => {
        const scoresContainer = document.getElementById('scores-container');
        if (scoresContainer.classList.contains('hidden')) {
            document.getElementById('loading-indicator').classList.remove('hidden');
            scoresContainer.classList.remove('hidden');
            await displayAllScores();
            document.getElementById('loading-indicator').classList.add('hidden');
        } else {
            scoresContainer.classList.add('hidden');
        }
    });
    
    document.getElementById('download-json-btn').addEventListener('click', async () => {
        document.getElementById('loading-indicator').classList.remove('hidden');
        await downloadScoresAsJSON();
        document.getElementById('loading-indicator').classList.add('hidden');
    });
    
    document.getElementById('download-csv-btn').addEventListener('click', async () => {
        document.getElementById('loading-indicator').classList.remove('hidden');
        await downloadScoresAsCSV();
        document.getElementById('loading-indicator').classList.add('hidden');
    });
    
    document.getElementById('reset-scores-btn').addEventListener('click', resetAllScores);
    
    // 관리자 패스워드 입력 필드에서 엔터키 처리
    document.getElementById('admin-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('admin-login-btn').click();
        }
    });
}); 