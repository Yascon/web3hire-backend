const mongoose = require('mongoose');
const { logger } = require('./logger');
const initializeDatabase = require('./db-init');

const connectDB = async () => {
  try {
    // 检查环境变量
    if (!process.env.MONGODB_URI) {
      logger.error('MONGODB_URI environment variable is not set');
      return null;
    }
    
    // 连接数据库
    logger.info(`Connecting to MongoDB: ${process.env.MONGODB_URI.split('@')[1]}`);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 秒超时
      socketTimeoutMS: 45000, // 45 秒超时
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // 设置连接错误处理
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected, attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });
    
    // 初始化数据库（创建索引和初始数据）
    await initializeDatabase();
    
    return conn;
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    
    // 在开发环境中不退出进程
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    return null;
  }
};

module.exports = connectDB;
