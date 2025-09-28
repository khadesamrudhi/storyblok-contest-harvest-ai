// src/ai/models/HuggingFaceClient.js

const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Hugging Face Inference API client (https://api-inference.huggingface.co)
 * Requires env var HUGGINGFACE_API_KEY
 */
class HuggingFaceClient {
  constructor(apiKey = process.env.HUGGINGFACE_API_KEY) {
    if (!apiKey) {
      logger.warn('Missing HUGGINGFACE_API_KEY; HuggingFaceClient will likely fail on remote calls');
    }
    this.apiKey = apiKey;
    this.baseURL = 'https://api-inference.huggingface.co/models';
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 60000,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
    });
  }

  // Generic invoke
  async invoke(model, payload, extraHeaders = {}) {
    try {
      const res = await this.http.post(`/${encodeURIComponent(model)}`, payload, {
        headers: { 'Content-Type': 'application/json', ...extraHeaders }
      });
      return res.data;
    } catch (err) {
      this._logError('HF invoke failed', err);
      throw this._wrapError(err);
    }
  }

  // Text generation (causal LM)
  async textGeneration(model = 'gpt2', prompt = '', options = {}) {
    const payload = { inputs: prompt, parameters: { max_new_tokens: 128, temperature: 0.8, ...options } };
    const data = await this.invoke(model, payload);
    // Response is typically array of { generated_text }
    if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
    return data;
  }

  // Embeddings (e.g., sentence-transformers)
  async embeddings(model = 'sentence-transformers/all-MiniLM-L6-v2', inputs) {
    const payload = { inputs };
    const data = await this.invoke(model, payload);
    // Many embedding models return array of vectors; normalize shape
    if (Array.isArray(data) && Array.isArray(data[0])) return data;
    if (Array.isArray(data)) return [data];
    return data;
  }

  // Zero-shot classification
  async zeroShotClassification(model = 'facebook/bart-large-mnli', input, candidateLabels = []) {
    const payload = { inputs: input, parameters: { candidate_labels: candidateLabels } };
    const data = await this.invoke(model, payload);
    return data; // {labels:[], scores:[], sequence:"..."}
  }

  // Image classification; accepts Buffer or base64 string
  async imageClassification(model = 'google/vit-base-patch16-224', image) {
    try {
      const headers = { 'Content-Type': 'application/octet-stream' };
      const body = Buffer.isBuffer(image) ? image : Buffer.from(image, 'base64');
      const res = await this.http.post(`/${encodeURIComponent(model)}`, body, { headers });
      return res.data; // array of {label, score}
    } catch (err) {
      this._logError('HF image classification failed', err);
      throw this._wrapError(err);
    }
  }

  _wrapError(err) {
    const status = err.response?.status;
    const data = err.response?.data;
    const message = data?.error || err.message || 'HuggingFace error';
    const e = new Error(message);
    e.status = status || 500;
    e.details = data;
    return e;
  }

  _logError(msg, err) {
    logger.error(msg, {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
  }
}

module.exports = HuggingFaceClient;

