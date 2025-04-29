require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const express = require("express");
const cors = require("cors");
const morgan = require('morgan');
const videoRoute = require('./src/route/videoRoute');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/videos', videoRoute());

// remove
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});


app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('🔥 Prisma disconnected. Server shutting down.');
  process.exit(0);
});

module.exports = app;
