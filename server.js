const express = require('express');
const app = express();
const cors = require('cors');

// 启用 CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// 基本路由
app.get('/', (req, res) => {
  res.json({
    message: 'Web3Hire API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'web3hire-api'
  });
});

// 模拟 API 端点 - 获取职位列表
app.get('/api/jobs', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, title: 'Senior Solidity Developer', company: 'Web3 Startup', location: 'Remote' },
      { id: 2, title: 'Frontend Developer', company: 'DeFi Protocol', location: 'Singapore' },
      { id: 3, title: 'Blockchain Engineer', company: 'NFT Marketplace', location: 'Berlin' }
    ]
  });
});

// 启动服务器
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});
