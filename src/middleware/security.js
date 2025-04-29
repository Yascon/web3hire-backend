const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const { logger } = require('../config/logger');

// 配置 CORS 选项
const corsOptions = {
  origin: [
    'https://www.web3hire.xyz',
    'https://admin.web3hire.xyz',
    // 开发环境
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24小时
};

// 配置速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP在windowMs内最多100个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: '请求过于频繁，请稍后再试',
  handler: (req, res, next, options) => {
    logger.warn(`速率限制超出: ${req.ip}`);
    res.status(options.statusCode).json({
      status: 'error',
      message: options.message
    });
  }
});

// 应用安全中间件
const applySecurityMiddleware = (app) => {
  // 使用 Helmet 设置各种 HTTP 头
  app.use(helmet());
  
  // 启用 CORS
  app.use(cors(corsOptions));
  
  // 应用速率限制
  app.use('/api/', limiter);
  
  // 防止 XSS 攻击
  app.use(xss());
  
  // 防止 HTTP 参数污染
  app.use(hpp());
  
  // 添加安全日志
  app.use((req, res, next) => {
    // 记录可疑请求
    const suspiciousPatterns = [
      'eval\\(', 'script>', '<script', 'javascript:', 'onerror=', 'onload=',
      'SELECT.*FROM', 'INSERT.*INTO', 'DELETE.*FROM', 'DROP.*TABLE',
      '\\.\\.\\/\\.\\.\\/\\.\\.\\/\\.\\.\\/'
    ];
    
    const reqUrl = req.url.toLowerCase();
    const reqBody = req.body ? JSON.stringify(req.body).toLowerCase() : '';
    
    for (const pattern of suspiciousPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(reqUrl) || regex.test(reqBody)) {
        logger.warn(`可疑请求检测: ${req.ip}, URL: ${req.url}`);
        break;
      }
    }
    
    next();
  });
  
  logger.info('安全中间件已应用');
};

module.exports = applySecurityMiddleware;
