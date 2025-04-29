const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { User } = require('../models');
const { logger } = require('../config/logger');

/**
 * 生成用户的 nonce
 * @param {string} walletAddress 钱包地址
 * @returns {Promise<string>} 返回 nonce 消息
 */
const getNonceForWallet = async (walletAddress) => {
  try {
    // 查找或创建用户
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      // 创建新用户
      user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        role: 'Candidate',
        name: `User-${walletAddress.substring(0, 6)}`
      });
      logger.info(`Created new user with wallet: ${walletAddress}`);
    }
    
    // 生成新的 nonce
    const nonce = Math.floor(Math.random() * 1000000).toString();
    user.nonce = nonce;
    await user.save();
    
    return `Please sign this message to verify your wallet ownership: ${nonce}`;
  } catch (error) {
    logger.error(`Error generating nonce: ${error.message}`);
    throw new Error(`Failed to generate nonce: ${error.message}`);
  }
};

/**
 * 验证签名
 * @param {string} walletAddress 钱包地址
 * @param {string} signature 签名
 * @returns {Promise<Object>} 返回令牌和用户信息
 */
const verifySignature = async (walletAddress, signature) => {
  try {
    // 获取用户和 nonce
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const message = `Please sign this message to verify your wallet ownership: ${user.nonce}`;
    
    // 验证签名
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Invalid signature');
    }
    
    // 生成新的 nonce 以防止重放攻击
    user.nonce = Math.floor(Math.random() * 1000000).toString();
    await user.save();
    
    // 生成 JWT 令牌
    const token = generateToken(user);
    
    return { token, user };
  } catch (error) {
    logger.error(`Signature verification error: ${error.message}`);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

/**
 * 验证 JWT 令牌
 * @param {string} token JWT 令牌
 * @returns {Object} 解码后的用户信息
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`);
    throw new Error(`Invalid token: ${error.message}`);
  }
};

/**
 * 生成 JWT 令牌
 * @param {Object} user 用户对象
 * @returns {string} JWT 令牌
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  getNonceForWallet,
  verifySignature,
  verifyToken,
  generateToken
};
