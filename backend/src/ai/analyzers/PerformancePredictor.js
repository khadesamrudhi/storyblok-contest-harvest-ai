// src/ai/analyzers/PerformancePredictor.js

const OpenAIClient = require('../models/OpenAIClient.clean');
const logger = require('../../utils/logger');

class PerformancePredictor {
  constructor() {
    this.openAI = new OpenAIClient();
  }
  // analysis is expected to be the output from ContentAnalyzer.analyze()
  async predictFromAnalysis(analysis, contentType = 'blog') {
    try {
      const heuristic = this.heuristicScores(analysis);
      let aiPrediction = null;
      try {
        aiPrediction = await this.openAI.predictContentPerformance(JSON.stringify(analysis), contentType);
      } catch (e) {
        logger.warn('OpenAI prediction unavailable, using heuristic only');
      }

      const merged = this.mergePredictions(heuristic, aiPrediction);
      return {
        ...merged,
        generated_at: new Date().toISOString(),
        method: aiPrediction ? 'heuristic+ai' : 'heuristic'
      };
    } catch (err) {
      logger.error('Performance prediction failed', err);
      throw err;
    }
  }

  heuristicScores(analysis) {
    const readabilityScore = Math.max(0, Math.min(10, (analysis?.readability?.flesch_score || 50) / 10));
    const sentimentScore = Math.max(0, Math.min(10, ((analysis?.sentiment?.score || 0) + 5) * 2));
    const lengthScore = Math.max(0, Math.min(10, (analysis?.word_count || 0) / 200));
    const keywordCount = (analysis?.keywords || []).length;
    const seoPotential = Math.max(0, Math.min(10, 3 + keywordCount / 3));

    const socialLikelihood = Math.max(0, Math.min(10, (sentimentScore * 0.5) + (readabilityScore * 0.3) + (lengthScore * 0.2)));

    const strengths = [];
    const improvements = [];
    if (readabilityScore >= 7) strengths.push('Good readability'); else improvements.push('Improve readability');
    if (sentimentScore >= 6) strengths.push('Positive tone'); else improvements.push('Clarify tone');
    if ((analysis?.word_count || 0) >= 800) strengths.push('Comprehensive length'); else improvements.push('Increase content depth');

    return {
      engagement_score: Math.round(((readabilityScore + sentimentScore + lengthScore) / 3) * 10) / 10,
      readability_score: Math.round(readabilityScore * 10) / 10,
      seo_potential: Math.round(seoPotential * 10) / 10,
      social_sharing_likelihood: Math.round(socialLikelihood * 10) / 10,
      strengths,
      areas_for_improvement: improvements
    };
  }

  mergePredictions(heuristic, ai) {
    if (!ai || typeof ai !== 'object') return heuristic;
    const avg = (a, b) => Math.round(((a ?? 0) * 0.6 + (b ?? 0) * 0.4) * 10) / 10;
    const aiStrengths = Array.isArray(ai.key_strengths) ? ai.key_strengths
                      : Array.isArray(ai.keyStrengths) ? ai.keyStrengths
                      : [];
    const aiImprovements = Array.isArray(ai.areas_for_improvement) ? ai.areas_for_improvement
                         : Array.isArray(ai.areasForImprovement) ? ai.areasForImprovement
                         : [];

    return {
      engagement_score: avg(heuristic.engagement_score, ai.engagement_score),
      readability_score: avg(heuristic.readability_score, ai.readability_score),
      seo_potential: avg(heuristic.seo_potential, ai.seo_potential),
      social_sharing_likelihood: avg(heuristic.social_sharing_likelihood, ai.social_sharing_likelihood),
      strengths: Array.from(new Set([...(heuristic.strengths || []), ...aiStrengths])),
      areas_for_improvement: Array.from(new Set([...(heuristic.areas_for_improvement || []), ...aiImprovements]))
    };
  }
}

module.exports = PerformancePredictor;

