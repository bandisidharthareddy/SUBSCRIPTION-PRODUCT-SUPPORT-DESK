import mongoose from 'mongoose';

const helpArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 160
  },
  productVersion: {
    type: String,
    required: true,
    default: '1.0'
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  tags: {
    type: [String],
    default: []
  },
  body: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    default: undefined
  },
  publishedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

helpArticleSchema.index({ title: 'text', body: 'text', tags: 'text' });
helpArticleSchema.index({ slug: 1, version: -1 });
helpArticleSchema.index({ status: 1, productVersion: 1 });

export const HelpArticle = mongoose.model('HelpArticle', helpArticleSchema);
export default HelpArticle;
