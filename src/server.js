const express = require('express');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/habits', require('./routes/habits'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/streaks', require('./routes/streaks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/agents', require('./routes/agents'));

app.use('/api/{*path}', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ai Army running on http://localhost:${PORT}`));
