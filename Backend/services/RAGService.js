import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const kbPath = path.resolve(__dirname, '../data/knowledge_base.json');

class RAGService {
  constructor() {
    this.extractor = null;
    this.kbEmbeddings = []; // In-memory cached embeddings
    this.initialized = false;
    this.initPromise = null;
  }

  // Ensure init runs concurrently safe and only once
  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[RAG] Initializing Embedding Pipeline (Xenova/all-MiniLM-L6-v2)...');
        this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('[RAG] Embedding Pipeline Loaded.');

        if (fs.existsSync(kbPath)) {
          const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
          console.log(`[RAG] Embedding ${kbData.length} articles from knowledge base...`);

          for (const article of kbData) {
            const textToEmbed = `Title: ${article.title}\nContent: ${article.content}`;
            const embedding = await this._getEmbedding(textToEmbed);
            this.kbEmbeddings.push({
              id: article.id,
              title: article.title,
              content: article.content,
              embedding
            });
          }
          console.log('[RAG] Knowledge Base embedded and cached in-memory.');
        } else {
          console.error(`[RAG] Knowledge base file not found at ${kbPath}`);
        }
        this.initialized = true;
      } catch (err) {
        console.error('[RAG] Initialization failed:', err);
        this.initPromise = null; // Allow retry
        throw err;
      }
    })();

    return this.initPromise;
  }

  async _getEmbedding(text) {
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async search(query, limit = 3) {
    await this.init();

    try {
      const queryEmbedding = await this._getEmbedding(query);
      const results = this.kbEmbeddings.map(article => {
        const similarity = this.cosineSimilarity(queryEmbedding, article.embedding);
        return {
          id: article.id,
          title: article.title,
          content: article.content,
          similarity
        };
      });

      // Sort by similarity descending
      results.sort((a, b) => b.similarity - a.similarity);

      // Return top N context
      return results.slice(0, limit);
    } catch (err) {
      console.error('[RAG] Search error:', err);
      return []; // Return empty on error to gracefully fall back
    }
  }
}

export default new RAGService();
