module.exports = require('./OpenAIClient.clean');
  initialize() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found in environment variables');
    }
    this.isInitialized = true;
    logger.info('OpenAI client initialized');
  }

  async generateCompletion(prompt, options = {}) {
    if (!this.isInitialized) this.initialize();

    try {
      const response = await this.openai.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        ...options
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('OpenAI completion error:', error);
      throw error;
    }
  }

  async analyzeContent(content, analysisType = 'general') {
    const prompts = {
      general: `Analyze the following content and provide insights about its quality, readability, and effectiveness:\n\n${content}`,
      sentiment: `Analyze the sentiment of the following content. Classify as positive, negative, or neutral and explain why:\n\n${content}`,
      keywords: `Extract the main keywords and topics from the following content. List them in order of importance:\n\n${content}`,
      summary: `Provide a concise summary of the following content in 2-3 sentences:\n\n${content}`,
      engagement: `Analyze how engaging this content is and suggest improvements to increase reader engagement:\n\n${content}`,
      seo: `Analyze this content from an SEO perspective and provide optimization recommendations:\n\n${content}`
    };

    const prompt = prompts[analysisType] || prompts.general;
    return await this.generateCompletion(prompt);
  }

  async generateContentSuggestions(topic, contentType = 'blog', targetAudience = 'general') {
    const prompt = `Generate 5 creative ${contentType} content ideas about "${topic}" for a ${targetAudience} audience. 
    For each idea, provide:
    1. A catchy title
    2. A brief description
    3. Key points to cover
    4. Estimated engagement potential (1-10)
    
    Format the response as JSON.`;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.8 });
      return JSON.parse(response);
    } catch (error) {
      logger.error('Content suggestion generation failed:', error);
      throw error;
    }
  }

  async improveContent(content, improvementType = 'general') {
    const prompts = {
      general: `Improve the following content for better readability and engagement while maintaining its core message:\n\n${content}`,
      seo: `Optimize the following content for SEO while keeping it natural and readable:\n\n${content}`,
      engagement: `Rewrite the following content to make it more engaging and compelling:\n\n${content}`,
      clarity: `Improve the clarity and structure of the following content:\n\n${content}`,
      tone: `Adjust the tone of the following content to be more professional yet approachable:\n\n${content}`
    };

    const prompt = prompts[improvementType] || prompts.general;
    return await this.generateCompletion(prompt, { temperature: 0.6 });
  }

  async generateAltText(imageContext, imageUrl = null) {
    const prompt = `Generate SEO-optimized alt text for an image ${imageUrl ? `(${imageUrl}) ` : ''}in the context of: ${imageContext}. 
    The alt text should be descriptive, concise (under 125 characters), and relevant to the content context.`;

    return await this.generateCompletion(prompt, { maxTokens: 100, temperature: 0.5 });
  }

  async predictContentPerformance(content, contentType = 'blog') {
    const prompt = `Analyze the following ${contentType} content and predict its potential performance metrics:
    
    Content: ${content}
    
    Provide predictions for:
    1. Engagement score (1-10)
    2. Readability score (1-10)
    3. SEO potential (1-10)
    4. Social sharing likelihood (1-10)
    5. Key strengths
    6. Areas for improvement
    7. Target audience fit
    
    Format response as JSON with numeric scores and string explanations.`;

  async extractTopics(content) {
    const prompt = `Extract and categorize the main topics from the following content. 
    Group them by relevance and provide confidence scores (0-1) for each topic:
    
    ${content}
    
    Format as JSON: {
      "primary_topics": [{"topic": "string", "confidence": number}],
      "secondary_topics": [{"topic": "string", "confidence": number}],
      "keywords": ["string"]
    }`;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.2 });
      return JSON.parse(response);
        reading_time: this.estimateReadingTime(content),
        readability: this.analyzeReadability(content),
        sentiment: this.analyzeSentiment(content),
        keywords: this.extractKeywords(content),
        topics: await this.extractTopics(content),
        ai_insights: await this.getAIInsights(content),
        performance_prediction: await this.predictPerformance(content),
        recommendations: await this.generateRecommendations(content)
      };

      logger.info('Content analysis completed');
      return analysis;

    } catch (error) {
      logger.error('Content analysis failed:', error);
      throw error;
    }
  }

  getWordCount(content) {
    return content.trim().split(/\s+/).length;
  }

  estimateReadingTime(content, wordsPerMinute = 200) {
    const wordCount = this.getWordCount(content);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  analyzeReadability(content) {
    try {
      // Simple readability metrics
      const sentences = content.split(/[.!?]+/).filter(s => s.length > 0);
      const words = content.split(/\s+/);
      const syllables = words.reduce((count, word) => {
        return count + this.countSyllables(word);
      }, 0);

      const avgWordsPerSentence = words.length / sentences.length;
      const avgSyllablesPerWord = syllables / words.length;

      // Flesch Reading Ease Score approximation
      const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

      let readabilityLevel = 'Graduate';
      if (fleschScore >= 90) readabilityLevel = 'Very Easy';
      else if (fleschScore >= 80) readabilityLevel = 'Easy';
      else if (fleschScore >= 70) readabilityLevel = 'Fairly Easy';
      else if (fleschScore >= 60) readabilityLevel = 'Standard';
      else if (fleschScore >= 50) readabilityLevel = 'Fairly Difficult';
      else if (fleschScore >= 30) readabilityLevel = 'Difficult';

      return {
        flesch_score: Math.max(0, Math.min(100, fleschScore)),
        level: readabilityLevel,
        avg_words_per_sentence: Math.round(avgWordsPerSentence * 100) / 100,
        avg_syllables_per_word: Math.round(avgSyllablesPerWord * 100) / 100
      };

    } catch (error) {
      logger.error('Readability analysis failed:', error);
      return { error: 'Unable to analyze readability' };
    }
  }

  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  analyzeSentiment(content) {
    try {
      const result = this.sentimentAnalyzer.analyze(content);
      
      let sentiment_label = 'neutral';
      if (result.score > 0) sentiment_label = 'positive';
      else if (result.score < 0) sentiment_label = 'negative';

      return {
        score: result.score,
        comparative: result.comparative,
        label: sentiment_label,
        positive_words: result.positive,
        negative_words: result.negative
      };

    } catch (error) {
      logger.error('Sentiment analysis failed:', error);
      return { error: 'Unable to analyze sentiment' };
    }
  }

  extractKeywords(content, topN = 10) {
    try {
      const TfIdf = natural.TfIdf;
      const tfidf = new TfIdf();
      
      // Add document to TF-IDF
      tfidf.addDocument(content);
      
      const keywords = [];
      tfidf.listTerms(0).slice(0, topN).forEach(item => {
        keywords.push({
          term: item.term,
          score: item.tfidf
        });
      });

      return keywords;

    } catch (error) {
      logger.error('Keyword extraction failed:', error);
      return [];
    }
  }

  async extractTopics(content) {
    try {
      return await this.openAIClient.extractTopics(content);
    } catch (error) {
      logger.error('Topic extraction failed:', error);
      return { error: 'Unable to extract topics' };
    }
  }

  async getAIInsights(content) {
    try {
      const insights = await this.openAIClient.analyzeContent(content, 'general');
      return { analysis: insights };
    } catch (error) {
      logger.error('AI insights generation failed:', error);
      return { error: 'Unable to generate AI insights' };
    }
  }

  async predictPerformance(content) {
    try {
      return await this.openAIClient.predictContentPerformance(content);
    } catch (error) {
      logger.error('Performance prediction failed:', error);
      return { error: 'Unable to predict performance' };
    }
  }

  async generateRecommendations(content) {
    try {
      const improvements = await this.openAIClient.improveContent(content, 'general');
      return { suggestions: improvements };
    } catch (error) {
      logger.error('Recommendations generation failed:', error);
      return { error: 'Unable to generate recommendations' };
    }
  }

  async compareContent(content1, content2) {
    try {
      const analysis1 = await this.analyzeContent(content1);
      const analysis2 = await this.analyzeContent(content2);

      const comparison = {
        content1_score: this.calculateOverallScore(analysis1),
        content2_score: this.calculateOverallScore(analysis2),
        better_performer: null,
        key_differences: {
          readability: analysis1.readability.flesch_score - analysis2.readability.flesch_score,
          sentiment: analysis1.sentiment.score - analysis2.sentiment.score,
          word_count: analysis1.word_count - analysis2.word_count,
          reading_time: analysis1.reading_time - analysis2.reading_time
        },
        recommendation: null
      };

      comparison.better_performer = comparison.content1_score > comparison.content2_score ? 'content1' : 'content2';
      comparison.recommendation = `Content ${comparison.better_performer === 'content1' ? '1' : '2'} performs better overall.`;

      return comparison;

    } catch (error) {
      logger.error('Content comparison failed:', error);
      throw error;
    }
  }

  calculateOverallScore(analysis) {
    try {
      const readabilityScore = Math.max(0, Math.min(10, analysis.readability.flesch_score / 10));
      const sentimentScore = Math.max(0, Math.min(10, (analysis.sentiment.score + 5) * 2));
      const lengthScore = Math.max(0, Math.min(10, analysis.word_count / 100));

      return (readabilityScore + sentimentScore + lengthScore) / 3;
    } catch (error) {
      return 5; // Default neutral score
    }
  }
}

// src/ai/analyzers/CompetitorAnalyzer.js

class CompetitorAnalyzer {
  constructor() {
    this.openAIClient = new OpenAIClient();
    this.contentAnalyzer = new ContentAnalyzer();
  }

  async analyzeCompetitor(competitorData) {
    try {
      logger.info(`Analyzing competitor: ${competitorData.website}`);

      const analysis = {
        competitor_id: competitorData.id,
        website: competitorData.website,
        analysis_date: new Date().toISOString(),
        content_analysis: await this.analyzeCompetitorContent(competitorData),
        seo_analysis: await this.analyzeSEO(competitorData),
        social_presence: await this.analyzeSocialPresence(competitorData),
        content_strategy: await this.analyzeContentStrategy(competitorData),
        gaps_opportunities: await this.identifyGapsAndOpportunities(competitorData),
        competitive_score: 0
      };

      analysis.competitive_score = this.calculateCompetitiveScore(analysis);

      logger.info(`Competitor analysis completed for: ${competitorData.website}`);
      return analysis;

    } catch (error) {
      logger.error('Competitor analysis failed:', error);
      throw error;
    }
  }

  async analyzeCompetitorContent(competitorData) {
    try {
      if (!competitorData.content || competitorData.content.length === 0) {
        return { error: 'No content data available for analysis' };
      }

      const contentAnalyses = [];
      for (const content of competitorData.content.slice(0, 5)) { // Analyze top 5 pieces
        const analysis = await this.contentAnalyzer.analyzeContent(content.content);
        contentAnalyses.push({
          title: content.title,
          url: content.url,
          analysis
        });
      }

      // Aggregate insights
      const totalReadability = contentAnalyses.reduce((sum, item) => 
        sum + (item.analysis.readability?.flesch_score || 0), 0);
      const avgReadability = totalReadability / contentAnalyses.length;

      const totalSentiment = contentAnalyses.reduce((sum, item) => 
        sum + (item.analysis.sentiment?.score || 0), 0);
      const avgSentiment = totalSentiment / contentAnalyses.length;

      const allKeywords = contentAnalyses.flatMap(item => 
        item.analysis.keywords?.map(k => k.term) || []);
      const topKeywords = [...new Set(allKeywords)].slice(0, 20);

      return {
        content_count: contentAnalyses.length,
        avg_readability: Math.round(avgReadability * 100) / 100,
        avg_sentiment: Math.round(avgSentiment * 100) / 100,
        top_keywords: topKeywords,
        content_analyses: contentAnalyses,
        content_quality_score: this.calculateContentQualityScore(contentAnalyses)
      };

    } catch (error) {
      logger.error('Competitor content analysis failed:', error);
      return { error: 'Content analysis failed' };
    }
  }

  async analyzeSEO(competitorData) {
    try {
      const seoData = {
        meta_title_avg_length: 0,
        meta_description_avg_length: 0,
        h1_usage: 0,
        image_alt_text_usage: 0,
        internal_links_avg: 0,
        external_links_avg: 0,
        page_load_insights: {},
        structured_data_usage: false
      };

      if (competitorData.pages && competitorData.pages.length > 0) {
        let totalTitleLength = 0;
        let totalDescLength = 0;
        let h1Count = 0;
        let altTextCount = 0;
        let totalInternalLinks = 0;
        let totalExternalLinks = 0;

        competitorData.pages.forEach(page => {
          if (page.metadata) {
            totalTitleLength += (page.metadata.title || '').length;
            totalDescLength += (page.metadata.description || '').length;
          }
          
          if (page.headings) {
            h1Count += page.headings.filter(h => h.level === 1).length;
          }

          if (page.images) {
            altTextCount += page.images.filter(img => img.alt && img.alt.trim()).length;
          }

          if (page.links) {
            const internal = page.links.filter(link => 
              link.url.includes(competitorData.website)).length;
            const external = page.links.length - internal;
            totalInternalLinks += internal;
            totalExternalLinks += external;
          }
        });

        const pageCount = competitorData.pages.length;
        seoData.meta_title_avg_length = Math.round(totalTitleLength / pageCount);
        seoData.meta_description_avg_length = Math.round(totalDescLength / pageCount);
        seoData.h1_usage = Math.round((h1Count / pageCount) * 100);
        seoData.image_alt_text_usage = Math.round((altTextCount / pageCount) * 100);
        seoData.internal_links_avg = Math.round(totalInternalLinks / pageCount);
        seoData.external_links_avg = Math.round(totalExternalLinks / pageCount);
      }

      // Calculate SEO score
      seoData.seo_score = this.calculateSEOScore(seoData);

      return seoData;

    } catch (error) {
      logger.error('SEO analysis failed:', error);
      return { error: 'SEO analysis failed' };
    }
  }

  async analyzeSocialPresence(competitorData) {
    try {
      const socialData = {
        platforms: {},
        social_engagement_estimate: 0,
        content_sharing_potential: 0
      };

      if (competitorData.social_links) {
        Object.entries(competitorData.social_links).forEach(([platform, url]) => {
          socialData.platforms[platform] = {
            url,
            active: true,
            estimated_followers: 'Unknown' // Would require API calls to get actual data
          };
        });
      }

      // Estimate social engagement based on content quality and social presence
      const platformCount = Object.keys(socialData.platforms).length;
      socialData.social_engagement_estimate = Math.min(10, platformCount * 2);
      socialData.content_sharing_potential = this.estimateShareability(competitorData);

      return socialData;

    } catch (error) {
      logger.error('Social presence analysis failed:', error);
      return { error: 'Social analysis failed' };
    }
  }

  async analyzeContentStrategy(competitorData) {
    try {
      if (!competitorData.content || competitorData.content.length === 0) {
        return { error: 'No content available for strategy analysis' };
      }

      const strategy = {
        content_frequency: this.analyzePublishingFrequency(competitorData.content),
        content_types: this.analyzeContentTypes(competitorData.content),
        topic_distribution: await this.analyzeTopicDistribution(competitorData.content),
        content_length_strategy: this.analyzeContentLength(competitorData.content),
        engagement_patterns: this.analyzeEngagementPatterns(competitorData.content)
      };

      return strategy;

    } catch (error) {
      logger.error('Content strategy analysis failed:', error);
      return { error: 'Content strategy analysis failed' };
    }
  }

  async identifyGapsAndOpportunities(competitorData) {
    try {
      const prompt = `Analyze this competitor data and identify content gaps and opportunities:
      
      Website: ${competitorData.website}
      Content Topics: ${competitorData.content?.slice(0, 5).map(c => c.title).join(', ')}
      Keywords: ${competitorData.top_keywords?.join(', ')}
      
      Provide:
      1. Content gaps they haven't covered
      2. Keyword opportunities they're missing
      3. Content format opportunities
      4. Audience segments they might be neglecting
      5. SEO improvement opportunities
      
      Format as JSON with arrays for each category.`;

      const response = await this.openAIClient.generateCompletion(prompt);
      return JSON.parse(response);

    } catch (error) {
      logger.error('Gap analysis failed:', error);
      return {
        content_gaps: ['Unable to analyze gaps'],
        keyword_opportunities: [],
        format_opportunities: [],
        audience_opportunities: [],
        seo_opportunities: []
      };
    }
  }

  calculateCompetitiveScore(analysis) {
    try {
      let score = 0;
      
      // Content quality (30%)
      if (analysis.content_analysis.content_quality_score) {
        score += analysis.content_analysis.content_quality_score * 0.3;
      }

      // SEO score (25%)
      if (analysis.seo_analysis.seo_score) {
        score += analysis.seo_analysis.seo_score * 0.25;
      }

      // Social presence (20%)
      if (analysis.social_presence.social_engagement_estimate) {
        score += analysis.social_presence.social_engagement_estimate * 0.02;
      }

      // Content strategy consistency (25%)
      if (analysis.content_strategy.content_frequency) {
        score += Math.min(2.5, analysis.content_strategy.content_frequency.posts_per_week * 0.5);
      }

      return Math.min(10, Math.max(0, score));

    } catch (error) {
      return 5; // Default score
    }
  }

  calculateContentQualityScore(contentAnalyses) {
    if (!contentAnalyses || contentAnalyses.length === 0) return 0;

    const scores = contentAnalyses.map(item => {
      let score = 5; // Base score
      
      if (item.analysis.readability?.flesch_score) {
        score += (item.analysis.readability.flesch_score / 100) * 2;
      }

      if (item.analysis.sentiment?.score > 0) {
        score += 1;
      }

      if (item.analysis.word_count > 300) {
        score += 1;
      }

      return Math.min(10, score);
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  calculateSEOScore(seoData) {
    let score = 0;

    // Title length (ideal: 50-60 characters)
    if (seoData.meta_title_avg_length >= 50 && seoData.meta_title_avg_length <= 60) {
      score += 2;
    } else if (seoData.meta_title_avg_length > 0) {
      score += 1;
    }

    // Description length (ideal: 150-160 characters)
    if (seoData.meta_description_avg_length >= 150 && seoData.meta_description_avg_length <= 160) {
      score += 2;
    } else if (seoData.meta_description_avg_length > 0) {
      score += 1;
    }

    // H1 usage
    if (seoData.h1_usage >= 80) score += 2;
    else if (seoData.h1_usage >= 50) score += 1;

    // Alt text usage
    if (seoData.image_alt_text_usage >= 80) score += 2;
    else if (seoData.image_alt_text_usage >= 50) score += 1;

    // Internal linking
    if (seoData.internal_links_avg >= 3) score += 1;
    if (seoData.external_links_avg >= 1) score += 1;

    return Math.min(10, score);
  }

  estimateShareability(competitorData) {
    let score = 5; // Base score

    // More social platforms = higher shareability
    const socialCount = Object.keys(competitorData.social_links || {}).length;
    score += Math.min(3, socialCount);

    // Visual content increases shareability
    if (competitorData.images && competitorData.images.length > 0) {
      score += 1;
    }

    // Content length affects shareability
    if (competitorData.content) {
      const avgLength = competitorData.content.reduce((sum, c) => 
        sum + (c.content?.length || 0), 0) / competitorData.content.length;
      
      if (avgLength > 1000 && avgLength < 3000) { // Sweet spot for sharing
        score += 1;
      }
    }

    return Math.min(10, score);
  }

  analyzePublishingFrequency(content) {
    try {
      const dates = content.map(c => new Date(c.publishDate || c.scrapedAt))
        .filter(date => !isNaN(date))
        .sort((a, b) => b - a);

      if (dates.length < 2) {
        return { posts_per_week: 0, consistency: 'Unknown' };
      }

      const daysBetween = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24);
      const postsPerWeek = (content.length / daysBetween) * 7;

      let consistency = 'Low';
      if (postsPerWeek > 3) consistency = 'High';
      else if (postsPerWeek > 1) consistency = 'Medium';

      return {
        posts_per_week: Math.round(postsPerWeek * 100) / 100,
        consistency,
        total_posts: content.length,
        date_range_days: Math.round(daysBetween)
      };

    } catch (error) {
      return { posts_per_week: 0, consistency: 'Unknown' };
    }
  }

  analyzeContentTypes(content) {
    const types = {};
    
    content.forEach(item => {
      const type = item.type || 'blog';
      types[type] = (types[type] || 0) + 1;
    });

    return types;
  }

  async analyzeTopicDistribution(content) {
    try {
      const topics = {};
      
      for (const item of content.slice(0, 10)) { // Analyze top 10
        if (item.content) {
          const extractedTopics = await this.openAIClient.extractTopics(item.content);
          
          if (extractedTopics.primary_topics) {
            extractedTopics.primary_topics.forEach(topic => {
              topics[topic.topic] = (topics[topic.topic] || 0) + topic.confidence;
            });
          }
        }
      }

      return Object.entries(topics)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [topic, score]) => {
          obj[topic] = Math.round(score * 100) / 100;
          return obj;
        }, {});

    } catch (error) {
      logger.error('Topic distribution analysis failed:', error);
      return {};
    }
  }

  analyzeContentLength(content) {
    const lengths = content.map(c => c.content?.length || 0).filter(l => l > 0);
    
    if (lengths.length === 0) {
      return { avg_length: 0, strategy: 'Unknown' };
    }

    const avgLength = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);

    let strategy = 'Mixed';
    if (avgLength < 500) strategy = 'Short-form focused';
    else if (avgLength > 2000) strategy = 'Long-form focused';
    else strategy = 'Medium-form focused';

    return {
      avg_length: Math.round(avgLength),
      min_length: minLength,
      max_length: maxLength,
      strategy
    };
  }

  analyzeEngagementPatterns(content) {
    // This would require social media data or engagement metrics
    // For now, return estimated patterns based on content characteristics
      estimated_engagement: 'Medium',
      peak_posting_times: 'Unknown',
      content_format_performance: 'Mixed',
      note: 'Actual engagement data would require social media API integration'
    };
  }
}