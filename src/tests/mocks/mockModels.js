// 模拟数据库模型
const mockUser = {
  _id: '60d0fe4f5311236168a109ca',
  walletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  role: 'Admin',
  name: 'Test User',
  email: 'test@example.com',
  nonce: '123456',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

const mockEmployer = {
  _id: '60d0fe4f5311236168a109cb',
  walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  role: 'Employer',
  name: 'Test Employer',
  email: 'employer@example.com',
  nonce: '234567',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

const mockJob = {
  _id: '60d0fe4f5311236168a109cc',
  title: 'Test Job',
  description: 'This is a test job',
  skillsRequired: ['Solidity', 'React'],
  salary: '10000-15000 USDT',
  remote: true,
  location: '',
  employerId: mockEmployer._id,
  status: 'Open',
  contractJobId: '1',
  txHash: '0x1234567890abcdef',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

// 模拟 Mongoose 模型
const User = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteMany: jest.fn()
};

const Job = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteMany: jest.fn()
};

const Task = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteMany: jest.fn()
};

// 设置默认返回值
User.findOne.mockImplementation(() => Promise.resolve(mockUser));
User.findById.mockImplementation(() => Promise.resolve(mockUser));
User.find.mockImplementation(() => Promise.resolve([mockUser, mockEmployer]));
User.create.mockImplementation(() => Promise.resolve(mockUser));
User.findByIdAndUpdate.mockImplementation(() => Promise.resolve(mockUser));

Job.findOne.mockImplementation(() => Promise.resolve(mockJob));
Job.findById.mockImplementation(() => Promise.resolve(mockJob));
Job.find.mockImplementation(() => Promise.resolve([mockJob]));
Job.create.mockImplementation(() => Promise.resolve(mockJob));
Job.findByIdAndUpdate.mockImplementation(() => Promise.resolve(mockJob));

module.exports = {
  User,
  Job,
  Task,
  mockUser,
  mockEmployer,
  mockJob
};
