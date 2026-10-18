import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Document } from '@langchain/core/documents';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(session({
  name: 'support.sid', secret: process.env.SESSION_SECRET || 'dev-only-change-this-session-secret-123456',
  resave: false, saveUninitialized: false, rolling: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/subscription_support_desk', collectionName: 'sessions', ttl: 60 * 60 * 8 }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 8 * 60 * 60 * 1000 }
}));
const csrfSecret = process.env.CSRF_SECRET || 'dev-only-change-this-csrf-secret-123456';
const csrfFor = sid => crypto.createHmac('sha256', csrfSecret).update(sid).digest('hex');
const safeEqual = (a,b) => { const aa=Buffer.from(String(a||'')), bb=Buffer.from(String(b||'')); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); };

const userSchema = new mongoose.Schema({
  name: String, email: {type:String, unique:true, lowercase:true}, passwordHash: String,
  role: {type:String, enum:['customer','specialist','knowledge_manager','supervisor'], default:'customer'},
  orgId: {type:mongoose.Schema.Types.ObjectId, ref:'Organization', default:null},
  emailVerified: {type:Boolean, default:false}, verificationCodeHash:String, verificationExpires:Date,
  resetCodeHash:String, resetExpires:Date
}, {timestamps:true});
const orgSchema = new mongoose.Schema({name:String, slug:String, planId:{type:mongoose.Schema.Types.ObjectId, ref:'Plan'}},{timestamps:true});
const planSchema = new mongoose.Schema({name:String, limits:mongoose.Schema.Types.Mixed, features:[String]});
const entitlementSchema = new mongoose.Schema({orgId:mongoose.Schema.Types.ObjectId, feature:String, allowed:Boolean, limit:Number, used:Number, updatedAt:Date});
const helpSchema = new mongoose.Schema({
  title:String, slug:String, productVersion:String, version:Number, status:{type:String,default:'draft'},
  tags:[String], body:String, embedding:[Number], publishedAt:Date, createdBy:mongoose.Schema.Types.ObjectId
},{timestamps:true});
helpSchema.index({title:'text',body:'text',tags:'text'});
const incidentSchema = new mongoose.Schema({title:String, feature:String, status:String, severity:String, summary:String, startedAt:Date, updatedAt:Date, public:Boolean},{timestamps:true});
const ticketSchema = new mongoose.Schema({
  orgId:mongoose.Schema.Types.ObjectId, createdBy:mongoose.Schema.Types.ObjectId,
  subject:String, question:String, status:{type:String,default:'open'},
  priority:{type:String,default:'normal'}, assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},
  conversation:[{role:String,content:String,citations:[mongoose.Schema.Types.Mixed],createdAt:{type:Date,default:Date.now}}],
  checks:[mongoose.Schema.Types.Mixed], resolution:String, escalationReason:String, relatedIncidentIds:[mongoose.Schema.Types.ObjectId]
},{timestamps:true});
const assignmentSchema = new mongoose.Schema({ticketId:mongoose.Schema.Types.ObjectId, specialistId:mongoose.Schema.Types.ObjectId, assignedBy:mongoose.Schema.Types.ObjectId, active:Boolean, createdAt:Date});
const toolRunSchema = new mongoose.Schema({ticketId:mongoose.Schema.Types.ObjectId, orgId:mongoose.Schema.Types.ObjectId, tool:String, status:String, summary:String, durationMs:Number, createdAt:{type:Date,default:Date.now}});
const User=mongoose.model('User',userSchema), Organization=mongoose.model('Organization',orgSchema), Plan=mongoose.model('Plan',planSchema),
 Entitlement=mongoose.model('Entitlement',entitlementSchema), HelpArticle=mongoose.model('HelpArticle',helpSchema), Incident=mongoose.model('Incident',incidentSchema),
 Ticket=mongoose.model('Ticket',ticketSchema), Assignment=mongoose.model('Assignment',assignmentSchema), ToolRun=mongoose.model('ToolRun',toolRunSchema);

const asyncRoute = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const requireAuth = (req,res,next)=>req.session.userId ? next() : res.status(401).json({error:'Authentication required'});
const requireRole = (...roles)=>(req,res,next)=>roles.includes(req.session.role) ? next() : res.status(403).json({error:'Insufficient permission'});
const csrf = (req,res,next) => {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  if (!req.session.userId) return next();
  if (!safeEqual(req.get('x-csrf-token'), csrfFor(req.sessionID))) return res.status(403).json({error:'CSRF validation failed'});
  next();
};
app.use('/api', csrf);
const loginLimiter = rateLimit({windowMs:15*60*1000, limit:10, standardHeaders:true, legacyHeaders:false, message:{error:'Too many login attempts. Try again later.'}});
const emailSchema=z.string().email().max(254).transform(s=>s.toLowerCase());
const passwordSchema=z.string().min(10).max(128);
const hashCode=code=>crypto.createHash('sha256').update(code).digest('hex');
app.get('/api/csrf', (req,res)=>res.json({token:csrfFor(req.sessionID)}));
app.get('/api/me', (req,res)=>res.json({user:req.session.userId?{id:req.session.userId,name:req.session.name,email:req.session.email,role:req.session.role,orgId:req.session.orgId}:null,csrf:csrfFor(req.sessionID)}));

app.post('/api/auth/signup', asyncRoute(async(req,res)=>{
  const schema=z.object({name:z.string().min(1).max(80),email:emailSchema,password:passwordSchema,organization:z.string().min(1).max(80)});
  const data=schema.parse(req.body);
  if(await User.findOne({email:data.email})) return res.status(409).json({error:'Email already registered'});
  let org=await Organization.findOne({slug:data.organization.toLowerCase().replace(/[^a-z0-9]+/g,'-')});
  if(!org) org=await Organization.create({name:data.organization,slug:data.organization.toLowerCase().replace(/[^a-z0-9]+/g,'-')});
  const code=String(crypto.randomInt(100000,999999));
  const user=await User.create({name:data.name,email:data.email,passwordHash:await bcrypt.hash(data.password,12),role:'customer',orgId:org._id,emailVerified:false,verificationCodeHash:hashCode(code),verificationExpires:new Date(Date.now()+15*60*1000)});
  console.log(`[DEV EMAIL VERIFICATION] ${user.email}: ${code}`);
  res.status(201).json({message:'Account created. Enter the verification code printed in the API console.',userId:user._id});
}));
app.post('/api/auth/verify-email', asyncRoute(async(req,res)=>{
  const {email,code}=z.object({email:emailSchema,code:z.string().length(6)}).parse(req.body);
  const user=await User.findOne({email});
  if(!user||!user.verificationExpires||user.verificationExpires<Date.now()||!safeEqual(user.verificationCodeHash,hashCode(code))) return res.status(400).json({error:'Invalid or expired verification code'});
  user.emailVerified=true; user.verificationCodeHash=undefined; user.verificationExpires=undefined; await user.save();
  res.json({message:'Email verified. You can log in.'});
}));
app.post('/api/auth/login',loginLimiter,asyncRoute(async(req,res)=>{
  const {email,password}=z.object({email:emailSchema,password:z.string().min(1).max(128)}).parse(req.body);
  const user=await User.findOne({email});
  if(!user||!await bcrypt.compare(password,user.passwordHash)) return res.status(401).json({error:'Invalid email or password'});
  if(!user.emailVerified) return res.status(403).json({error:'Verify your email before logging in'});
  req.session.regenerate(err=>{if(err) return res.status(500).json({error:'Could not create session'}); Object.assign(req.session,{userId:String(user._id),name:user.name,email:user.email,role:user.role,orgId:user.orgId?String(user.orgId):null}); req.session.save(e=>e?res.status(500).json({error:'Could not save session'}):res.json({user:{id:user._id,name:user.name,email:user.email,role:user.role,orgId:user.orgId},csrf:csrfFor(req.sessionID)}));});
}));
app.post('/api/auth/logout',requireAuth,(req,res)=>req.session.destroy(()=>{res.clearCookie('support.sid');res.json({message:'Logged out'});}));
app.post('/api/auth/recovery',asyncRoute(async(req,res)=>{
  const {email}=z.object({email:emailSchema}).parse(req.body); const user=await User.findOne({email});
  if(user){const code=String(crypto.randomInt(100000,999999));user.resetCodeHash=hashCode(code);user.resetExpires=new Date(Date.now()+15*60*1000);await user.save();console.log(`[DEV PASSWORD RECOVERY] ${email}: ${code}`);}
  res.json({message:'If the account exists, a recovery code has been sent.'});
}));
app.post('/api/auth/reset-password',asyncRoute(async(req,res)=>{
  const {email,code,password}=z.object({email:emailSchema,code:z.string().length(6),password:passwordSchema}).parse(req.body);
  const user=await User.findOne({email});
  if(!user||!user.resetExpires||user.resetExpires<Date.now()||!safeEqual(user.resetCodeHash,hashCode(code)))return res.status(400).json({error:'Invalid or expired recovery code'});
  user.passwordHash=await bcrypt.hash(password,12);user.resetCodeHash=undefined;user.resetExpires=undefined;await user.save();res.json({message:'Password updated'});
}));

app.get('/api/help',asyncRoute(async(req,res)=>{
  const filter={status:'published'}; if(req.query.version) filter.productVersion=String(req.query.version);
  const docs=await HelpArticle.find(filter).select('title slug productVersion version tags body publishedAt').sort({slug:1,version:-1});
  res.json({articles:docs});
}));
app.get('/api/status',asyncRoute(async(req,res)=>{
  const incidents=await Incident.find({public:true}).select('title feature status severity summary startedAt updatedAt').sort({updatedAt:-1});
  res.json({incidents});
}));
async function getTicket(req, ticketId) {
  const ticket=await Ticket.findById(ticketId); if(!ticket)return {error:[404,'Ticket not found']};
  const role=req.session.role, uid=req.session.userId;
  if(role==='customer' && (String(ticket.createdBy)!==uid || String(ticket.orgId)!==String(req.session.orgId))) return {error:[404,'Ticket not found']};
  if(role==='specialist' && String(ticket.assignedTo)!==uid) return {error:[404,'Ticket not found']};
  if(!['customer','specialist','supervisor','knowledge_manager'].includes(role)) return {error:[403,'Forbidden']};
  return {ticket};
}
app.post('/api/tickets',requireAuth,requireRole('customer'),asyncRoute(async(req,res)=>{
  const {subject,question}=z.object({subject:z.string().min(3).max(160),question:z.string().min(5).max(5000)}).parse(req.body);
  const ticket=await Ticket.create({orgId:req.session.orgId,createdBy:req.session.userId,subject,question,conversation:[{role:'customer',content:question}]});
  res.status(201).json({ticket});
}));
app.get('/api/tickets',requireAuth,asyncRoute(async(req,res)=>{
  let filter={};
  if(req.session.role==='customer')filter={createdBy:req.session.userId,orgId:req.session.orgId};
  else if(req.session.role==='specialist')filter={assignedTo:req.session.userId};
  else if(!['supervisor','knowledge_manager'].includes(req.session.role))return res.status(403).json({error:'Forbidden'});
  const tickets=await Ticket.find(filter).sort({updatedAt:-1}).limit(100).select('-conversation');
  res.json({tickets});
}));
app.get('/api/tickets/:id',requireAuth,asyncRoute(async(req,res)=>{
  const result=await getTicket(req,req.params.id); if(result.error)return res.status(result.error[0]).json({error:result.error[1]});res.json({ticket:result.ticket});
}));
app.patch('/api/tickets/:id',requireAuth,requireRole('specialist','supervisor'),asyncRoute(async(req,res)=>{
  const result=await getTicket(req,req.params.id);if(result.error)return res.status(result.error[0]).json({error:result.error[1]});
  const patch=z.object({status:z.enum(['open','waiting_customer','in_progress','resolved','escalated']).optional(),priority:z.enum(['low','normal','high','urgent']).optional()}).parse(req.body);
  Object.assign(result.ticket,patch);await result.ticket.save();res.json({ticket:result.ticket});
}));
app.post('/api/tickets/:id/resolution',requireAuth,requireRole('specialist','supervisor'),asyncRoute(async(req,res)=>{
  const result=await getTicket(req,req.params.id);if(result.error)return res.status(result.error[0]).json({error:result.error[1]});
  const {resolution}=z.object({resolution:z.string().min(10).max(4000)}).parse(req.body);
  result.ticket.resolution=resolution;result.ticket.status='resolved';await result.ticket.save();res.json({ticket:result.ticket});
}));
app.post('/api/tickets/:id/escalation',requireAuth,requireRole('customer','specialist','supervisor'),asyncRoute(async(req,res)=>{
  const result=await getTicket(req,req.params.id);if(result.error)return res.status(result.error[0]).json({error:result.error[1]});
  const {reason}=z.object({reason:z.string().min(5).max(1000)}).parse(req.body);
  result.ticket.status='escalated';result.ticket.escalationReason=reason;await result.ticket.save();res.json({ticket:result.ticket});
}));
app.post('/api/tickets/:id/assignment',requireAuth,requireRole('supervisor'),asyncRoute(async(req,res)=>{
  const ticket=await Ticket.findById(req.params.id);if(!ticket)return res.status(404).json({error:'Ticket not found'});
  const {specialistId}=z.object({specialistId:z.string().min(1)}).parse(req.body);const specialist=await User.findById(specialistId);
  if(!specialist||specialist.role!=='specialist')return res.status(400).json({error:'Choose a valid specialist'});
  ticket.assignedTo=specialist._id;await ticket.save();await Assignment.create({ticketId:ticket._id,specialistId:specialist._id,assignedBy:req.session.userId,active:true});res.json({ticket});
}));
async function readEntitlements(orgId) {
  const [org, entitlements]=await Promise.all([Organization.findById(orgId).populate('planId'),Entitlement.find({orgId})]);
  if(!org)return {ok:false,error:'Organization record unavailable'};
  return {ok:true,organization:org.name,plan:org.planId?.name||'Unassigned',entitlements:entitlements.map(e=>({feature:e.feature,allowed:e.allowed,limit:e.limit,used:e.used}))};
}
async function readServiceStatus(feature) {
  const incidents=await Incident.find({public:true,status:{$in:['investigating','identified','monitoring']},...(feature?{feature:new RegExp(feature,'i')}:{})}).select('title feature status severity summary updatedAt');
  return {ok:true,incidents};
}
async function searchHelp(question, version='1.0') {
  let articles=[];
  try {
    if(process.env.ATLAS_VECTOR_INDEX && process.env.OLLAMA_BASE_URL) {
      const embeddings=new OllamaEmbeddings({baseUrl:process.env.OLLAMA_BASE_URL,model:process.env.EMBEDDING_MODEL||'nomic-embed-text'});
      const vector=await embeddings.embedQuery(question);
      articles=await HelpArticle.aggregate([{$vectorSearch:{index:process.env.ATLAS_VECTOR_INDEX,path:'embedding',queryVector:vector,numCandidates:50,limit:5,filter:{status:'published'}}},{$project:{title:1,body:1,slug:1,version:1,productVersion:1,tags:1,score:{$meta:'vectorSearchScore'}}}]);
    }
  } catch(e) { console.warn('Vector search unavailable; using text retrieval:',e.message); }
  if(!articles.length) {
    const terms=question.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>2);
    const published=await HelpArticle.find({status:'published',productVersion:version}).select('title body slug version productVersion tags');
    articles=published.map(a=>({...a.toObject(),score:terms.reduce((n,t)=>n+(`${a.title} ${a.body} ${(a.tags||[]).join(' ')}`.toLowerCase().includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score).slice(0,5);
  }
  return articles.map(a=>({title:a.title,slug:a.slug,version:a.version,productVersion:a.productVersion,excerpt:a.body,score:a.score}));
}
async function runCheck(ticket, tool, fn) {
  const started=Date.now();
  try {const result=await fn(); await ToolRun.create({ticketId:ticket?._id,orgId:ticket?.orgId,tool,status:result?.ok===false?'incomplete':'success',summary:toolSummary(tool,result),durationMs:Date.now()-started});return {tool,status:result?.ok===false?'incomplete':'success',result};}
  catch(e){await ToolRun.create({ticketId:ticket?._id,orgId:ticket?.orgId,tool,status:'incomplete',summary:'Tool failed; diagnosis is incomplete.',durationMs:Date.now()-started});return {tool,status:'incomplete',error:'Check unavailable; diagnosis is incomplete.'};}
}
function toolSummary(tool,r){if(r?.ok===false)return r.error||'Data unavailable';if(tool==='readEntitlements')return `Read ${r.entitlements?.length||0} organization entitlements`;if(tool==='readServiceStatus')return `${r.incidents?.length||0} matching active incidents`;return `Retrieved ${r?.length||0} help articles`;}
async function answerSupport(question, orgId, ticket, version='1.0') {
  const checks=[];
  checks.push(await runCheck(ticket,'readEntitlements',()=>readEntitlements(orgId)));
  const feature=question.toLowerCase().includes('export')?'export':question.toLowerCase().includes('login')?'login':'';
  checks.push(await runCheck(ticket,'readServiceStatus',()=>readServiceStatus(feature)));
  checks.push(await runCheck(ticket,'searchHelp',()=>searchHelp(question,version)));
  const ent=checks[0].result, incidents=checks[1].result, articles=checks[2].result;
  let grounded = [];
  if(ent?.ok) grounded.push(`Organization plan: ${ent.plan}. Entitlements: ${ent.entitlements.map(e=>`${e.feature}: ${e.allowed?'enabled':'not included'}${Number.isFinite(e.limit)?` (limit ${e.limit}, used ${e.used})`:''}`).join('; ')||'No entitlement records found'}.`);
  else grounded.push('Organization entitlement check is incomplete; I cannot confirm plan access.');
  if(incidents?.ok) grounded.push(incidents.incidents.length?`Relevant active service incidents: ${incidents.incidents.map(i=>`${i.title} (${i.status}): ${i.summary}`).join('; ')}.`:'No matching active public incident was found in the simulated status data.');
  else grounded.push('Service status check is incomplete; I cannot confirm whether an incident is active.');
  if(articles?.length) grounded.push(`Help guidance: ${articles.slice(0,3).map(a=>`${a.title}: ${a.excerpt}`).join('\n')}`);
  else grounded.push('No matching published help article was found for this version.');
  let response=grounded.join('\n\n');
  const citations=(articles||[]).slice(0,3).map(a=>({title:a.title,slug:a.slug,version:a.version,productVersion:a.productVersion}));
  const canUseModel=process.env.OLLAMA_BASE_URL&&process.env.OLLAMA_MODEL&&checks.every(c=>c.status==='success');
  if(canUseModel) {
    try {
      const model=new ChatOllama({baseUrl:process.env.OLLAMA_BASE_URL,model:process.env.OLLAMA_MODEL,temperature:0});
      const result=await model.invoke([
        new SystemMessage('You are a careful SaaS support assistant. Answer only from the supplied evidence. Do not invent plan details, incidents, refunds, or upgrades. If evidence is missing or conflicting, say so and recommend human review. Keep customer data private.'),
        new HumanMessage(`Customer question: ${question}\n\nVerified evidence:\n${response}\n\nHelp citations available: ${JSON.stringify(citations)}\n\nGive a concise source-grounded answer. Cite help titles in square brackets. Do not claim an action was taken.`)
      ]);
      response=String(result.content||response);
    } catch(e){console.warn('Ollama unavailable; using grounded fallback:',e.message);}
  }
  return {answer:response,citations,checks:checks.map(c=>({tool:c.tool,status:c.status,result:c.result?{ok:c.result.ok,summary:toolSummary(c.tool,c.result)}:undefined,error:c.error})),needsHumanReview:checks.some(c=>c.status!=='success')||!articles?.length};
}
app.post('/api/support-chat',requireAuth,asyncRoute(async(req,res)=>{
  const {question,version}=z.object({question:z.string().min(5).max(5000),version:z.string().max(30).optional()}).parse(req.body);
  if(!req.session.orgId)return res.status(403).json({error:'Customer organization scope is missing'});
  const result=await answerSupport(question,req.session.orgId,null,version||'1.0');res.json(result);
}));
app.post('/api/support-agent',requireAuth,requireRole('customer','specialist','supervisor'),asyncRoute(async(req,res)=>{
  const {question,ticketId,version}=z.object({question:z.string().min(5).max(5000),ticketId:z.string().optional(),version:z.string().max(30).optional()}).parse(req.body);
  let ticket=null;
  if(ticketId){const checked=await getTicket(req,ticketId);if(checked.error)return res.status(checked.error[0]).json({error:checked.error[1]});ticket=checked.ticket;}
  const orgId=req.session.role==='customer'?req.session.orgId:(ticket?.orgId);
  if(!orgId)return res.status(400).json({error:'A ticket is required for staff investigation'});
  const result=await answerSupport(question,orgId,ticket,version||'1.0');
  if(ticket){ticket.checks=result.checks;ticket.conversation.push({role:'assistant',content:result.answer,citations:result.citations});await ticket.save();}
  res.json({...result,ticketId:ticket?String(ticket._id):null});
}));
app.get('/api/specialists',requireAuth,requireRole('supervisor'),asyncRoute(async(req,res)=>res.json({specialists:await User.find({role:'specialist'}).select('name email')})));
app.get('/api/tool-runs',requireAuth,requireRole('specialist','supervisor'),asyncRoute(async(req,res)=>{
  const ticketId=String(req.query.ticketId||'');if(!ticketId)return res.status(400).json({error:'ticketId required'});
  const checked=await getTicket(req,ticketId);if(checked.error)return res.status(checked.error[0]).json({error:checked.error[1]});
  res.json({runs:await ToolRun.find({ticketId}).sort({createdAt:-1}).limit(50).select('tool status summary durationMs createdAt')});
}));
app.post('/api/help-drafts',requireAuth,requireRole('knowledge_manager'),asyncRoute(async(req,res)=>{
  const data=z.object({title:z.string().min(3).max(160),slug:z.string().min(3).max(160).regex(/^[a-z0-9-]+$/),productVersion:z.string().min(1).max(30),tags:z.array(z.string().max(40)).max(20).default([]),body:z.string().min(20).max(15000)}).parse(req.body);
  const latest=await HelpArticle.findOne({slug:data.slug}).sort({version:-1});
  const draft=await HelpArticle.create({...data,version:(latest?.version||0)+1,status:'draft',createdBy:req.session.userId});res.status(201).json({article:draft});
}));
app.post('/api/help-drafts/:id/publish',requireAuth,requireRole('knowledge_manager'),asyncRoute(async(req,res)=>{
  const article=await HelpArticle.findById(req.params.id);if(!article)return res.status(404).json({error:'Draft not found'});
  await HelpArticle.updateMany({slug:article.slug,status:'published'},{$set:{status:'archived'}});
  article.status='published';article.publishedAt=new Date();await article.save();res.json({article});
}));
app.get('/api/help-drafts',requireAuth,requireRole('knowledge_manager'),asyncRoute(async(req,res)=>res.json({articles:await HelpArticle.find({status:'draft'}).sort({updatedAt:-1})})));
app.use((err,req,res,next)=>{
  if(err instanceof z.ZodError)return res.status(400).json({error:'Invalid request',details:err.issues.map(i=>({path:i.path.join('.'),message:i.message}))});
  console.error(err);res.status(500).json({error:'Internal server error'});
});
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/subscription_support_desk');
app.listen(PORT,()=>console.log(`Support Desk API running at http://localhost:${PORT}`));
