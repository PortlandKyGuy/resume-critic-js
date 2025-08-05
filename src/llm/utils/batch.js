const { curry, chunk, map, flatten } = require('ramda');
const { logger } = require('../../utils/logger');

/**
 * Process multiple LLM requests in batches
 * @param {Object} options - Batch processing options
 * @returns {Function} Batch processor function
 */
const createBatchProcessor = (options = {}) => {
  const config = {
    batchSize: options.batchSize || 5,
    concurrency: options.concurrency || 3,
    onProgress: options.onProgress || (() => {}),
    onError: options.onError || (() => {}),
    retryFailed: options.retryFailed !== false
  };

  logger.debug('Batch: Creating batch processor', {
    batchSize: config.batchSize,
    concurrency: config.concurrency,
    retryFailed: config.retryFailed
  });

  return curry(async (llmClient, requests) => {
    const startTime = Date.now();
    const batches = chunk(config.batchSize, requests);
    const results = [];
    let processed = 0;

    logger.info('Batch: Starting batch processing', {
      totalRequests: requests.length,
      batchCount: batches.length,
      batchSize: config.batchSize,
      concurrency: config.concurrency
    });

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartTime = Date.now();
      
      logger.debug('Batch: Processing batch', {
        batchIndex: batchIndex + 1,
        totalBatches: batches.length,
        batchSize: batch.length
      });

      const batchResults = await processBatchConcurrently(
        llmClient,
        batch,
        config.concurrency,
        progress => {
          processed += progress;
          const percentage = (processed / requests.length) * 100;
          
          logger.debug('Batch: Progress update', {
            processed,
            total: requests.length,
            percentage: Math.round(percentage)
          });
          
          config.onProgress({
            processed,
            total: requests.length,
            percentage
          });
        },
        config.onError
      );

      const batchDuration = Date.now() - batchStartTime;
      const successCount = batchResults.filter(r => r.success).length;
      const failureCount = batchResults.filter(r => !r.success).length;
      
      logger.info('Batch: Batch completed', {
        batchIndex: batchIndex + 1,
        batchDuration,
        successCount,
        failureCount,
        avgTimePerRequest: Math.round(batchDuration / batch.length)
      });

      results.push(...batchResults);
    }

    const totalDuration = Date.now() - startTime;
    const totalSuccess = results.filter(r => r.success).length;
    const totalFailure = results.filter(r => !r.success).length;
    
    logger.info('Batch: All batches completed', {
      totalDuration,
      totalRequests: requests.length,
      totalSuccess,
      totalFailure,
      avgTimePerRequest: Math.round(totalDuration / requests.length)
    });

    return results;
  });
};

/**
 * Process a batch of requests concurrently
 * @param {Object} llmClient - LLM client instance
 * @param {Array} batch - Batch of requests
 * @param {number} concurrency - Max concurrent requests
 * @param {Function} onProgress - Progress callback
 * @param {Function} onError - Error callback
 * @returns {Promise<Array>} Results array
 */
const processBatchConcurrently = async (llmClient, batch, concurrency, onProgress, onError) => {
  const results = new Array(batch.length);
  const executing = [];
  
  logger.debug('Batch: Starting concurrent processing', {
    batchSize: batch.length,
    concurrency,
    provider: llmClient.provider,
    model: llmClient.model
  });

  for (let i = 0; i < batch.length; i++) {
    const promise = processRequest(llmClient, batch[i], i, results, onProgress, onError);
    executing.push(promise);

    if (executing.length >= concurrency) {
      logger.debug('Batch: Reached concurrency limit, waiting for slot', {
        currentConcurrency: executing.length,
        maxConcurrency: concurrency,
        pendingRequests: batch.length - i - 1
      });
      
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  logger.debug('Batch: Waiting for remaining requests', {
    remainingRequests: executing.length
  });
  
  await Promise.all(executing);
  return results;
};

/**
 * Process a single request
 * @param {Object} llmClient - LLM client instance
 * @param {Object} request - Request object
 * @param {number} index - Request index
 * @param {Array} results - Results array
 * @param {Function} onProgress - Progress callback
 * @param {Function} onError - Error callback
 * @returns {Promise} Processing promise
 */
const processRequest = async (llmClient, request, index, results, onProgress, onError) => {
  const startTime = Date.now();
  
  logger.debug('Batch: Processing request', {
    index,
    hasSystem: !!request.system,
    userPromptLength: request.user?.length,
    temperature: request.temperature,
    maxTokens: request.maxTokens
  });
  
  try {
    const result = await llmClient.complete(request);
    const duration = Date.now() - startTime;
    
    results[index] = {
      success: true,
      result,
      request,
      index
    };
    
    logger.debug('Batch: Request completed successfully', {
      index,
      duration,
      responseLength: result?.length
    });
    
    onProgress(1);
  } catch (error) {
    const duration = Date.now() - startTime;
    
    results[index] = {
      success: false,
      error: error.message,
      request,
      index
    };
    
    logger.error('Batch: Request failed', {
      index,
      duration,
      errorMessage: error.message,
      errorType: error.constructor.name
    });
    
    onError({ error, request, index });
  }
};

/**
 * Chunk requests by estimated token count
 * @param {number} maxTokens - Max tokens per chunk
 * @param {Function} tokenEstimator - Function to estimate tokens
 * @param {Array} requests - Array of requests
 * @returns {Array} Array of chunks
 */
const chunkByTokens = curry((maxTokens, tokenEstimator, requests) => {
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;
  
  logger.debug('Batch: Chunking requests by token count', {
    maxTokensPerChunk: maxTokens,
    totalRequests: requests.length
  });

  for (const request of requests) {
    const estimatedTokens = tokenEstimator(request);

    if (currentTokens + estimatedTokens > maxTokens && currentChunk.length > 0) {
      logger.debug('Batch: Token limit reached, creating new chunk', {
        chunkSize: currentChunk.length,
        tokenCount: currentTokens,
        nextRequestTokens: estimatedTokens
      });
      
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(request);
    currentTokens += estimatedTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  logger.info('Batch: Token-based chunking complete', {
    totalChunks: chunks.length,
    chunkSizes: chunks.map(c => c.length),
    avgChunkSize: Math.round(requests.length / chunks.length)
  });

  return chunks;
});

/**
 * Merge multiple batch requests into a single request
 * @param {Array} requests - Array of requests
 * @param {Object} options - Merge options
 * @returns {Object} Merged request
 */
const mergeBatchRequests = (requests, options = {}) => {
  const separator = options.separator || '\n---\n';
  const includeIndex = options.includeIndex !== false;
  
  logger.debug('Batch: Merging batch requests', {
    requestCount: requests.length,
    includeIndex,
    separator: separator.replace(/\n/g, '\\n')
  });

  const mergedUser = requests.map((req, index) => {
    const prefix = includeIndex ? `[Request ${index + 1}]\n` : '';
    return prefix + req.user;
  }).join(separator);

  const mergedSystem = requests[0].system || '';
  const totalMaxTokens = options.maxTokens || requests.reduce((sum, req) => sum + (req.maxTokens || 500), 0);
  
  const mergedRequest = {
    system: mergedSystem,
    user: mergedUser,
    temperature: requests[0].temperature,
    maxTokens: totalMaxTokens
  };
  
  logger.info('Batch: Requests merged', {
    originalCount: requests.length,
    mergedUserLength: mergedUser.length,
    mergedMaxTokens: totalMaxTokens,
    hasSystem: !!mergedSystem
  });

  return mergedRequest;
};

/**
 * Split merged response back into individual responses
 * @param {string} response - Merged response
 * @param {number} count - Number of expected responses
 * @param {Object} options - Split options
 * @returns {Array} Array of responses
 */
const splitBatchResponse = (response, count, options = {}) => {
  const separator = options.separator || '\n---\n';
  
  logger.debug('Batch: Splitting batch response', {
    responseLength: response.length,
    expectedCount: count,
    separator: separator.replace(/\n/g, '\\n')
  });
  
  const parts = response.split(separator);

  if (parts.length !== count) {
    logger.warn('Batch: Split count mismatch, using equal portions', {
      expectedCount: count,
      actualParts: parts.length,
      fallbackStrategy: 'equal chunks'
    });
    
    // If split doesn't match expected count, return equal portions
    const chunkSize = Math.ceil(response.length / count);
    const chunks = Array.from({ length: count }, (_, i) => 
      response.substring(i * chunkSize, (i + 1) * chunkSize).trim()
    );
    
    logger.debug('Batch: Created equal chunks', {
      chunkSize,
      chunkLengths: chunks.map(c => c.length)
    });
    
    return chunks;
  }

  const trimmedParts = parts.map(part => part.trim());
  
  logger.info('Batch: Response split successfully', {
    partCount: trimmedParts.length,
    partLengths: trimmedParts.map(p => p.length)
  });
  
  return trimmedParts;
};

/**
 * Estimate token count for a request (simple approximation)
 * @param {Object} request - Request object
 * @returns {number} Estimated token count
 */
const estimateTokens = request => {
  const text = `${request.system || ''} ${request.user || ''}`;
  // Rough estimate: 1 token ≈ 4 characters
  const estimatedTokens = Math.ceil(text.length / 4);
  
  logger.debug('Batch: Estimated token count', {
    textLength: text.length,
    estimatedTokens,
    hasSystem: !!request.system,
    userLength: request.user?.length
  });
  
  return estimatedTokens;
};

module.exports = {
  createBatchProcessor,
  chunkByTokens,
  mergeBatchRequests,
  splitBatchResponse,
  estimateTokens
};
