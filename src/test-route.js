// 简单的测试文件，用于诊断 Heroku 部署问题
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
