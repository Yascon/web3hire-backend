const express = require('express');
const app = express();
const cors = require('cors');

// 启用 CORS
app.use(cors({
  origin: ['https://www.web3hire.xyz', 'https://web3hire-site.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// 添加 CORS 头部
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

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
      { 
        id: 1, 
        title: 'Senior Solidity Developer', 
        company: { name: 'Web3 Startup', logo: 'https://avatars.dicebear.com/api/identicon/web3startup.svg' }, 
        location: 'Remote',
        salary: '$120K - $150K',
        skills: ['Solidity', 'Ethereum', 'Smart Contracts'],
        remote: true,
        createdAt: new Date().toISOString()
      },
      { 
        id: 2, 
        title: 'Frontend Developer', 
        company: { name: 'DeFi Protocol', logo: 'https://avatars.dicebear.com/api/identicon/defiprotocol.svg' }, 
        location: 'Singapore',
        salary: '$90K - $120K',
        skills: ['React', 'Web3.js', 'TypeScript'],
        remote: false,
        createdAt: new Date().toISOString()
      },
      { 
        id: 3, 
        title: 'Blockchain Engineer', 
        company: { name: 'NFT Marketplace', logo: 'https://avatars.dicebear.com/api/identicon/nftmarketplace.svg' }, 
        location: 'Berlin',
        salary: '$100K - $130K',
        skills: ['Blockchain', 'NFT', 'JavaScript'],
        remote: false,
        createdAt: new Date().toISOString()
      }
    ]
  });
});

// 启动服务器
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});
