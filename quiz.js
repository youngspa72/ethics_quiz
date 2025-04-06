// 퀴즈 데이터
let quizData = [];
let currentQuiz = 0;
let score = 0;
let timer;
let timeLeft = 60;
let lastAnswerTime = 0;
let playerInfo = {
    team: '',
    id: '',
    name: ''
};

// API 설정
const API_URL = 'http://localhost:3000/api';
// 서버 사용 여부 (true로 설정하면 서버 사용, false면 로컬 저장)
const USE_SERVER = true;

// 점수판 가져오기 (로컬 스토리지에서)
function getLocalLeaderboard() {
    const leaderboard = localStorage.getItem('quizLeaderboard');
    return leaderboard ? JSON.parse(leaderboard) : [];
}

// 로컬 파일로 점수 저장하기
function saveScoresToFile(scores) {
    // JSON 형식으로 변환
    const scoresJSON = JSON.stringify(scores, null, 2);
    const blob = new Blob([scoresJSON], { type: 'application/json' });
    saveAs(blob, 'quiz_scores.json');
}

// CSV 형식으로 점수 저장하기
function saveScoresToCSV(scores) {
    // CSV 헤더
    let csv = '소속팀명,사번,이름,점수,참여일,참여시간\n';
    
    // 각 점수를 CSV 행으로 변환
    scores.forEach(player => {
        csv += `${player.team},${player.id},${player.name},${player.score},${player.date || ''},${player.time || ''}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'quiz_scores.csv');
}

// 서버에서 점수판 가져오기
async function getLeaderboard() {
    if (USE_SERVER) {
        try {
            const response = await fetch(`${API_URL}/scores`);
            if (!response.ok) {
                throw new Error('서버에서 점수를 가져오는데 실패했습니다.');
            }
            return await response.json();
        } catch (error) {
            console.error('점수 데이터 로드 실패:', error);
            // 오류 발생 시 로컬 스토리지 백업 사용
            return getLocalLeaderboard();
        }
    } else {
        // 서버를 사용하지 않는 경우 로컬 스토리지에서 가져오기
        return getLocalLeaderboard();
    }
}

// 점수판 업데이트
async function updateLeaderboard(player) {
    if (USE_SERVER) {
        try {
            // 서버에 점수 저장
            const response = await fetch(`${API_URL}/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(player)
            });
            
            if (!response.ok) {
                throw new Error('서버에 점수를 저장하는데 실패했습니다.');
            }
            
            // 업데이트된 점수판 가져오기
            return await getLeaderboard();
        } catch (error) {
            console.error('점수 저장 실패:', error);
            return updateLocalLeaderboard(player);
        }
    } else {
        // 서버를 사용하지 않는 경우 로컬 스토리지에 저장
        return updateLocalLeaderboard(player);
    }
}

// 로컬 스토리지에 점수 업데이트
function updateLocalLeaderboard(player) {
    // 로컬 스토리지에서 기존 점수 가져오기
    let leaderboard = getLocalLeaderboard();
    
    // 이미 존재하는 플레이어인지 확인
    const existingPlayerIndex = leaderboard.findIndex(p => p.id === player.id);
    
    if (existingPlayerIndex !== -1) {
        // 기존 점수보다 높으면 업데이트
        if (leaderboard[existingPlayerIndex].score < player.score) {
            leaderboard[existingPlayerIndex] = player;
        }
    } else {
        // 새 플레이어 추가
        leaderboard.push(player);
    }
    
    // 점수 기준으로 정렬
    leaderboard.sort((a, b) => b.score - a.score);
    
    // 로컬 스토리지에 저장
    localStorage.setItem('quizLeaderboard', JSON.stringify(leaderboard));
    
    return leaderboard;
}

// 퀴즈 데이터 로드
async function loadQuizData() {
    try {
        // Quizes.md 파일에서 가져옴
        const response = await fetch('Quizes.md');
        const data = await response.text();
        
        // JSON 부분 추출 및 파싱
        const jsonMatch = data.match(/{[\s\S]*?quizes[\s\S]*?}/g);
        if (jsonMatch && jsonMatch.length > 0) {
            try {
                const jsonData = JSON.parse(jsonMatch[0]);
                if (jsonData && jsonData.quizes && jsonData.quizes.length > 0) {
                    console.log('퀴즈 데이터 로드 성공:', jsonData.quizes.length + '문제');
                    
                    // 퀴즈 데이터 섞기 (두 번 섞어서 더 무작위로)
                    quizData = shuffleArray(jsonData.quizes);
                    quizData = shuffleArray(quizData); // 한 번 더 섞기
                    
                    console.log('문제 순서가 무작위로 섞였습니다.');
                    return;
                }
            } catch (parseError) {
                console.error('JSON 파싱 오류:', parseError);
            }
        }
        
        // 파일에서 JSON을 추출하지 못한 경우, 문제를 직접 파싱해보기
        console.log('JSON 추출 실패, 직접 파싱 시도...');
        const quizesData = parseQuizesFromMarkdown(data);
        if (quizesData && quizesData.length > 0) {
            console.log('직접 파싱 성공:', quizesData.length + '문제');
            
            // 퀴즈 데이터 섞기 (두 번 섞어서 더 무작위로)
            quizData = shuffleArray(quizesData);
            quizData = shuffleArray(quizData); // 한 번 더 섞기
            
            console.log('문제 순서가 무작위로 섞였습니다.');
            return;
        }
        
        throw new Error('퀴즈 데이터를 파싱할 수 없습니다.');
    } catch (error) {
        console.error('퀴즈 데이터 로드 실패:', error);
        // 오류 발생 시 하드코딩된 예비 데이터 사용
        quizData = getBackupQuizData();
        console.log('백업 데이터 사용:', quizData.length + '문제');
        
        // 백업 데이터도 섞기 (두 번 섞어서 더 무작위로)
        quizData = shuffleArray(quizData);
        quizData = shuffleArray(quizData); // 한 번 더 섞기
        
        console.log('백업 문제 순서가 무작위로 섞였습니다.');
    }
}

// Markdown 파일에서 퀴즈 데이터를 직접 파싱하는 함수
function parseQuizesFromMarkdown(markdownText) {
    const quizes = [];
    
    // 정규식을 사용하여 문제 블록 찾기
    const quizBlocks = markdownText.match(/{\s*"id": \d+,[\s\S]*?"difficulty": "[^"]*"\s*}/g);
    
    if (!quizBlocks) return null;
    
    quizBlocks.forEach(block => {
        try {
            const quiz = JSON.parse(block);
            if (quiz.id && quiz.question && quiz.options && quiz.correctAnswer !== undefined) {
                quizes.push(quiz);
            }
        } catch (e) {
            console.warn('퀴즈 블록 파싱 실패:', e);
        }
    });
    
    return quizes.length > 0 ? quizes : null;
}

// 백업 퀴즈 데이터
function getBackupQuizData() {
    return [
        {
            id: 1,
            question: "구성원의 겸업/겸직/부업 활동을 위한 승인 절차로 올바른 것은?",
            options: [
                "소속 조직 리더 승인만으로 충분하다",
                "소속 조직 리더 승인 후 윤리경영 담당부서의 최종 승인이 필요하다",
                "HR 부서의 승인만 필요하다",
                "무조건 금지되며 예외는 없다"
            ],
            correctAnswer: 1,
            explanation: "모든 외부활동은 소속 조직 리더와 윤리경영 담당부서의 판단·승인을 받아야 합니다. 필요 시 HR 부서와 협의할 수 있습니다."
        },
        {
            id: 2,
            question: "외부강의·자문 활동 시 수령 가능한 강의료·거마비·심사료의 적정 한도는?",
            options: [
                "회당 50만원 이내",
                "회당 70만원 이내",
                "회당 100만원 이내",
                "제한 없음"
            ],
            correctAnswer: 1,
            explanation: "외부강의·자문 활동으로 강의료·거마비·심사료를 수령할 경우, 사회적 통념 수준(회당 70만원 이내)을 초과해서는 안 됩니다."
        },
        {
            id: 3,
            question: "다음 중 크리에이터 활동 시 준수해야 할 사항으로 적절하지 않은 것은?",
            options: [
                "업무시간 외 활동하기",
                "회사 자산(업무용 PC 등) 사용 금지",
                "회사 정보 노출 금지",
                "본인만 식별 가능하도록 회사명 노출하기"
            ],
            correctAnswer: 3,
            explanation: "크리에이터 활동 시에는 회사명 및 기밀사항 노출, 통신사·S기업 등 회사 유추 가능한 표현 사용을 금지해야 합니다."
        },
        {
            id: 4,
            question: "근태 관리 소홀 행위에 해당하지 않는 것은?",
            options: [
                "등록한 근무시간 미준수 후 시간 미조정",
                "재택근무 중 리더에게 보고하고 휴게시간을 등록한 후 병원 방문",
                "업무시간 중 개인 용무로 업무 소홀",
                "의무 근로 시간(10시~15시) 미준수"
            ],
            correctAnswer: 1,
            explanation: "재택근무를 포함한 근무시간 중 개인 용무로 일시적·단시간 자리를 비울 경우라도, 사전에 리더에게 보고하고 휴게시간을 등록하면 근태관리 소홀에 해당하지 않습니다."
        },
        {
            id: 5,
            question: "재택근무 장소로 인정되지 않는 곳은?",
            options: [
                "구성원의 거주지(자택)",
                "카페",
                "부모님 집",
                "위 모두 재택근무 장소로 인정되지 않음"
            ],
            correctAnswer: 1,
            explanation: "재택근무 장소는 구성원의 거주지(자택)만 해당합니다. 카페, 독서실, 공유오피스 등은 재택근무 장소가 아닙니다."
        },
        {
            id: 6,
            question: "직장 내 괴롭힘의 성립 요건으로 적절하지 않은 것은?",
            options: [
                "직장에서의 지위 또는 관계상의 우위를 이용할 것",
                "업무상 적정 범위를 넘을 것",
                "신체적·정신적 고통을 주거나 근무환경을 악화시키는 행위일 것",
                "행위자의 고의적인 가해 의도가 있을 것"
            ],
            correctAnswer: 3,
            explanation: "직장 내 괴롭힘은 행위자의 의도가 없더라도, 피해자가 고통을 겪거나 근무환경이 악화되었다면 직장 내 괴롭힘에 해당합니다. 고의적인 가해 의도는 필수 요건이 아닙니다."
        },
        {
            id: 7,
            question: "BP사 구성원에게 사용해야 하는 올바른 호칭은?",
            options: [
                "이름 + '님'",
                "직급 + '님'",
                "이름 + '씨'",
                "BP사의 호칭 체계를 따른다"
            ],
            correctAnswer: 0,
            explanation: "BP사 구성원을 대할 때는 상대방 지위나 관계상의 우위와 무관하게 기본 직장 예절을 지켜야 하며, 이름 + '님'으로 호칭해야 합니다."
        },
        {
            id: 8,
            question: "구성원 간 호칭으로 적절하지 않은 것은?",
            options: [
                "홍길동매니저님",
                "김부장님",
                "팀장님",
                "박서영님"
            ],
            correctAnswer: 1,
            explanation: "구성원 간 호칭은 정규직 구성원의 경우 '이름+매니저+님', 비정규직 구성원은 '이름+님', 직책자는 '직책명+님'으로 사용해야 합니다. '부장님'과 같은 호칭은 적절하지 않습니다."
        },
        {
            id: 9,
            question: "다음 중 직장 내 괴롭힘의 '관계의 우위'를 판단하는 요소가 아닌 것은?",
            options: [
                "수적 우위(개인 대 집단)",
                "근속연수 및 업무 역량",
                "노조·직장협의회 등 소속 여부",
                "부서 간 업무 협조 관계"
            ],
            correctAnswer: 3,
            explanation: "관계의 우위를 판단하는 요소는 수적 우위, 인적 속성(연령·성별·학벌 등), 근속연수·전문지식 등 업무 역량, 노조·직장협의회 소속 여부, 고용 형태, 감사·인사 등 영향력 있는 업무 담당 여부 등입니다. 부서 간 업무 협조 관계는 일반적으로 관계의 우위 판단 요소로 포함되지 않습니다."
        },
        {
            id: 10,
            question: "직장 내 성희롱 판단의 기준으로 가장 적절한 것은?",
            options: [
                "행위자의 의도가 있었는지 여부",
                "제3자가 보기에 성희롱으로 판단되는지 여부",
                "피해자가 성적 굴욕감이나 혐오감을 느꼈는지 여부",
                "명시적인 거부 의사 표현이 있었는지 여부"
            ],
            correctAnswer: 2,
            explanation: "성희롱은 행위자의 의도보다는 피해자가 성적 굴욕감이나 혐오감을 느꼈는지가 중요한 판단 기준이 됩니다. 이를 '성인지 감수성'에 기반한 판단이라고 합니다."
        }
    ];
}

// 배열 랜덤 섞기
function shuffleArray(array) {
    // 새 배열 생성하여 원본 배열 보존
    const newArray = [...array];
    
    // 현재 시간을 소수점까지 가져와서 난수 발생에 영향을 주도록 함
    const now = Date.now() / 1000;
    
    // 3회 반복하여 더 완벽하게 섞기
    for (let round = 0; round < 3; round++) {
        // Fisher-Yates 알고리즘으로 배열 섞기
        for (let i = newArray.length - 1; i > 0; i--) {
            // 난수 발생에 현재 시간과 라운드를 함께 사용하여 더 무작위적으로 만듦
            const randomFactor = Math.sin(now + i + round) * 10000;
            const j = Math.floor(Math.abs(randomFactor) % (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
    }
    
    console.log('퀴즈 순서가 섞였습니다.');
    return newArray;
}

// 타이머 시작
function startTimer() {
    timeLeft = 60;
    document.getElementById('timer').textContent = timeLeft;
    document.getElementById('timer-progress').style.width = '100%';
    
    // 기존 타이머가 있으면 먼저 제거
    if (timer) {
        clearInterval(timer);
    }
    
    timer = setInterval(() => {
        timeLeft--;
        
        // 타이머가 화면에 표시되는지 확인
        const timerElement = document.getElementById('timer');
        if (!timerElement) {
            console.error('타이머 요소를 찾을 수 없습니다. 타이머를 중지합니다.');
            clearInterval(timer);
            return;
        }
        
        timerElement.textContent = timeLeft;
        
        // 타이머 바 업데이트
        const percentage = (timeLeft / 60) * 100;
        const timerProgressElement = document.getElementById('timer-progress');
        if (timerProgressElement) {
            timerProgressElement.style.width = `${percentage}%`;
        }
        
        if (timeLeft <= 0) {
            console.log('타이머 종료: 퀴즈를 종료합니다.');
            clearInterval(timer);
            endQuiz();
        }
    }, 1000);
    
}

// 퀴즈 화면 표시
function showQuiz() {
    // 이전 퀴즈의 설명 숨기기
    document.getElementById('explanation').classList.add('hidden');
    
    const currentQuizData = quizData[currentQuiz];
    const questionElement = document.getElementById('question');
    const optionsElement = document.getElementById('options');
    
    // 질문 표시
    questionElement.textContent = currentQuizData.question;
    
    // 옵션 초기화 및 생성
    optionsElement.innerHTML = '';
    currentQuizData.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        optionElement.setAttribute('data-index', index);
        optionElement.addEventListener('click', checkAnswer);
        optionsElement.appendChild(optionElement);
    });
    
    // 마지막 답변 시간 초기화
    lastAnswerTime = Date.now();
}

// 답변 확인
function checkAnswer(e) {
    // 빠른 클릭 방지 (0.5초 이내 답변)
    const currentTime = Date.now();
    if (currentTime - lastAnswerTime < 500) {
        showWarningMessage();
        return;
    }
    
    const selectedOption = e.target;
    const selectedIndex = parseInt(selectedOption.getAttribute('data-index'));
    const currentQuizData = quizData[currentQuiz];
    
    // 모든 옵션에 disabled 클래스 추가
    document.querySelectorAll('.option').forEach(option => {
        option.classList.add('disabled');
    });
    
    // 정답 확인
    if (selectedIndex === currentQuizData.correctAnswer) {
        selectedOption.classList.add('correct');
        score += 10;
        document.getElementById('score').textContent = `점수: ${score}`;
    } else {
        selectedOption.classList.add('incorrect');
        // 정답 표시
        document.querySelectorAll('.option')[currentQuizData.correctAnswer].classList.add('correct');
        // 틀릴 경우 감점
        score = Math.max(0, score - 5); // 음수 방지
        document.getElementById('score').textContent = `점수: ${score}`;
    }
    
    // 설명 표시
    const explanationElement = document.getElementById('explanation');
    explanationElement.textContent = currentQuizData.explanation;
    explanationElement.classList.remove('hidden');
    
    // 다음 문제 준비
    currentQuiz++;
    console.log(`문제 ${currentQuiz}/${quizData.length} 완료`);
    
    // 모든 문제를 다 풀었는지 확인
    if (currentQuiz >= quizData.length) {
        console.log('모든 문제 완료, 3초 후 퀴즈를 종료합니다.');
        setTimeout(() => {
            endQuiz();
        }, 3000); // 마지막 문제 설명을 볼 수 있도록 3초 대기
    } else {
        // 다음 문제로 이동
        setTimeout(() => {
            showQuiz();
        }, 2000); // 2초 후 다음 문제로 이동
    }
}

// 경고 메시지 표시
function showWarningMessage() {
    const warningElement = document.getElementById('warning-message');
    warningElement.classList.remove('hidden');
    
    // 2초 후 메시지 사라짐
    setTimeout(() => {
        warningElement.classList.add('hidden');
    }, 2000);
}

// 현재 시간을 HH:mm:ss 형식으로 반환
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// 퀴즈 종료
async function endQuiz() {
    console.log('퀴즈 종료 함수 시작: 타이머를 중단하고 결과를 저장합니다.');
    clearInterval(timer);
    
    // 현재 시간 가져오기 (HH:mm:ss 형식)
    const currentTime = getCurrentTime();
    
    // 오늘 날짜 가져오기
    const today = new Date().toLocaleDateString();
    
    // 플레이어 정보 및 점수 저장
    const player = {
        team: playerInfo.team,
        id: playerInfo.id,
        name: playerInfo.name,
        score: score,
        date: today,
        time: currentTime
    };
    
    console.log('플레이어 정보:', player);
    
    // 로딩 표시
    const resultScreen = document.getElementById('result-screen');
    if (!resultScreen) {
        console.error('결과 화면 요소를 찾을 수 없습니다.');
        alert('오류가 발생했습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    resultScreen.innerHTML = '<div class="loading">점수를 저장 중입니다...</div>';
    
    const quizScreen = document.getElementById('quiz-screen');
    if (quizScreen) {
        quizScreen.classList.add('hidden');
    }
    resultScreen.classList.remove('hidden');
    
    try {
        // 점수판 업데이트
        console.log('점수판 업데이트 시작...');
        const leaderboard = await updateLeaderboard(player);
        console.log('점수판 업데이트 완료:', leaderboard);
        
        // 결과 화면 복원
        document.getElementById('result-screen').innerHTML = `
            <h1>퀴즈 결과</h1>
            <div id="player-result"></div>
            <h2>최고 점수 순위</h2>
            <div id="leaderboard"></div>
            <div class="button-container">
                <button id="restart-btn" class="btn">다시 시작하기</button>
            </div>
        `;
        
        // 다시 시작 버튼에 이벤트 리스너 다시 추가
        document.getElementById('restart-btn').addEventListener('click', restartQuiz);
        
        // 플레이어 결과 표시
        document.getElementById('player-result').innerHTML = `
            <p><strong>소속팀명:</strong> ${player.team}</p>
            <p><strong>사번:</strong> ${player.id}</p>
            <p><strong>이름:</strong> ${player.name}</p>
            <p><strong>점수:</strong> ${player.score}</p>
            <p><strong>참여일:</strong> ${player.date}</p>
            <p><strong>참여시간:</strong> ${player.time}</p>
        `;
        
        // 리더보드 표시 (상위 5명)
        const leaderboardElement = document.getElementById('leaderboard');
        leaderboardElement.innerHTML = '';
        
        const topFive = leaderboard.slice(0, 5);
        topFive.forEach((player, index) => {
            const leaderboardItem = document.createElement('div');
            leaderboardItem.classList.add('leaderboard-item');
            
            leaderboardItem.innerHTML = `
                <span class="rank">${index + 1}</span>
                <span class="player-name">${player.team} / ${player.name} (${player.id})</span>
                <span class="player-score">${player.score}점</span>
                <span class="player-time">${player.date || ''} ${player.time || ''}</span>
            `;
            
            leaderboardElement.appendChild(leaderboardItem);
        });
    } catch (error) {
        console.error('결과 화면 표시 오류:', error);
        console.error('오류 세부 정보:', error.message, error.stack);
        
        document.getElementById('result-screen').innerHTML = `
            <h1>퀴즈 결과</h1>
            <div class="error">점수 저장 중 오류가 발생했습니다.</div>
            <div id="player-result"></div>
            <div class="button-container">
                <button id="restart-btn" class="btn">다시 시작하기</button>
            </div>
        `;
        
        // 다시 시작 버튼에 이벤트 리스너 다시 추가
        document.getElementById('restart-btn').addEventListener('click', restartQuiz);
        
        // 플레이어 결과 표시
        document.getElementById('player-result').innerHTML = `
            <p><strong>소속팀명:</strong> ${player.team}</p>
            <p><strong>사번:</strong> ${player.id}</p>
            <p><strong>이름:</strong> ${player.name}</p>
            <p><strong>점수:</strong> ${player.score}</p>
            <p><strong>참여일:</strong> ${player.date}</p>
            <p><strong>참여시간:</strong> ${player.time}</p>
        `;
    }
}

// 퀴즈 다시 시작
function restartQuiz() {
    // 변수 초기화
    currentQuiz = 0;
    score = 0;
    
    // 퀴즈 데이터 다시 섞기 - 재시작할 때마다 세 번 섞기
    quizData = shuffleArray(quizData);
    quizData = shuffleArray(quizData);
    quizData = shuffleArray(quizData);
    console.log('퀴즈 재시작: 문제 순서가 다시 무작위로 섞였습니다.');
    
    // 시작 화면으로 돌아가기
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    
    // 입력창 초기화
    document.getElementById('team-name').value = '';
    document.getElementById('employee-id').value = '';
    document.getElementById('employee-name').value = '';
}

// 초기화 및 이벤트 리스너
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 퀴즈 데이터 로드 - 페이지 로드 시 데이터 로드 및 섞기
        await loadQuizData();
        
        // 도움말 모달 기능은 HTML에서 직접 처리합니다
        
        // 시작 버튼
        document.getElementById('start-btn').addEventListener('click', () => {
            const teamName = document.getElementById('team-name').value.trim();
            const employeeId = document.getElementById('employee-id').value.trim();
            const employeeName = document.getElementById('employee-name').value.trim();
            
            if (!teamName || !employeeId || !employeeName) {
                alert('소속팀명, 사번, 이름을 모두 입력해주세요.');
                return;
            }
            
            // 플레이어 정보 저장
            playerInfo.team = teamName;
            playerInfo.id = employeeId;
            playerInfo.name = employeeName;
            
            // 플레이어 정보 표시
            document.getElementById('player-info').textContent = `${teamName} / ${employeeName} (${employeeId})`;
            
            // 시작할 때마다 퀴즈 순서 다시 섞기 (3번 섞어서 완전히 랜덤하게)
            quizData = shuffleArray(quizData);
            quizData = shuffleArray(quizData); 
            quizData = shuffleArray(quizData);
            console.log('퀴즈 시작: 문제 순서가 무작위로 섞였습니다.');
            
            // 화면 전환
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('quiz-screen').classList.remove('hidden');
            
            // 타이머 시작
            startTimer();
            
            // 첫 문제 표시
            showQuiz();
        });
        
        // 다시 시작 버튼
        document.getElementById('restart-btn').addEventListener('click', restartQuiz);
    } catch (error) {
        console.error('초기화 오류:', error);
        document.body.innerHTML = `<div class="error-container">
            <h1>오류 발생</h1>
            <p>애플리케이션 초기화 중 오류가 발생했습니다.</p>
            <p>오류 메시지: ${error.message}</p>
            <button onclick="location.reload()">다시 시도</button>
        </div>`;
    }
});