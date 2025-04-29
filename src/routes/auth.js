const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const logger = require('../config/logger');

// 生成 JWT 令牌的辅助函数
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

// Google OAuth 路由
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      // 重定向到前端，并在URL中包含令牌
      res.redirect(`${process.env.FRONTEND_URL || 'https://www.web3hire.xyz'}/oauth-callback?token=${token}`);
    } catch (error) {
      logger.error(`Error in Google OAuth callback: ${error.message}`);
      res.redirect(`${process.env.FRONTEND_URL || 'https://www.web3hire.xyz'}/login?error=auth_failed`);
    }
  }
);

// Twitter OAuth 路由
router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      res.redirect(`${process.env.FRONTEND_URL || 'https://www.web3hire.xyz'}/oauth-callback?token=${token}`);
    } catch (error) {
      logger.error(`Error in Twitter OAuth callback: ${error.message}`);
      res.redirect(`${process.env.FRONTEND_URL || 'https://www.web3hire.xyz'}/login?error=auth_failed`);
    }
  }
);

// Facebook OAuth 路由
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      res.redirect(`${process.env.FRONTEND_URL || 'https://www.web3hire.xyz'}/oauth-callback?token=${token}`);
    } catch (error) {
      logger.error(`Error in Facebook OAuth callback: ${error.message}`);
      res.redirect(`${process.env.FRONTEND_URL || 'https://www.web3hire.xyz'}/login?error=auth_failed`);
    }
  }
);

// LinkedIn OAuth 路由
router.get('/linkedin', passport.authenticate('linkedin'));

router.get('/linkedin/callback',
  passport.authenticate('linkedin', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      res.redirect(`${process.env.FRONTEND_URL || 'https://www.web3hire.xyz'}/oauth-callback?token=${token}`);
    } catch (error) {
      logger.error(`Error in LinkedIn OAuth callback: ${error.message}`);
      res.redirect(`${process.env.FRONTEND_URL || 'https://www.web3hire.xyz'}/login?error=auth_failed`);
    }
  }
);

module.exports = router;
