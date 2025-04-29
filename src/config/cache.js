const NodeCache = require('node-cache');
const { logger } = require('./logger');

// 创建缓存实例，默认过期时间为5分钟
const cache = new NodeCache({
  stdTTL: 300, // 默认缓存时间，单位秒
  checkperiod: 60, // 检查过期项目的周期，单位秒
});

// 缓存中间件，用于GraphQL解析器
const cacheMiddleware = (ttl = 300) => {
  return async (resolve, root, args, context, info) => {
    // 跳过变更操作的缓存
    if (info.operation.operation !== 'query') {
      return resolve(root, args, context, info);
    }

    // 为认证用户跳过缓存
    if (context.user) {
      return resolve(root, args, context, info);
    }

    // 创建缓存键
    const fieldName = info.fieldName;
    const argsString = Object.keys(args).length > 0 ? JSON.stringify(args) : '';
    const cacheKey = `${fieldName}:${argsString}`;

    // 检查缓存中是否有数据
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    // 如果缓存中没有，则执行解析器并缓存结果
    logger.debug(`Cache miss for ${cacheKey}`);
    const result = await resolve(root, args, context, info);
    cache.set(cacheKey, result, ttl);
    return result;
  };
};

// 清除特定前缀的缓存
const clearCacheByPrefix = (prefix) => {
  const keys = cache.keys();
  const keysToDelete = keys.filter(key => key.startsWith(prefix));
  
  if (keysToDelete.length > 0) {
    cache.del(keysToDelete);
    logger.info(`Cleared ${keysToDelete.length} cache entries with prefix: ${prefix}`);
  }
};

// 清除所有缓存
const clearAllCache = () => {
  cache.flushAll();
  logger.info('Cleared all cache entries');
};

module.exports = {
  cache,
  cacheMiddleware,
  clearCacheByPrefix,
  clearAllCache,
};
