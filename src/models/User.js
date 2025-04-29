const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['Employer', 'Candidate', 'Admin'],
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  resumeIpfsHash: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    trim: true
  },
  socialLinks: {
    github: String,
    twitter: String,
    linkedin: String,
    website: String
  },
  // 社交媒体登录 ID
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  twitterId: {
    type: String,
    sparse: true,
    unique: true
  },
  facebookId: {
    type: String,
    sparse: true,
    unique: true
  },
  linkedinId: {
    type: String,
    sparse: true,
    unique: true
  },
  nonce: {
    type: String,
    default: () => Math.floor(Math.random() * 1000000).toString()
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
