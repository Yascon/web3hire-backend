// 简单的测试文件，用于诊断 Heroku 部署问题
const express = require('express');
const app = express();

// 添加一个简单的状态检查路由
app.get('/', (req, res) => {
  res.json({ 
    message: 'Web3Hire API is working!', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// 添加健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 确保我们监听正确的端口
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // 保持进程运行
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // 保持进程运行
});

module.exports = app; // 确保应用可以被导出
