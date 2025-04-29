const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// 模拟 logger 模块
jest.mock('../../config/logger', () => require('../mocks/logger'));

// 确保加载环境变量
dotenv.config();

// 模拟 axios 请求
const mockAxios = new MockAdapter(axios);

// 导入 IPFS 服务
const ipfsService = require('../../services/ipfs');

describe('IPFS Service', () => {
  beforeEach(() => {
    // 重置所有模拟
    mockAxios.reset();
  });

  afterAll(() => {
    // 恢复所有模拟
    mockAxios.restore();
  });

  test('上传文件到 IPFS', async () => {
    // 模拟 Pinata API 响应
    mockAxios.onPost(`${process.env.IPFS_API_URL}/pinFileToIPFS`).reply(200, {
      IpfsHash: 'QmTest123456789',
      PinSize: 1234,
      Timestamp: new Date().toISOString()
    });

    // 创建测试文件 Buffer
    const testBuffer = Buffer.from('测试文件内容');
    const fileName = 'test.txt';

    // 调用上传方法
    const hash = await ipfsService.uploadFile(testBuffer, fileName);

    // 验证返回的哈希值
    expect(hash).toBe('QmTest123456789');
  });

  test('上传 JSON 到 IPFS', async () => {
    // 模拟 Pinata API 响应
    mockAxios.onPost(`${process.env.IPFS_API_URL}/pinJSONToIPFS`).reply(200, {
      IpfsHash: 'QmJsonTest123456789',
      PinSize: 567,
      Timestamp: new Date().toISOString()
    });

    // 创建测试 JSON 数据
    const testJson = { test: 'data', number: 123 };

    // 调用上传方法
    const hash = await ipfsService.uploadJson(testJson);

    // 验证返回的哈希值
    expect(hash).toBe('QmJsonTest123456789');
  });

  test('从 IPFS 获取内容', async () => {
    // 模拟 IPFS 网关响应
    const testContent = 'IPFS 测试内容';
    mockAxios.onGet(`${process.env.IPFS_GATEWAY}/QmTestGet123456789`).reply(200, testContent);

    // 调用获取方法
    const content = await ipfsService.getContent('QmTestGet123456789');

    // 验证返回的内容
    expect(content.toString()).toBe(testContent);
  });

  test('从 IPFS 获取 JSON 内容', async () => {
    // 模拟 IPFS 网关响应
    const testJsonContent = { key: 'value', number: 456 };
    mockAxios.onGet(`${process.env.IPFS_GATEWAY}/QmTestGetJson123456789`).reply(200, JSON.stringify(testJsonContent));

    // 调用获取方法
    const jsonContent = await ipfsService.getJsonContent('QmTestGetJson123456789');

    // 验证返回的 JSON 内容
    expect(jsonContent).toEqual(testJsonContent);
  });

  test('生成 IPFS URL', () => {
    // 调用 URL 生成方法
    const url = ipfsService.getIpfsUrl('QmTestUrl123456789');

    // 验证生成的 URL
    expect(url).toBe(`${process.env.IPFS_GATEWAY}/QmTestUrl123456789`);
  });

  test('处理上传文件错误', async () => {
    // 模拟 Pinata API 错误响应
    mockAxios.onPost(`${process.env.IPFS_API_URL}/pinFileToIPFS`).reply(500, { error: 'Server error' });

    // 创建测试文件 Buffer
    const testBuffer = Buffer.from('测试文件内容');
    const fileName = 'test.txt';

    // 验证错误处理
    await expect(ipfsService.uploadFile(testBuffer, fileName)).rejects.toThrow('Failed to upload to IPFS');
  });

  test('处理上传 JSON 错误', async () => {
    // 模拟 Pinata API 错误响应
    mockAxios.onPost(`${process.env.IPFS_API_URL}/pinJSONToIPFS`).reply(500, { error: 'Server error' });

    // 创建测试 JSON 数据
    const testJson = { test: 'data', number: 123 };

    // 验证错误处理
    await expect(ipfsService.uploadJson(testJson)).rejects.toThrow('Failed to upload JSON to IPFS');
  });

  test('处理获取内容错误', async () => {
    // 模拟 IPFS 网关错误响应
    mockAxios.onGet(`${process.env.IPFS_GATEWAY}/QmTestError123456789`).reply(404, { error: 'Not found' });

    // 验证错误处理
    await expect(ipfsService.getContent('QmTestError123456789')).rejects.toThrow('Failed to get content from IPFS');
  });
});
