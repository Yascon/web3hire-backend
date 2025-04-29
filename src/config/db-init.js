/**
 * 数据库初始化脚本
 * 创建必要的索引和初始数据
 */
const mongoose = require('mongoose');
const { User, Job, Task } = require('../models');
const { logger } = require('./logger');

/**
 * 创建数据库索引
 */
async function createIndexes() {
  try {
    logger.info('Creating database indexes...');
    
    // 检查集合是否存在，如果不存在则创建
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // 确保 User 集合存在
    if (!collectionNames.includes('users')) {
      logger.info('Creating users collection...');
      await mongoose.connection.db.createCollection('users');
    }
    
    // 确保 Job 集合存在
    if (!collectionNames.includes('jobs')) {
      logger.info('Creating jobs collection...');
      await mongoose.connection.db.createCollection('jobs');
    }
    
    // 确保 Task 集合存在
    if (!collectionNames.includes('tasks')) {
      logger.info('Creating tasks collection...');
      await mongoose.connection.db.createCollection('tasks');
    }
    
    // User索引
    try {
      await User.collection.createIndex({ walletAddress: 1 }, { unique: true, sparse: true });
      await User.collection.createIndex({ email: 1 }, { sparse: true });
      await User.collection.createIndex({ role: 1 });
      await User.collection.createIndex({ skills: 1 });
      logger.info('User indexes created successfully');
    } catch (err) {
      logger.warn(`Error creating User indexes: ${err.message}`);
    }
    
    // Job索引
    try {
      await Job.collection.createIndex({ employerId: 1 });
      await Job.collection.createIndex({ status: 1 });
      await Job.collection.createIndex({ createdAt: -1 });
      await Job.collection.createIndex(
        { title: 'text', description: 'text' },
        { weights: { title: 10, description: 5 } }
      );
      logger.info('Job indexes created successfully');
    } catch (err) {
      logger.warn(`Error creating Job indexes: ${err.message}`);
    }
    
    // Task索引
    try {
      await Task.collection.createIndex({ employerId: 1 });
      await Task.collection.createIndex({ status: 1 });
      await Task.collection.createIndex({ createdAt: -1 });
      await Task.collection.createIndex(
        { title: 'text', description: 'text' },
        { weights: { title: 10, description: 5 } }
      );
      logger.info('Task indexes created successfully');
    } catch (err) {
      logger.warn(`Error creating Task indexes: ${err.message}`);
    }
    
    logger.info('Database indexes setup completed');
  } catch (error) {
    logger.error(`Error setting up database indexes: ${error.message}`);
    // 不抛出错误，允许应用程序继续运行
  }
}

/**
 * 创建管理员用户（如果不存在）
 */
async function createAdminUser() {
  try {
    const adminWalletAddress = process.env.ADMIN_WALLET_ADDRESS;
    
    if (!adminWalletAddress) {
      logger.warn('ADMIN_WALLET_ADDRESS not set in environment variables');
      return;
    }
    
    const existingAdmin = await User.findOne({ walletAddress: adminWalletAddress });
    
    if (!existingAdmin) {
      logger.info(`Creating admin user with wallet address: ${adminWalletAddress}`);
      
      const adminUser = new User({
        walletAddress: adminWalletAddress,
        role: 'Admin',
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@web3hire.com',
        nonce: Math.floor(Math.random() * 1000000).toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await adminUser.save();
      logger.info('Admin user created successfully');
    } else {
      logger.info('Admin user already exists');
    }
  } catch (error) {
    logger.error(`Error creating admin user: ${error.message}`);
    // 不抛出错误，允许应用程序继续运行
  }
}

/**
 * 初始化数据库
 */
async function initializeDatabase() {
  try {
    // 创建索引
    await createIndexes();
    
    // 创建管理员用户
    await createAdminUser();
    
    logger.info('Database initialization completed successfully');
    return true;
  } catch (error) {
    logger.error(`Database initialization failed: ${error.message}`);
    // 不抛出错误，允许应用程序继续运行
    return false;
  }
}

module.exports = initializeDatabase;
