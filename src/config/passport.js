const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const { User } = require('../models');
const { logger } = require('./logger');

// 序列化用户
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// 反序列化用户
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth 策略
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_BASE_URL || 'https://www.web3hire.xyz/api'}/auth/google/callback`,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 查找或创建用户
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (!user) {
          // 创建新用户
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            profileImage: profile.photos[0]?.value,
            googleId: profile.id,
            role: 'USER'
          });
          logger.info(`Created new user via Google OAuth: ${user.email}`);
        } else if (!user.googleId) {
          // 更新现有用户的 Google ID
          user.googleId = profile.id;
          if (!user.profileImage && profile.photos[0]?.value) {
            user.profileImage = profile.photos[0].value;
          }
          await user.save();
          logger.info(`Updated existing user with Google OAuth: ${user.email}`);
        }
        
        return done(null, user);
      } catch (error) {
        logger.error(`Google OAuth error: ${error.message}`);
        return done(error, null);
      }
    }
  )
);

// Twitter OAuth 策略
passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: `${process.env.API_BASE_URL || 'https://www.web3hire.xyz/api'}/auth/twitter/callback`,
      includeEmail: true
    },
    async (token, tokenSecret, profile, done) => {
      try {
        // 查找或创建用户
        let user = await User.findOne({ twitterId: profile.id });
        
        if (!user && profile.emails && profile.emails[0]) {
          // 尝试通过电子邮件查找
          user = await User.findOne({ email: profile.emails[0].value });
        }
        
        if (!user) {
          // 创建新用户
          user = await User.create({
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            profileImage: profile.photos?.[0]?.value,
            twitterId: profile.id,
            role: 'USER'
          });
          logger.info(`Created new user via Twitter OAuth: ${user.name}`);
        } else if (!user.twitterId) {
          // 更新现有用户的 Twitter ID
          user.twitterId = profile.id;
          if (!user.profileImage && profile.photos?.[0]?.value) {
            user.profileImage = profile.photos[0].value;
          }
          await user.save();
          logger.info(`Updated existing user with Twitter OAuth: ${user.name}`);
        }
        
        return done(null, user);
      } catch (error) {
        logger.error(`Twitter OAuth error: ${error.message}`);
        return done(error, null);
      }
    }
  )
);

// Facebook OAuth 策略
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${process.env.API_BASE_URL || 'https://www.web3hire.xyz/api'}/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'photos', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 查找或创建用户
        let user = await User.findOne({ facebookId: profile.id });
        
        if (!user && profile.emails && profile.emails[0]) {
          // 尝试通过电子邮件查找
          user = await User.findOne({ email: profile.emails[0].value });
        }
        
        if (!user) {
          // 创建新用户
          user = await User.create({
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            profileImage: profile.photos?.[0]?.value,
            facebookId: profile.id,
            role: 'USER'
          });
          logger.info(`Created new user via Facebook OAuth: ${user.name}`);
        } else if (!user.facebookId) {
          // 更新现有用户的 Facebook ID
          user.facebookId = profile.id;
          if (!user.profileImage && profile.photos?.[0]?.value) {
            user.profileImage = profile.photos[0].value;
          }
          await user.save();
          logger.info(`Updated existing user with Facebook OAuth: ${user.name}`);
        }
        
        return done(null, user);
      } catch (error) {
        logger.error(`Facebook OAuth error: ${error.message}`);
        return done(error, null);
      }
    }
  )
);

// LinkedIn OAuth 策略
passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: `${process.env.API_BASE_URL || 'https://www.web3hire.xyz/api'}/auth/linkedin/callback`,
      scope: ['r_emailaddress', 'r_liteprofile']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 查找或创建用户
        let user = await User.findOne({ linkedinId: profile.id });
        
        if (!user && profile.emails && profile.emails[0]) {
          // 尝试通过电子邮件查找
          user = await User.findOne({ email: profile.emails[0].value });
        }
        
        if (!user) {
          // 创建新用户
          user = await User.create({
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            profileImage: profile.photos?.[0]?.value,
            linkedinId: profile.id,
            role: 'USER'
          });
          logger.info(`Created new user via LinkedIn OAuth: ${user.name}`);
        } else if (!user.linkedinId) {
          // 更新现有用户的 LinkedIn ID
          user.linkedinId = profile.id;
          if (!user.profileImage && profile.photos?.[0]?.value) {
            user.profileImage = profile.photos[0].value;
          }
          await user.save();
          logger.info(`Updated existing user with LinkedIn OAuth: ${user.name}`);
        }
        
        return done(null, user);
      } catch (error) {
        logger.error(`LinkedIn OAuth error: ${error.message}`);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
