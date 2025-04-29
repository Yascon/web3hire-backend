const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/user');

let mongoServer;

describe('User Model Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should create a user successfully', async () => {
    const userData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'Candidate',
      name: 'Test User',
      email: 'test@example.com',
      nonce: '123456',
      skills: ['Solidity', 'React', 'Node.js'],
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.walletAddress).toBe(userData.walletAddress);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.nonce).toBe(userData.nonce);
    expect(savedUser.skills).toEqual(expect.arrayContaining(userData.skills));
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  it('should require walletAddress field', async () => {
    const userData = {
      role: 'Candidate',
      name: 'Test User',
      email: 'test@example.com',
    };

    const user = new User(userData);
    let error;

    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.walletAddress).toBeDefined();
  });

  it('should not allow duplicate wallet addresses', async () => {
    const userData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'Candidate',
      name: 'Test User',
      email: 'test@example.com',
      nonce: '123456',
    };

    await new User(userData).save();
    
    const duplicateUser = new User(userData);
    let error;

    try {
      await duplicateUser.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error code
  });

  it('should validate role field', async () => {
    const userData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'InvalidRole', // Invalid role
      name: 'Test User',
      email: 'test@example.com',
      nonce: '123456',
    };

    const user = new User(userData);
    let error;

    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.role).toBeDefined();
  });
});
