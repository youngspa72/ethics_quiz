const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// 서버 시작 시 scores.json 파일이 없으면 생성
if (!fs.existsSync(SCORES_FILE)) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify([]));
}

// 점수 가져오기 API
app.get('/api/scores', (req, res) => {
  try {
    const data = fs.readFileSync(SCORES_FILE, 'utf8');
    const scores = JSON.parse(data);
    res.json(scores);
  } catch (error) {
    console.error('점수 가져오기 오류:', error);
    res.status(500).json({ error: '점수를 가져오는 중 오류가 발생했습니다.' });
  }
});

// 점수 저장하기 API
app.post('/api/scores', (req, res) => {
  try {
    const newScore = req.body;
    
    // 유효성 검사
    if (!newScore.team || !newScore.id || !newScore.name || newScore.score === undefined) {
      return res.status(400).json({ error: '유효하지 않은 데이터입니다.' });
    }
    
    // 파일에서 기존 점수 데이터 읽기
    const data = fs.readFileSync(SCORES_FILE, 'utf8');
    let scores = JSON.parse(data);
    
    // 이미 존재하는 플레이어인지 확인
    const existingPlayerIndex = scores.findIndex(p => p.id === newScore.id);
    
    if (existingPlayerIndex !== -1) {
      // 기존 점수보다 높으면 업데이트
      if (scores[existingPlayerIndex].score < newScore.score) {
        scores[existingPlayerIndex] = newScore;
      }
    } else {
      // 새 플레이어 추가
      scores.push(newScore);
    }
    
    // 점수 기준으로 정렬
    scores.sort((a, b) => b.score - a.score);
    
    // 파일에 저장
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
    
    res.json({ success: true, message: '점수가 저장되었습니다.' });
  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ error: '점수를 저장하는 중 오류가 발생했습니다.' });
  }
});

// 점수 초기화 API
app.delete('/api/scores', (req, res) => {
  try {
    // 빈 배열로 점수 초기화
    fs.writeFileSync(SCORES_FILE, JSON.stringify([]));
    console.log('모든 점수가 초기화되었습니다.');
    res.json({ success: true, message: '모든 점수가 초기화되었습니다.' });
  } catch (error) {
    console.error('점수 초기화 오류:', error);
    res.status(500).json({ error: '점수를 초기화하는 중 오류가 발생했습니다.' });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
}); 