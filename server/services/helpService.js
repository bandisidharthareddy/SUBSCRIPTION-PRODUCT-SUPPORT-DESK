import { OllamaEmbeddings } from '@langchain/ollama';
import { HelpArticle, Incident } from '../models/index.js';

export async function getPublishedArticles(version) {
  const filter = { status: 'published' };
  if (version) {
    filter.productVersion = String(version);
  }
  return HelpArticle.find(filter)
    .select('title slug productVersion version tags body publishedAt')
    .sort({ slug: 1, version: -1 });
}

export async function getPublicIncidents() {
  return Incident.find({ public: true })
    .select('title feature status severity summary startedAt updatedAt')
    .sort({ updatedAt: -1 });
}

export async function createDraft(data, userId) {
  const latest = await HelpArticle.findOne({ slug: data.slug }).sort({ version: -1 });
  const nextVersion = (latest?.version || 0) + 1;
  
  return HelpArticle.create({
    title: data.title,
    slug: data.slug,
    productVersion: data.productVersion,
    tags: data.tags || [],
    body: data.body,
    version: nextVersion,
    status: 'draft',
    createdBy: userId
  });
}

export async function publishDraft(articleId) {
  const article = await HelpArticle.findById(articleId);
  if (!article) {
    throw new Error('Draft not found');
  }

  await HelpArticle.updateMany(
    { slug: article.slug, status: 'published' },
    { $set: { status: 'archived' } }
  );

  article.status = 'published';
  article.publishedAt = new Date();
  await article.save();
  return article;
}

export async function getDrafts() {
  return HelpArticle.find({ status: 'draft' }).sort({ updatedAt: -1 });
}

export async function searchHelp(question, version = '1.0') {
  let articles = [];

  // 1. Attempt Atlas Vector Search if configured
  if (process.env.ATLAS_VECTOR_INDEX && process.env.OLLAMA_BASE_URL) {
    try {
      const embeddings = new OllamaEmbeddings({
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: process.env.EMBEDDING_MODEL || 'nomic-embed-text'
      });
      const vector = await embeddings.embedQuery(question);
      articles = await HelpArticle.aggregate([
        {
          $vectorSearch: {
            index: process.env.ATLAS_VECTOR_INDEX,
            path: 'embedding',
            queryVector: vector,
            numCandidates: 50,
            limit: 5,
            filter: { status: 'published' }
          }
        },
        {
          $project: {
            title: 1,
            body: 1,
            slug: 1,
            version: 1,
            productVersion: 1,
            tags: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ]);
    } catch (err) {
      console.warn('Vector search unavailable; falling back to deterministic keyword retrieval:', err.message);
    }
  }

  // 2. Deterministic keyword retrieval fallback
  if (!articles.length) {
    const terms = question.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
    const published = await HelpArticle.find({ status: 'published', productVersion: version })
      .select('title body slug version productVersion tags');

    articles = published.map(a => {
      const text = `${a.title} ${a.body} ${(a.tags || []).join(' ')}`.toLowerCase();
      const score = terms.reduce((acc, term) => acc + (text.includes(term) ? 1 : 0), 0);
      return { ...a.toObject(), score };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  }

  return articles.map(a => ({
    title: a.title,
    slug: a.slug,
    version: a.version,
    productVersion: a.productVersion,
    excerpt: a.body,
    score: a.score
  }));
}
