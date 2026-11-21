const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_devops_key_123';
const APP_VERSION = 'v1.0.0';
const START_TIME = Date.now();

// Middlewares
app.use(cors());
app.use(express.json());

// In-Memory Database
let quizzes = [
    {
        id: 1,
        title: 'DevOps & Cloud Fundamentals',
        questions: [
            {
                id: 1,
                question: 'Which tool is used for Infrastructure as Code (IaC)?',
                options: ['Terraform', 'Photoshop', 'GitLab Runner', 'Postman'],
                correctAnswer: 0
            },
            {
                id: 2,
                question: 'What is the primary benefit of Blue-Green deployment?',
                options: ['Lower cloud costs', 'Zero-downtime releases', 'Automatic code writing', 'Faster compile time'],
                correctAnswer: 1
            }
        ]
    }
];

let studentScores = [];

// ==========================================
// 1. DEVOPS OBSERVABILITY ENDPOINTS
// ==========================================

// Health check endpoint (Used by Docker & Kubernetes readiness probes)
app.get('/health', (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
    res.status(200).json({
        status: 'HEALTHY',
        version: APP_VERSION,
        uptime: `${uptimeSeconds}s`,
        timestamp: new Date().toISOString()
    });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        totalQuizzes: quizzes.length,
        totalSubmissions: studentScores.length
    });
});

// ==========================================
// 2. AUTHENTICATION & RBAC
// ==========================================

// Mock user credentials
const USERS = {
    teacher: { username: 'teacher', password: 'teacher123', role: 'teacher' },
    student: { username: 'student', password: 'student123', role: 'student' }
};

// Login Route
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = USERS[username];

    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Sign JWT Token with User Role
    const token = jwt.sign(
        { username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '2h' }
    );

    res.json({
        message: 'Login successful',
        token,
        user: { username: user.username, role: user.role }
    });
});

// Middleware to verify JWT & Roles
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token expired or invalid' });
        req.user = user;
        next();
    });
};

// ==========================================
// 3. QUIZ ROUTES
// ==========================================

// GET all quizzes (Available to both Teacher and Student)
app.get('/api/quizzes', (req, res) => {
    // Hide correct answers for students
    const sanitizedQuizzes = quizzes.map(q => ({
        id: q.id,
        title: q.title,
        questions: q.questions.map(quest => ({
            id: quest.id,
            question: quest.question,
            options: quest.options
        }))
    }));
    res.json(sanitizedQuizzes);
});

// POST a new quiz (TEACHER ONLY)
app.post('/api/quizzes', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Forbidden: Only teachers can create quizzes' });
    }

    const { title, questions } = req.body;
    if (!title || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Invalid quiz payload' });
    }

    const newQuiz = {
        id: quizzes.length + 1,
        title,
        questions: questions.map((q, idx) => ({
            id: idx + 1,
            question: q.question,
            options: q.options,
            correctAnswer: parseInt(q.correctAnswer)
        }))
    };

    quizzes.push(newQuiz);
    res.status(201).json({ message: 'Quiz created successfully', quiz: newQuiz });
});

// POST submit quiz answers (STUDENT)
app.post('/api/quizzes/:id/submit', (req, res) => {
    const quizId = parseInt(req.params.id);
    const { studentName, answers } = req.body; // answers is an object: { questionId: selectedOptionIndex }

    const targetQuiz = quizzes.find(q => q.id === quizId);
    if (!targetQuiz) return res.status(404).json({ error: 'Quiz not found' });

    let score = 0;
    targetQuiz.questions.forEach(q => {
        if (answers && answers[q.id] === q.correctAnswer) {
            score += 1;
        }
    });

    const submission = {
        id: studentScores.length + 1,
        quizId,
        quizTitle: targetQuiz.title,
        studentName: studentName || 'Anonymous Student',
        score,
        totalQuestions: targetQuiz.questions.length,
        percentage: Math.round((score / targetQuiz.questions.length) * 100),
        submittedAt: new Date().toLocaleTimeString()
    };

    studentScores.push(submission);
    res.json({ message: 'Quiz submitted successfully', submission });
});

// GET all scores (TEACHER ONLY)
app.get('/api/scores', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Forbidden: Only teachers can view all scores' });
    }
    res.json(studentScores);
});

// Start Server
app.listen(PORT, () => {
    console.log(`[QuizOps Server] Running on http://localhost:${PORT}`);
    console.log(`[Health Probe] http://localhost:${PORT}/health`);
});