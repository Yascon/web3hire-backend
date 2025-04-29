const { logger } = require('./logger');
// 模拟数据存储
const mockDB = {
  users: [],
  jobs: [],
  tasks: [],
  applications: [],
  bids: [],
  resumes: []
};

// 添加一些初始数据
const initializeMockData = () => {
  // 添加管理员用户
  mockDB.users.push({
    id: '1',
    walletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    name: 'Admin User',
    email: 'admin@web3hire.com',
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 添加示例雇主
  mockDB.users.push({
    id: '2',
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    name: 'Example Employer',
    email: 'employer@example.com',
    role: 'EMPLOYER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 添加示例求职者
  mockDB.users.push({
    id: '3',
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    name: 'Example Candidate',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 添加示例职位
  mockDB.jobs.push({
    id: '1',
    title: 'Senior Solidity Developer',
    description: 'We are looking for an experienced Solidity developer to join our team.',
    employerId: '2',
    skills: ['Solidity', 'Ethereum', 'Smart Contracts'],
    salary: '$100,000 - $150,000',
    location: 'Remote',
    remote: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 添加示例任务
  mockDB.tasks.push({
    id: '1',
    title: 'Build a DeFi Dashboard',
    description: 'Create a dashboard to track DeFi investments across multiple protocols.',
    creatorId: '2',
    reward: '5000',
    rewardToken: 'USDC',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  logger.info('Mock database initialized with sample data');
};

// 模拟连接数据库
const connectMockDB = async () => {
  try {
    logger.info('Using mock in-memory database');
    
    // 初始化模拟数据
    initializeMockData();
    
    return {
      connection: {
        host: 'mock-db',
        readyState: 1
      }
    };
  } catch (error) {
    logger.error(`Mock database initialization error: ${error.message}`);
    throw error;
  }
};

// 模拟数据库查询方法
const mockModels = {
  User: {
    find: () => Promise.resolve(mockDB.users),
    findOne: (query) => {
      if (query.walletAddress) {
        return Promise.resolve(mockDB.users.find(u => u.walletAddress === query.walletAddress));
      }
      if (query._id) {
        return Promise.resolve(mockDB.users.find(u => u.id === query._id));
      }
      return Promise.resolve(null);
    },
    findById: (id) => Promise.resolve(mockDB.users.find(u => u.id === id)),
    create: (data) => {
      const newUser = { ...data, id: String(mockDB.users.length + 1), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      mockDB.users.push(newUser);
      return Promise.resolve(newUser);
    },
    countDocuments: () => Promise.resolve(mockDB.users.length)
  },
  Job: {
    find: () => Promise.resolve(mockDB.jobs),
    findOne: (query) => {
      if (query._id) {
        return Promise.resolve(mockDB.jobs.find(j => j.id === query._id));
      }
      return Promise.resolve(null);
    },
    findById: (id) => Promise.resolve(mockDB.jobs.find(j => j.id === id)),
    create: (data) => {
      const newJob = { ...data, id: String(mockDB.jobs.length + 1), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      mockDB.jobs.push(newJob);
      return Promise.resolve(newJob);
    },
    countDocuments: (query = {}) => {
      if (query.active === true) {
        return Promise.resolve(mockDB.jobs.filter(j => j.active).length);
      }
      return Promise.resolve(mockDB.jobs.length);
    }
  },
  Task: {
    find: () => Promise.resolve(mockDB.tasks),
    findOne: (query) => {
      if (query._id) {
        return Promise.resolve(mockDB.tasks.find(t => t.id === query._id));
      }
      return Promise.resolve(null);
    },
    findById: (id) => Promise.resolve(mockDB.tasks.find(t => t.id === id)),
    create: (data) => {
      const newTask = { ...data, id: String(mockDB.tasks.length + 1), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      mockDB.tasks.push(newTask);
      return Promise.resolve(newTask);
    },
    countDocuments: (query = {}) => {
      if (query.status === 'COMPLETED') {
        return Promise.resolve(mockDB.tasks.filter(t => t.status === 'COMPLETED').length);
      }
      return Promise.resolve(mockDB.tasks.length);
    }
  }
};

module.exports = { connectMockDB, mockModels, mockDB };
