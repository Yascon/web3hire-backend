const axios = require('axios');
const FormData = require('form-data');
const logger = require('../config/logger');

// Pinata API 配置
const pinataApiKey = process.env.IPFS_API_KEY;
const pinataSecretApiKey = process.env.IPFS_API_SECRET;
const pinataJWT = process.env.IPFS_JWT;

/**
 * 上传文件到 IPFS
 * @param {Buffer} fileBuffer 文件缓冲区
 * @param {string} fileName 文件名
 * @returns {Promise<string>} IPFS 哈希
 */
const uploadFileToIPFS = async (fileBuffer, fileName) => {
  try {
    const formData = new FormData();
    
    // 添加文件到表单
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'application/pdf'
    });
    
    // 添加元数据
    const metadata = JSON.stringify({
      name: fileName,
      keyvalues: {
        service: 'Web3Hire',
        type: 'resume'
      }
    });
    formData.append('pinataMetadata', metadata);
    
    // 添加选项
    const options = JSON.stringify({
      cidVersion: 0
    });
    formData.append('pinataOptions', options);
    
    // 发送请求
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': `Bearer ${pinataJWT}`
        }
      }
    );
    
    logger.info(`File uploaded to IPFS: ${response.data.IpfsHash}`);
    
    return response.data.IpfsHash;
  } catch (error) {
    logger.error(`Error uploading file to IPFS: ${error.message}`);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
};

/**
 * 上传 JSON 数据到 IPFS
 * @param {Object} jsonData JSON 数据
 * @param {string} name 文件名
 * @returns {Promise<string>} IPFS 哈希
 */
const uploadJsonToIPFS = async (jsonData, name) => {
  try {
    const data = JSON.stringify({
      pinataOptions: {
        cidVersion: 0
      },
      pinataMetadata: {
        name,
        keyvalues: {
          service: 'Web3Hire',
          type: 'metadata'
        }
      },
      pinataContent: jsonData
    });
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pinataJWT}`
        }
      }
    );
    
    logger.info(`JSON uploaded to IPFS: ${response.data.IpfsHash}`);
    
    return response.data.IpfsHash;
  } catch (error) {
    logger.error(`Error uploading JSON to IPFS: ${error.message}`);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
};

/**
 * 从 IPFS 获取文件
 * @param {string} ipfsHash IPFS 哈希
 * @returns {Promise<Object>} 文件数据
 */
const getFileFromIPFS = async (ipfsHash) => {
  try {
    const gateway = 'https://gateway.pinata.cloud/ipfs/';
    const response = await axios.get(`${gateway}${ipfsHash}`, {
      responseType: 'arraybuffer'
    });
    
    return {
      data: response.data,
      contentType: response.headers['content-type']
    };
  } catch (error) {
    logger.error(`Error getting file from IPFS: ${error.message}`);
    throw new Error(`IPFS retrieval failed: ${error.message}`);
  }
};

/**
 * 从 IPFS 获取 JSON 数据
 * @param {string} ipfsHash IPFS 哈希
 * @returns {Promise<Object>} JSON 数据
 */
const getJsonFromIPFS = async (ipfsHash) => {
  try {
    const gateway = 'https://gateway.pinata.cloud/ipfs/';
    const response = await axios.get(`${gateway}${ipfsHash}`);
    
    return response.data;
  } catch (error) {
    logger.error(`Error getting JSON from IPFS: ${error.message}`);
    throw new Error(`IPFS retrieval failed: ${error.message}`);
  }
};

module.exports = {
  uploadFileToIPFS,
  uploadJsonToIPFS,
  getFileFromIPFS,
  getJsonFromIPFS
};
