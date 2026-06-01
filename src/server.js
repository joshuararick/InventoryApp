require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PUBLIC = path.join(__dirname, '..', 'public');

app.use(express.json());
app.use(express.static(PUBLIC));

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC, 'landing.html')));
app.get('/app', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

app.use('/api/habits', require('./routes/habits'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/streaks', require('./routes/streaks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/chat', require('./routes/chat'));

app.use('/api/{*path}', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ai Army running on http://localhost:${PORT}`));
