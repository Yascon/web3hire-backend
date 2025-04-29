require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const session = require('express-session');
const passport = require('./config/passport');
const connectDB = require('./config/db');
const { logger, requestLogger } = require('./config/logger');
const { typeDefs, resolvers } = require('./graphql');
const authRoutes = require('./routes/auth');
const applySecurityMiddleware = require('./middleware/security');

// 连接到 MongoDB 数据库
let dbConnection = null;

// 尝试连接数据库
const connectToDatabase = async () => {
  try {
    dbConnection = await connectDB();
    if (!dbConnection && process.env.NODE_ENV === 'production') {
      logger.error('在生产环境中无法连接到数据库，应用程序将退出');
      process.exit(1);
    } else if (!dbConnection) {
      logger.warn('无法连接到数据库，将使用模拟数据');
      // 在开发环境中，如果无法连接到数据库，可以尝试使用模拟数据
      const { connectMockDB } = require('./config/mock-db');
      connectMockDB();
    }
  } catch (err) {
    logger.error(`数据库连接错误: ${err.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// 连接数据库
connectToDatabase();

async function startServer() {
  try {
    logger.info('开始启动服务器...');
    
    // Create Express app
    const app = express();
    logger.debug('Express 应用创建成功');
    
    // 应用安全中间件
    applySecurityMiddleware(app);
    
    // 基本中间件
    app.use(express.json({ limit: '10kb' })); // 限制请求体大小
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));
    logger.debug('基本中间件应用成功');
    
    // 会话管理
    app.use(session({
      secret: process.env.SESSION_SECRET || 'web3hire_secret',
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24小时
      }
    }));
    logger.debug('会话管理配置成功');
    
    // 初始化 Passport
    app.use(passport.initialize());
    app.use(passport.session());
    logger.debug('Passport 初始化成功');
    
    // API 路由
    app.use('/api/auth', authRoutes);
    logger.debug('API 路由配置成功');
    
    // 健康检查端点
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    logger.debug('健康检查端点配置成功');
    
    // Apollo Server setup
    logger.debug('开始配置 Apollo Server...');
    logger.debug(`typeDefs: ${typeof typeDefs}, resolvers: ${typeof resolvers}`);
    
    try {
      // 检查 typeDefs 和 resolvers 是否正确
      if (!typeDefs) {
        throw new Error('typeDefs is undefined or null');
      }
      
      if (!resolvers) {
        throw new Error('resolvers is undefined or null');
      }
      
      logger.debug(`typeDefs content: ${JSON.stringify(typeDefs).substring(0, 100)}...`);
      logger.debug(`resolvers keys: ${Object.keys(resolvers).join(', ')}`);
      
      const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({ req }) => ({ 
          req
        }),
        formatError: (err) => {
          logger.error(`GraphQL 错误: ${err.message}`);
          return err;
        },
        debug: process.env.NODE_ENV !== 'production',
        introspection: true,
      });
      
      logger.debug('开始启动 Apollo Server...');
      await server.start();
      logger.debug('Apollo Server 启动成功');
      
      server.applyMiddleware({ app });
      logger.debug('Apollo Server 中间件应用成功');
    } catch (error) {
      logger.error(`Apollo Server 配置或启动失败: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });
    
    // Start server
    const PORT = process.env.PORT || 4000;
    const httpServer = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`GraphQL API available at http://localhost:${PORT}${server.graphqlPath}`);
      logger.info(`Health check endpoint: http://localhost:${PORT}/api/health`);
    });
    
    // 添加错误处理
    httpServer.on('error', (error) => {
      logger.error(`服务器启动错误: ${error.message}`);
      throw error;
    });
    
    return httpServer;
  } catch (error) {
    logger.error(`服务器启动失败: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

startServer().catch((err) => {
  logger.error(`Server error: ${err.message}`);
  process.exit(1);
});
