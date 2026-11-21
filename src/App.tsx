import { useState, useEffect } from 'react';
import './App.css';

interface Question {
  id: number;
  question: string;
  options: string[];
}

interface Quiz {
  id: number;
  title: string;
  questions: Question[];
}

interface Submission {
  id: number;
  quizTitle: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  submittedAt: string;
}

const API_BASE = 'http://localhost:5000';

function App() {
  const [role, setRole] = useState<'teacher' | 'student'>('teacher');
  const [token, setToken] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [health, setHealth] = useState<any>(null);

  // Teacher Form State
  const [quizTitle, setQuizTitle] = useState('');
  const [qText, setQText] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctOpt, setCorrectOpt] = useState('0');
  const [createdQuestions, setCreatedQuestions] = useState<any[]>([]);
  const [scores, setScores] = useState<Submission[]>([]);

  // Student State
  const [studentName, setStudentName] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<{ [qId: number]: number }>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // 1. Fetch Health and Quizzes on Load
  useEffect(() => {
    fetchHealth();
    fetchQuizzes();
    loginUser('teacher', 'teacher123'); // Auto-login as teacher initially
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ status: 'OFFLINE', version: 'v1.0.0' });
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quizzes`);
      const data = await res.json();
      setQuizzes(data);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    }
  };

  const fetchScores = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/scores`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setScores(data);
    } catch (err) {
      console.error('Error fetching scores:', err);
    }
  };

  const loginUser = async (userRole: 'teacher' | 'student', pass: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userRole, password: pass })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setRole(userRole);
        if (userRole === 'teacher') fetchScores(data.token);
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  // Switch role handler
  const handleRoleSwitch = (newRole: 'teacher' | 'student') => {
    setRole(newRole);
    setQuizResult(null);
    setSelectedQuiz(null);
    if (newRole === 'teacher') {
      loginUser('teacher', 'teacher123');
    } else {
      loginUser('student', 'student123');
    }
  };

  // Add question to temporary list
  const handleAddQuestion = () => {
    if (!qText || !opt0 || !opt1 || !opt2 || !opt3) {
      alert('Please fill the question and all 4 options!');
      return;
    }
    const newQ = {
      question: qText,
      options: [opt0, opt1, opt2, opt3],
      correctAnswer: parseInt(correctOpt)
    };
    setCreatedQuestions([...createdQuestions, newQ]);
    // Reset form
    setQText('');
    setOpt0('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
  };

  // Teacher Publishes the Quiz
  const handlePublishQuiz = async () => {
    if (!quizTitle || createdQuestions.length === 0) {
      alert('Please enter a Quiz Title and add at least one question!');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: quizTitle,
          questions: createdQuestions
        })
      });

      if (res.ok) {
        alert('🎉 Quiz Published Successfully!');
        setQuizTitle('');
        setCreatedQuestions([]);
        fetchQuizzes();
      }
    } catch (err) {
      console.error('Publish error:', err);
    }
  };

  // Student Submits Quiz
  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;
    if (!studentName.trim()) {
      alert('Please enter your name first!');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${selectedQuiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          answers: studentAnswers
        })
      });
      const data = await res.json();
      setQuizResult(data.submission);
    } catch (err) {
      console.error('Submission error:', err);
    }
  };

  return (
    <div className="app-container">
      {/* Header with DevOps Health Badge */}
      <header className="header">
        <div className="logo-section">
          <h2>⚡ QuizOps Portal</h2>
          <span className="subtitle">Role-Based Microservice System</span>
        </div>
        <div className="health-badge">
          <span className="dot"></span>
          Backend: <strong>{health ? health.status : 'Connecting...'}</strong> |{' '}
          <code>{health ? health.version : 'v1.0.0'}</code>
        </div>
      </header>

      {/* Role Switcher Tabs */}
      <div className="role-switcher">
        <button
          className={role === 'teacher' ? 'active-tab' : ''}
          onClick={() => handleRoleSwitch('teacher')}
        >
          👩‍🏫 Teacher Dashboard
        </button>
        <button
          className={role === 'student' ? 'active-tab' : ''}
          onClick={() => handleRoleSwitch('student')}
        >
          👨‍🎓 Student Portal
        </button>
      </div>

      {/* ================= TEACHER VIEW ================= */}
      {role === 'teacher' && (
        <div className="dashboard-grid">
          <div className="card">
            <h3>📝 Create & Publish a New Quiz</h3>
            <div className="input-group">
              <label>Quiz Title / Subject:</label>
              <input
                type="text"
                placeholder="e.g. Python Basics, Math Trivia, World History"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
              />
            </div>

            <div className="question-creator">
              <h4>Add Question #{createdQuestions.length + 1}</h4>
              <input
                type="text"
                placeholder="Type question here..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />

              <div className="options-grid">
                <input
                  type="text"
                  placeholder="Option A"
                  value={opt0}
                  onChange={(e) => setOpt0(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Option B"
                  value={opt1}
                  onChange={(e) => setOpt1(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Option C"
                  value={opt2}
                  onChange={(e) => setOpt2(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Option D"
                  value={opt3}
                  onChange={(e) => setOpt3(e.target.value)}
                />
              </div>

              <div className="correct-select">
                <label>Select Correct Option:</label>
                <select value={correctOpt} onChange={(e) => setCorrectOpt(e.target.value)}>
                  <option value="0">Option A</option>
                  <option value="1">Option B</option>
                  <option value="2">Option C</option>
                  <option value="3">Option D</option>
                </select>
                <button type="button" className="btn-add" onClick={handleAddQuestion}>
                  + Add Question to Quiz
                </button>
              </div>
            </div>

            {createdQuestions.length > 0 && (
              <div className="preview-box">
                <h4>Questions in current draft ({createdQuestions.length}):</h4>
                <ul>
                  {createdQuestions.map((q, idx) => (
                    <li key={idx}>
                      <strong>Q{idx + 1}:</strong> {q.question} (Correct: Option {String.fromCharCode(65 + q.correctAnswer)})
                    </li>
                  ))}
                </ul>
                <button className="btn-publish" onClick={handlePublishQuiz}>
                  🚀 Publish Quiz to Students
                </button>
              </div>
            )}
          </div>

          {/* Student Submissions Table */}
          <div className="card">
            <h3>📊 Live Student Submissions</h3>
            {scores.length === 0 ? (
              <p className="empty-text">No student submissions yet. Attend a quiz as a student to see scores appear here!</p>
            ) : (
              <table className="score-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Quiz</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.studentName}</strong></td>
                      <td>{s.quizTitle}</td>
                      <td>{s.score} / {s.totalQuestions}</td>
                      <td>
                        <span className={`badge ${s.percentage >= 60 ? 'badge-pass' : 'badge-fail'}`}>
                          {s.percentage}%
                        </span>
                      </td>
                      <td>{s.submittedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ================= STUDENT VIEW ================= */}
      {role === 'student' && (
        <div className="student-container">
          {!selectedQuiz && (
            <div className="card">
              <h3>📚 Available Quizzes</h3>
              <p>Select any quiz published by your teacher:</p>
              <div className="quiz-list">
                {quizzes.map((q) => (
                  <div key={q.id} className="quiz-card">
                    <h4>{q.title}</h4>
                    <p>{q.questions.length} Questions</p>
                    <button
                      className="btn-attend"
                      onClick={() => {
                        setSelectedQuiz(q);
                        setStudentAnswers({});
                        setQuizResult(null);
                      }}
                    >
                      Attend Quiz →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedQuiz && !quizResult && (
            <div className="card active-quiz-box">
              <button className="btn-back" onClick={() => setSelectedQuiz(null)}>
                ← Back to Quizzes
              </button>
              <h3>{selectedQuiz.title}</h3>

              <div className="input-group">
                <label>Your Name:</label>
                <input
                  type="text"
                  placeholder="Enter your name..."
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>

              <div className="questions-list">
                {selectedQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="question-block">
                    <p className="q-title">
                      <strong>Question {idx + 1}:</strong> {q.question}
                    </p>
                    <div className="options-group">
                      {q.options.map((opt, optIdx) => (
                        <label key={optIdx} className="option-label">
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            value={optIdx}
                            checked={studentAnswers[q.id] === optIdx}
                            onChange={() =>
                              setStudentAnswers({ ...studentAnswers, [q.id]: optIdx })
                            }
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn-submit" onClick={handleSubmitQuiz}>
                Submit Answers & View Score
              </button>
            </div>
          )}

          {/* Result Score Card */}
          {quizResult && (
            <div className="card result-card">
              <h3>🎉 Quiz Completed!</h3>
              <h4>Congratulations, {quizResult.studentName}!</h4>
              <div className="score-circle">
                <span className="score-num">{quizResult.score} / {quizResult.totalQuestions}</span>
                <span className="score-pct">{quizResult.percentage}%</span>
              </div>
              <p>Your results have been automatically recorded in the Teacher Dashboard.</p>
              <button
                className="btn-attend"
                onClick={() => {
                  setQuizResult(null);
                  setSelectedQuiz(null);
                  fetchQuizzes();
                }}
              >
                Attend Another Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;