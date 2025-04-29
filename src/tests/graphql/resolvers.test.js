// 使用 Jest 的模拟功能代替真实数据库连接
const { ApolloServer, gql } = require('apollo-server-express');
const jwt = require('jsonwebtoken');

// 导入模拟模型和数据
const { User, Job, mockUser, mockEmployer, mockJob } = require('../mocks/mockModels');

// 简化的 GraphQL 模式定义
const typeDefs = gql`
  type User {
    id: ID!
    walletAddress: String!
    role: String!
    name: String
    email: String
  }
  
  type Job {
    id: ID!
    title: String!
    description: String!
    skillsRequired: [String!]!
    salary: String!
    remote: Boolean!
    location: String
    employer: User!
    status: String!
  }
  
  input JobInput {
    title: String!
    description: String!
    skillsRequired: [String!]!
    salary: String!
    remote: Boolean!
    location: String
    contractJobId: String
    txHash: String
  }
  
  type Query {
    me: User
    jobs: [Job]
  }
  
  type Mutation {
    getNonce(walletAddress: String!): String!
    createJob(input: JobInput!): Job
  }
`;

// 简化的解析器
const resolvers = {
  Query: {
    me: (_, __, context) => {
      if (!context.user) return null;
      return User.findById(context.user.id);
    },
    jobs: () => Job.find()
  },
  Mutation: {
    getNonce: async (_, { walletAddress }) => {
      const nonce = Math.floor(Math.random() * 1000000).toString();
      const existingUser = await User.findOne({ walletAddress });
      
      if (!existingUser) {
        await User.create({
          walletAddress,
          nonce,
          role: 'Candidate'
        });
      } else {
        existingUser.nonce = nonce;
        await User.findByIdAndUpdate(existingUser._id, { nonce });
      }
      
      return nonce;
    },
    createJob: async (_, { input }, context) => {
      if (!context.user) throw new Error('Not authenticated');
      
      const job = await Job.create({
        ...input,
        employerId: context.user.id,
        status: 'Open'
      });
      
      return job;
    }
  },
  Job: {
    employer: (parent) => {
      return User.findById(parent.employerId || parent.employer);
    }
  }
};

// 生成测试用 JWT 令牌
const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, walletAddress: user.walletAddress, role: user.role },
    'test_secret',
    { expiresIn: '1h' }
  );
};

describe('GraphQL Resolver Tests', () => {
  let server;
  
  beforeAll(() => {
    // 创建 Apollo 服务器
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req }) => {
        // 模拟认证上下文
        const token = req?.headers?.authorization?.split(' ')[1] || '';
        let user = null;
        
        if (token) {
          try {
            user = jwt.verify(token, 'test_secret');
          } catch (error) {
            console.error('Invalid token');
          }
        }
        
        return { user };
      },
    });
  });
  
  beforeEach(() => {
    // 重置所有模拟函数
    jest.clearAllMocks();
  });
  
  describe('User Resolvers', () => {
    it('should create a new user when getting nonce for a new wallet', async () => {
      const testWalletAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      
      // 模拟 findOne 返回 null (用户不存在)
      User.findOne.mockResolvedValueOnce(null);
      
      // 模拟 create 成功创建用户
      User.create.mockImplementationOnce((userData) => {
        return Promise.resolve({
          _id: '60d0fe4f5311236168a109ca',
          ...userData
        });
      });
      
      const GET_NONCE = `
        mutation GetNonce($walletAddress: String!) {
          getNonce(walletAddress: $walletAddress)
        }
      `;
      
      const result = await server.executeOperation({
        query: GET_NONCE,
        variables: { walletAddress: testWalletAddress },
      });
      
      // 验证返回了一个 nonce
      expect(result.errors).toBeUndefined();
      expect(result.data.getNonce).toBeDefined();
      expect(typeof result.data.getNonce).toBe('string');
      
      // 验证 User.create 被调用
      expect(User.create).toHaveBeenCalledWith({
        walletAddress: testWalletAddress,
        nonce: expect.any(String),
        role: 'Candidate'
      });
    });
    
    it('should return existing user data', async () => {
      // 模拟用户数据
      const adminUser = {
        _id: '60d0fe4f5311236168a109ca',
        walletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        role: 'Admin',
        name: 'Admin User',
        email: 'admin@web3hire.com',
      };
      
      // 模拟 findById 返回用户数据，确保包含 id 字段
      User.findById.mockResolvedValueOnce({
        ...adminUser,
        id: adminUser._id // 确保 id 字段存在
      });
      
      // 生成令牌
      const token = generateTestToken(adminUser);
      
      const GET_ME = `
        query Me {
          me {
            id
            walletAddress
            role
            name
            email
          }
        }
      `;
      
      const result = await server.executeOperation(
        { query: GET_ME },
        {
          req: {
            headers: {
              authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      expect(result.errors).toBeUndefined();
      expect(result.data.me).toBeDefined();
      expect(result.data.me.walletAddress).toBe(adminUser.walletAddress);
      expect(result.data.me.role).toBe(adminUser.role);
      
      // 验证 findById 被调用
      expect(User.findById).toHaveBeenCalledWith(adminUser._id);
    });
  });
  
  describe('Job Resolvers', () => {
    it('should create a job', async () => {
      // 模拟雇主用户
      const employerUser = {
        _id: '60d0fe4f5311236168a109cb',
        walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        role: 'Employer',
        name: 'Test Employer',
        email: 'employer@example.com',
      };
      
      // 模拟创建的职位
      const jobData = {
        title: 'Test Job',
        description: 'This is a test job',
        skillsRequired: ['Solidity', 'React'],
        salary: '10000-15000 USDT',
        remote: true,
        location: '',
        contractJobId: '1',
        txHash: '0x1234567890abcdef',
      };
      
      // 模拟 Job.create 返回创建的职位
      Job.create.mockImplementationOnce((data) => {
        return Promise.resolve({
          _id: '60d0fe4f5311236168a109cc',
          id: '60d0fe4f5311236168a109cc', // 添加 id 字段
          ...data,
          status: 'Open',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      
      // 模拟 User.findById 返回雇主用户
      User.findById.mockResolvedValueOnce({
        ...employerUser,
        id: employerUser._id // 确保 id 字段存在
      });
      
      // 生成令牌
      const token = generateTestToken(employerUser);
      
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
      
      const result = await server.executeOperation(
        {
          query: CREATE_JOB,
          variables: { input: jobData },
        },
        {
          req: {
            headers: {
              authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      expect(result.errors).toBeUndefined();
      expect(result.data.createJob).toBeDefined();
      expect(result.data.createJob.title).toBe(jobData.title);
      expect(result.data.createJob.employer.walletAddress).toBe(employerUser.walletAddress);
      
      // 验证 Job.create 被调用
      expect(Job.create).toHaveBeenCalledWith({
        ...jobData,
        employerId: employerUser._id,
        status: 'Open'
      });
    });
    
    it('should list jobs', async () => {
      // 模拟职位列表
      const jobs = [
        {
          _id: '60d0fe4f5311236168a109cc',
          id: '60d0fe4f5311236168a109cc', // 添加 id 字段
          title: 'Job 1',
          description: 'Description 1',
          skillsRequired: ['Solidity'],
          salary: '10000 USDT',
          remote: true,
          location: '',
          employer: '60d0fe4f5311236168a109cb',
          status: 'Open',
        },
        {
          _id: '60d0fe4f5311236168a109cd',
          id: '60d0fe4f5311236168a109cd', // 添加 id 字段
          title: 'Job 2',
          description: 'Description 2',
          skillsRequired: ['React'],
          salary: '12000 USDT',
          remote: false,
          location: 'Remote',
          employer: '60d0fe4f5311236168a109cb',
          status: 'Open',
        }
      ];
      
      // 模拟 Job.find 返回职位列表
      Job.find.mockResolvedValueOnce(jobs);
      
      // 模拟 User.findById 返回雇主用户
      User.findById.mockResolvedValue({
        ...mockEmployer,
        id: mockEmployer._id // 确保 id 字段存在
      });
      
      const LIST_JOBS = `
        query ListJobs {
          jobs {
            id
            title
            status
          }
        }
      `;
      
      const result = await server.executeOperation({ query: LIST_JOBS });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.jobs).toBeDefined();
      expect(Array.isArray(result.data.jobs)).toBe(true);
      expect(result.data.jobs.length).toBe(2);
      expect(result.data.jobs[0].title).toBe('Job 1');
      expect(result.data.jobs[1].title).toBe('Job 2');
      
      // 验证 Job.find 被调用
      expect(Job.find).toHaveBeenCalled();
    });
  });
});
