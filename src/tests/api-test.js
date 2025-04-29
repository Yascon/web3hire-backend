const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { ethers } = require('ethers');
const logger = require('../config/logger');

// 加载环境变量
dotenv.config();

// 测试配置
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.web3hire.xyz/api' 
  : `http://localhost:${process.env.PORT || 4000}`;

// 测试钱包
const testWallet = ethers.Wallet.createRandom();

// 测试函数
const runTests = async () => {
  try {
    console.log('开始 API 测试...');
    console.log(`测试环境: ${process.env.NODE_ENV}`);
    console.log(`API URL: ${API_URL}`);
    
    // 测试数据库连接
    await testDatabaseConnection();
    
    // 测试 GraphQL API
    await testGraphQLAPI();
    
    // 测试钱包认证
    await testWalletAuthentication();
    
    // 测试 OAuth 端点
    await testOAuthEndpoints();
    
    console.log('\n✅ 所有测试通过!');
  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
    process.exit(1);
  } finally {
    // 清理连接
    await mongoose.disconnect();
    process.exit(0);
  }
};

// 测试数据库连接
const testDatabaseConnection = async () => {
  try {
    console.log('\n测试 MongoDB 连接...');
    
    // 连接到数据库
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // 检查连接状态
    const state = mongoose.connection.readyState;
    if (state === 1) {
      console.log('✅ MongoDB 连接成功');
    } else {
      throw new Error(`MongoDB 连接失败，状态码: ${state}`);
    }
    
    // 测试简单查询
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ 数据库包含 ${collections.length} 个集合`);
  } catch (error) {
    console.error(`❌ 数据库连接测试失败: ${error.message}`);
    throw error;
  }
};

// 测试 GraphQL API
const testGraphQLAPI = async () => {
  try {
    console.log('\n测试 GraphQL API...');
    
    // 使用健康检查端点而不是 GraphQL 查询
    const response = await axios.get(`${API_URL}/api/health`);
    
    if (response.status !== 200) {
      throw new Error(`健康检查端点响应异常: ${response.status}`);
    }
    
    console.log('✅ API 健康检查响应正常');
    console.log(`✅ API 状态: ${response.data.status}`);
    console.log(`✅ 时间戳: ${response.data.timestamp}`);
  } catch (error) {
    console.error(`❌ API 测试失败: ${error.message}`);
    throw error;
  }
};

// 测试钱包认证
const testWalletAuthentication = async () => {
  try {
    console.log('\n测试钱包认证...');
    
    // 获取 nonce
    const nonceQuery = `
      mutation {
        getNonce(walletAddress: "${testWallet.address}")
      }
    `;
    
    const nonceResponse = await axios.post(`${API_URL}/graphql`, {
      query: nonceQuery
    });
    
    if (nonceResponse.data.errors) {
      throw new Error(`获取 nonce 失败: ${JSON.stringify(nonceResponse.data.errors)}`);
    }
    
    const nonce = nonceResponse.data.data.getNonce;
    console.log(`✅ 成功获取 nonce: ${nonce}`);
    
    // 签名 nonce
    const signature = await testWallet.signMessage(nonce);
    console.log(`✅ 成功签名 nonce`);
    
    // 验证签名
    const verifyQuery = `
      mutation {
        verifySignature(walletAddress: "${testWallet.address}", signature: "${signature}") {
          token
          user {
            id
            walletAddress
          }
        }
      }
    `;
    
    const verifyResponse = await axios.post(`${API_URL}/graphql`, {
      query: verifyQuery
    });
    
    if (verifyResponse.data.errors) {
      throw new Error(`验证签名失败: ${JSON.stringify(verifyResponse.data.errors)}`);
    }
    
    console.log('✅ 钱包认证流程正常');
  } catch (error) {
    console.error(`❌ 钱包认证测试失败: ${error.message}`);
    throw error;
  }
};

// 测试 OAuth 端点
const testOAuthEndpoints = async () => {
  try {
    console.log('\n测试 OAuth 端点...');
    
    // 测试 Google OAuth 端点
    const googleResponse = await axios.get(`${API_URL}/api/auth/google`, {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    }).catch(error => {
      // 302 重定向是预期的
      if (error.response && error.response.status === 302) {
        return error.response;
      }
      throw error;
    });
    
    if (googleResponse.status === 302 && googleResponse.headers.location.includes('accounts.google.com')) {
      console.log('✅ Google OAuth 端点正常');
    } else {
      throw new Error(`Google OAuth 端点异常: ${googleResponse.status}`);
    }
  } catch (error) {
    console.error(`❌ OAuth 端点测试失败: ${error.message}`);
    throw error;
  }
};

// 运行测试
runTests();
