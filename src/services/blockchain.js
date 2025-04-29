const { ethers } = require('ethers');
const logger = require('../config/logger');

// 智能合约 ABI
const contractABI = [
  // 这里应该是您的合约 ABI，以下是示例
  "function createResume(string ipfsHash) external returns (uint256)",
  "function getResume(uint256 resumeId) external view returns (address owner, string ipfsHash, uint256 timestamp)",
  "function createJob(string title, string description, string ipfsHash) external returns (uint256)",
  "function getJob(uint256 jobId) external view returns (address employer, string title, string description, string ipfsHash, uint256 timestamp)",
  "function applyForJob(uint256 jobId, uint256 resumeId) external",
  "function getApplications(uint256 jobId) external view returns (address[] memory applicants, uint256[] memory resumeIds)"
];

// 获取提供者和合约实例
const getProvider = () => {
  try {
    return new ethers.providers.JsonRpcProvider(process.env.POLYGON_MUMBAI_URL);
  } catch (error) {
    logger.error(`Error creating provider: ${error.message}`);
    throw error;
  }
};

const getContract = (signerOrProvider) => {
  try {
    return new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI,
      signerOrProvider
    );
  } catch (error) {
    logger.error(`Error creating contract instance: ${error.message}`);
    throw error;
  }
};

/**
 * 上传简历到区块链
 * @param {string} walletAddress 用户钱包地址
 * @param {string} ipfsHash IPFS 哈希
 * @returns {Promise<Object>} 交易结果
 */
const uploadResumeToBlockchain = async (walletAddress, ipfsHash) => {
  try {
    // 创建钱包实例
    const provider = getProvider();
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    const contract = getContract(adminWallet);
    
    // 调用合约方法
    const tx = await contract.createResume(ipfsHash);
    const receipt = await tx.wait();
    
    logger.info(`Resume uploaded to blockchain for ${walletAddress}, tx: ${receipt.transactionHash}`);
    
    // 从事件中获取简历 ID
    const event = receipt.events.find(e => e.event === 'ResumeCreated');
    const resumeId = event ? event.args.resumeId.toString() : null;
    
    return {
      transactionHash: receipt.transactionHash,
      resumeId
    };
  } catch (error) {
    logger.error(`Error uploading resume to blockchain: ${error.message}`);
    throw new Error(`Blockchain operation failed: ${error.message}`);
  }
};

/**
 * 发布工作到区块链
 * @param {string} employerAddress 雇主钱包地址
 * @param {Object} jobData 工作数据
 * @returns {Promise<Object>} 交易结果
 */
const postJobToBlockchain = async (employerAddress, jobData) => {
  try {
    // 创建钱包实例
    const provider = getProvider();
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    const contract = getContract(adminWallet);
    
    // 调用合约方法
    const tx = await contract.createJob(
      jobData.title,
      jobData.description,
      jobData.ipfsHash || ''
    );
    const receipt = await tx.wait();
    
    logger.info(`Job posted to blockchain by ${employerAddress}, tx: ${receipt.transactionHash}`);
    
    // 从事件中获取工作 ID
    const event = receipt.events.find(e => e.event === 'JobCreated');
    const jobId = event ? event.args.jobId.toString() : null;
    
    return {
      transactionHash: receipt.transactionHash,
      jobId
    };
  } catch (error) {
    logger.error(`Error posting job to blockchain: ${error.message}`);
    throw new Error(`Blockchain operation failed: ${error.message}`);
  }
};

/**
 * 申请工作
 * @param {string} candidateAddress 候选人钱包地址
 * @param {string} jobId 工作 ID
 * @param {string} resumeId 简历 ID
 * @returns {Promise<Object>} 交易结果
 */
const applyForJobOnBlockchain = async (candidateAddress, jobId, resumeId) => {
  try {
    // 创建钱包实例
    const provider = getProvider();
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    const contract = getContract(adminWallet);
    
    // 调用合约方法
    const tx = await contract.applyForJob(jobId, resumeId);
    const receipt = await tx.wait();
    
    logger.info(`Job application submitted on blockchain by ${candidateAddress}, tx: ${receipt.transactionHash}`);
    
    return {
      transactionHash: receipt.transactionHash,
      success: true
    };
  } catch (error) {
    logger.error(`Error applying for job on blockchain: ${error.message}`);
    throw new Error(`Blockchain operation failed: ${error.message}`);
  }
};

/**
 * 获取工作申请列表
 * @param {string} jobId 工作 ID
 * @returns {Promise<Array>} 申请列表
 */
const getJobApplicationsFromBlockchain = async (jobId) => {
  try {
    // 创建提供者和合约实例
    const provider = getProvider();
    const contract = getContract(provider);
    
    // 调用合约方法
    const [applicants, resumeIds] = await contract.getApplications(jobId);
    
    // 格式化结果
    const applications = applicants.map((address, index) => ({
      applicantAddress: address,
      resumeId: resumeIds[index].toString()
    }));
    
    return applications;
  } catch (error) {
    logger.error(`Error getting job applications from blockchain: ${error.message}`);
    throw new Error(`Blockchain operation failed: ${error.message}`);
  }
};

module.exports = {
  uploadResumeToBlockchain,
  postJobToBlockchain,
  applyForJobOnBlockchain,
  getJobApplicationsFromBlockchain
};
