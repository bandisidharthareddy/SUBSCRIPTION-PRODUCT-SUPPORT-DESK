import { z } from 'zod';
import * as helpService from '../services/helpService.js';

export const getHelpArticles = async (req, res) => {
  const version = req.query.version ? String(req.query.version) : undefined;
  const articles = await helpService.getPublishedArticles(version);
  res.json({ articles });
};

export const getStatus = async (req, res) => {
  const incidents = await helpService.getPublicIncidents();
  res.json({ incidents });
};

export const createHelpDraft = async (req, res) => {
  const schema = z.object({
    title: z.string().min(3).max(160),
    slug: z.string().min(3).max(160).regex(/^[a-z0-9-]+$/),
    productVersion: z.string().min(1).max(30),
    tags: z.array(z.string().max(40)).max(20).default([]),
    body: z.string().min(20).max(15000)
  });
  const data = schema.parse(req.body);
  const article = await helpService.createDraft(data, req.session.userId);
  res.status(201).json({ article });
};

export const publishHelpDraft = async (req, res) => {
  const article = await helpService.publishDraft(req.params.id);
  res.json({ article });
};

export const getHelpDrafts = async (req, res) => {
  const articles = await helpService.getDrafts();
  res.json({ articles });
};
