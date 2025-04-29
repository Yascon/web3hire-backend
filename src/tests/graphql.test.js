const { ApolloServer } = require('apollo-server-express');
const { typeDefs } = require('../graphql/schema');
const { resolvers } = require('../graphql/resolvers');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User, Job, Task } = require('../models');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

// 创建内存数据库用于测试
let mongoServer;

// 测试用户数据
const testWalletAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
const testEmployerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const testCandidateAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

// 创建测试服务器
const createTestServer = () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // 模拟认证上下文
      const token = req?.headers?.authorization?.split(' ')[1] || '';
      let user = null;
      
      if (token) {
        try {
          user = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
        } catch (error) {
          console.error('Invalid token');
        }
      }
      
      return { user };
    },
  });
  
  return server;
};

// 生成测试用 JWT 令牌
const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, walletAddress: user.walletAddress, role: user.role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
};

describe('GraphQL API Tests', () => {
  let server;
  let adminUser, employerUser, candidateUser;
  let adminToken, employerToken, candidateToken;
  
  beforeAll(async () => {
    // 启动内存 MongoDB 服务器
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // 创建测试用户
    adminUser = await User.create({
      walletAddress: testWalletAddress,
      role: 'Admin',
      name: 'Admin User',
      email: 'admin@web3hire.com',
      nonce: '123456',
    });
    
    employerUser = await User.create({
      walletAddress: testEmployerAddress,
      role: 'Employer',
      name: 'Test Employer',
      email: 'employer@example.com',
      nonce: '234567',
    });
    
    candidateUser = await User.create({
      walletAddress: testCandidateAddress,
      role: 'Candidate',
      name: 'Test Candidate',
      email: 'candidate@example.com',
      nonce: '345678',
      skills: ['Solidity', 'React', 'Node.js'],
    });
    
    // 生成测试令牌
    adminToken = generateTestToken(adminUser);
    employerToken = generateTestToken(employerUser);
    candidateToken = generateTestToken(candidateUser);
    
    // 创建测试服务器
    server = createTestServer();
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  describe('Authentication', () => {
    it('should generate a nonce for a wallet address', async () => {
      const GET_NONCE = `
        mutation GetNonce($walletAddress: String!) {
          getNonce(walletAddress: $walletAddress)
        }
      `;
      
      const result = await server.executeOperation({
        query: GET_NONCE,
        variables: { walletAddress: '0x1234567890123456789012345678901234567890' },
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.getNonce).toBeDefined();
      expect(typeof result.data.getNonce).toBe('string');
    });
    
    // 注意：验证签名测试需要实际的钱包签名，这里仅作为示例
    it('should verify signature and return token', async () => {
      // 在实际测试中，这需要使用真实的钱包签名
      // 这里仅作为示例框架
      const VERIFY_SIGNATURE = `
        mutation VerifySignature($walletAddress: String!, $signature: String!) {
          verifySignature(walletAddress: $walletAddress, signature: $signature) {
            token
            user {
              id
              walletAddress
              role
            }
          }
        }
      `;
      
      // 在实际测试中，这里需要使用真实签名
      // 这里仅作为示例，实际测试会失败
      const mockSignature = '0x1234567890';
      
      // 注意：这个测试在没有真实签名的情况下会失败
      // 仅作为示例框架
      const result = await server.executeOperation({
        query: VERIFY_SIGNATURE,
        variables: { 
          walletAddress: testWalletAddress,
          signature: mockSignature 
        },
      });
      
      // 这里我们期望失败，因为签名是假的
      expect(result.errors).toBeDefined();
    });
  });
  
  describe('User Operations', () => {
    it('should get user profile', async () => {
      const GET_USER = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            walletAddress
            name
            email
            role
          }
        }
      `;
      
      const result = await server.executeOperation({
        query: GET_USER,
        variables: { id: adminUser._id.toString() },
      }, {
        req: {
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        },
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.user).toBeDefined();
      expect(result.data.user.walletAddress).toBe(testWalletAddress);
      expect(result.data.user.role).toBe('Admin');
    });
    
    it('should list users', async () => {
      const LIST_USERS = `
        query ListUsers {
          users {
            id
            walletAddress
            role
          }
        }
      `;
      
      const result = await server.executeOperation({
        query: LIST_USERS,
      }, {
        req: {
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        },
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.users).toBeDefined();
      expect(Array.isArray(result.data.users)).toBe(true);
      expect(result.data.users.length).toBe(3); // 我们创建了3个测试用户
    });
    
    it('should update user profile', async () => {
      const UPDATE_USER = `
        mutation UpdateUser($id: ID!, $input: UserUpdateInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
            email
          }
        }
      `;
      
      const result = await server.executeOperation({
        query: UPDATE_USER,
        variables: { 
          id: candidateUser._id.toString(),
          input: {
            name: 'Updated Name',
            email: 'updated@example.com',
          }
        },
      }, {
        req: {
          headers: {
            authorization: `Bearer ${candidateToken}`,
          },
        },
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.updateUser).toBeDefined();
      expect(result.data.updateUser.name).toBe('Updated Name');
      expect(result.data.updateUser.email).toBe('updated@example.com');
    });
  });
  
  describe('Job Operations', () => {
    let testJobId;
    
    it('should create a job', async () => {
      const CREATE_JOB = `
        mutation CreateJob($input: JobInput!) {
          createJob(input: $input) {
            id
            title
            description
            employer {
              walletAddress
            }
            status
          }
        }
      `;
      
      const result = await server.executeOperation({
        query: CREATE_JOB,
        variables: { 
          input: {
            title: 'Test Job',
            description: 'This is a test job',
            skillsRequired: ['Solidity', 'React'],
            salary: '10000-15000 USDT',
            remote: true,
            location: '',
            contractJobId: '1',
            txHash: '0x1234567890abcdef',
          }
        },
      }, {
        req: {
          headers: {
            authorization: `Bearer ${employerToken}`,
          },
        },
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.createJob).toBeDefined();
      expect(result.data.createJob.title).toBe('Test Job');
      expect(result.data.createJob.employer.walletAddress).toBe(testEmployerAddress);
      
      testJobId = result.data.createJob.id;
    });
    
    it('should list jobs', async () => {
      const LIST_JOBS = `
        query ListJobs {
          jobs {
            id
            title
            status
          }
        }
      `;
      
      const result = await server.executeOperation({
        query: LIST_JOBS,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.jobs).toBeDefined();
      expect(Array.isArray(result.data.jobs)).toBe(true);
      expect(result.data.jobs.length).toBe(1);
      expect(result.data.jobs[0].title).toBe('Test Job');
    });
    
    it('should update a job', async () => {
      const UPDATE_JOB = `
        mutation UpdateJob($id: ID!, $input: JobUpdateInput!) {
          updateJob(id: $id, input: $input) {
            id
            title
            description
            status
          }
        }
      `;
      
      const result = await server.executeOperation({
        query: UPDATE_JOB,
        variables: { 
          id: testJobId,
          input: {
            title: 'Updated Job Title',
            description: 'Updated job description',
            status: 'Filled',
          }
        },
      }, {
        req: {
          headers: {
            authorization: `Bearer ${employerToken}`,
          },
        },
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.updateJob).toBeDefined();
      expect(result.data.updateJob.title).toBe('Updated Job Title');
      expect(result.data.updateJob.status).toBe('Filled');
    });
  });
  
  describe('Task Operations', () => {
    let testTaskId;
    
    it('should create a task', async () => {
      const CREATE_TASK = `
        mutation CreateTask($input: TaskInput!) {
          createTask(input: $input) {
            id
            title
            description
            creator {
              walletAddress
            }
            status
            reward
          }
        }
      `;
      
      const result = await server.executeOperation({
        query: CREATE_TASK,
        variables: { 
          input: {
            title: 'Test Task',
            description: 'This is a test task',
            skillsRequired: ['Solidity', 'React'],
            reward: '0.5',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            contractTaskId: '1',
            txHash: '0x1234567890abcdef',
          }
        },
      }, {
        req: {
          headers: {
            authorization: `Bearer ${employerToken}`,
          },
        },
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.createTask).toBeDefined();
      expect(result.data.createTask.title).toBe('Test Task');
      expect(result.data.createTask.creator.walletAddress).toBe(testEmployerAddress);
      
      testTaskId = result.data.createTask.id;
    });
    
    it('should list tasks', async () => {
      const LIST_TASKS = `
        query ListTasks {
          tasks {
            id
            title
            status
            reward
          }
        }
      `;
      
      const result = await server.executeOperation({
        query: LIST_TASKS,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.tasks).toBeDefined();
      expect(Array.isArray(result.data.tasks)).toBe(true);
      expect(result.data.tasks.length).toBe(1);
      expect(result.data.tasks[0].title).toBe('Test Task');
    });
    
    it('should place a bid on a task', async () => {
      const PLACE_BID = `
        mutation PlaceBid($taskId: ID!) {
          placeBid(taskId: $taskId) {
            id
            bidders {
              id
              walletAddress
            }
          }
        }
      `;
      
      const result = await server.executeOperation({
        query: PLACE_BID,
        variables: { taskId: testTaskId },
      }, {
        req: {
          headers: {
            authorization: `Bearer ${candidateToken}`,
          },
        },
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.placeBid).toBeDefined();
      expect(result.data.placeBid.bidders.length).toBe(1);
      expect(result.data.placeBid.bidders[0].walletAddress).toBe(testCandidateAddress);
    });
  });
});
