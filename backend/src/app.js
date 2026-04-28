import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { health } from './handlers/health.js';
import { exchangeToken, getUserInfo, getMe } from './handlers/auth.js';
import { getStats } from './handlers/dashboard.js';
import { list, get, getIeComments, getEdcCommentsSummary } from './handlers/test-guidelines.js';
import { submitComment, getMyComments, submitLeComment, getLeComments, getMyLeComments } from './handlers/ie-comments.js';
import { submitEdcComment, getEdcComments, getMyEdcComments } from './handlers/edc-comments.js';
import { open as openEdit } from './handlers/chapters/edit.js';
import { update as updateCh00 } from './handlers/chapters/chapter-00.js';
import { update as updateCh01 } from './handlers/chapters/chapter-01.js';
import { update as updateCh02 } from './handlers/chapters/chapter-02.js';
import { update as updateCh03, createPropMethodHandler, updatePropMethodHandler, deletePropMethodHandler } from './handlers/chapters/chapter-03.js';
import { update as updateCh04 } from './handlers/chapters/chapter-04.js';
import { get as getCh05, update as updateCh05 } from './handlers/chapters/chapter-05.handler.js';
import { update as updateCh06 } from './handlers/chapters/chapter-06.js';
import { update as updateCh09 } from './handlers/chapters/chapter-09.js';
import { update as updateCh11 } from './handlers/chapters/chapter-11.js';
import { create as createExpl, update as updateExpl08, remove as removeExpl08 } from './handlers/chapters/chapter-08.js';
import { create as createParagraph, update as updateParagraph, remove as removeParagraph } from './handlers/chapters/paragraphs.js';
import { list as listChars, create as createChar, update as updateChar, remove as removeChar, reorder as reorderChars, createExpr, updateExpr, removeExpr, searchAdoptedHandler } from './handlers/chapters/chapter-07.js';
import { update as updateCh10, createSubjectHandler, updateSubjectHandler, removeSubjectHandler, createBsHandler, updateBsHandler, removeBsHandler, createPmHandler, updatePmHandler, removePmHandler, createCharHandler, removeCharHandler } from './handlers/chapters/chapter-10.js';
import { docPreview } from './handlers/chapters/doc-preview.js';
import { docGenerate } from './handlers/doc-generate.js';
import { submit, listPending, approve, reject, offices } from './handlers/access-request.js';
import { listUsers, userCounts, getUser, updateRole, deleteUserHandler } from './handlers/admin-users.js';
import { list as listTB, options as tbOptions, get as getTB, patch as patchTB, post as postTB, del as delTB } from './handlers/technical-body.js';
import { list as listAsw, options as aswOptions, get as getAsw, patch as patchAsw, post as postAsw, del as delAsw } from './handlers/asw-data.js';
import { checkReference, searchUpovCodes as searchUpovCodesHandler, searchTgs, getSourceTg, getDeadlines, create as createTg, update as updateTg_ } from './handlers/tg-create.js';
import { signOff } from './handlers/tg-sign-off.js';
import { transitionStatus } from './handlers/tg-status-transition.js';
import { updateMyTwps } from './handlers/profile.js';
import { getConfig } from './handlers/config.js';
import { authMiddleware } from './middleware/auth.js';
import { editorAuthMiddleware } from './middleware/editor-auth.js';
import { docGenPreview } from './handlers/doc-gen-preview.js';
import { sendForComments } from './handlers/tg-sign-off.js';
import { copyForDiscussion, startNewProject, submitToTcEdc, adopt, setEdcCommentDates } from './handlers/tg-workflow.js';
// ── EDC member management (list / add / remove / copy-from) ──────────────────
import { listEdcMembers, addEdcMembers, removeEdcMember, copyEdcMembers } from './handlers/edc-members.js';

const app = new Hono();

// CORS
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin || process.env.FRONTEND_URL || 'http://local-dev.wipo.int:5173',
    allowHeaders: ['Content-Type', 'Authorization', 'X-Auth-Provider'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Public routes
app.get('/api/health', health);
app.get('/api/config', getConfig);
app.post('/api/auth/token', exchangeToken);
app.get('/api/auth/userinfo', getUserInfo);

// Auth middleware for all remaining /api/routes
app.use('/api/*', authMiddleware);
app.post('/api/test-guidelines/:id/send-for-comments', sendForComments);

// Protected routes
app.get('/api/auth/me', getMe);
app.get('/api/dashboard/stats', getStats);
app.get('/api/test-guidelines', list);
app.get('/api/test-guidelines/:id', get);
app.get('/api/test-guidelines/:id/ie-comments', getIeComments);
app.get('/api/test-guidelines/:id/edc-comments-summary', getEdcCommentsSummary);
app.get('/api/test-guidelines/:id/my-comments', getMyComments);
app.post('/api/test-guidelines/:id/comments', submitComment);
app.get('/api/test-guidelines/:id/le-comments', getLeComments);
app.post('/api/test-guidelines/:id/le-comments', submitLeComment);
app.get('/api/test-guidelines/:id/my-le-comments', getMyLeComments);
app.get('/api/test-guidelines/:id/edc-comments', getEdcComments);
app.post('/api/test-guidelines/:id/edc-comments', submitEdcComment);
app.get('/api/test-guidelines/:id/my-edc-comments', getMyEdcComments);
app.get('/api/test-guidelines/:id/open', openEdit);
app.post('/api/test-guidelines/:id/sign-off', signOff);

// Chapter document preview — proxies to Java doc-generate service (read-only)
app.get('/api/test-guidelines/:id/chapters/:ch/preview', docPreview);

// Full document generate — proxies to Java doc-generate service (read-only)
app.get('/api/test-guidelines/:id/doc-generate', docGenerate);
app.get('/api/test-guidelines/:id/doc-gen-preview', docGenPreview);

// LE authorization — enforces LE/admin access on all mutation routes below
app.use('/api/test-guidelines/:id/*', editorAuthMiddleware);

app.patch('/api/test-guidelines/:id/chapters/00', updateCh00);
app.patch('/api/test-guidelines/:id/chapters/01', updateCh01);
app.patch('/api/test-guidelines/:id/chapters/02', updateCh02);
app.patch('/api/test-guidelines/:id/chapters/03', updateCh03);
app.post('/api/test-guidelines/:id/chapters/03/propagation-methods', createPropMethodHandler);
app.patch('/api/test-guidelines/:id/chapters/03/propagation-methods/:pmId', updatePropMethodHandler);
app.delete('/api/test-guidelines/:id/chapters/03/propagation-methods/:pmId', deletePropMethodHandler);
app.patch('/api/test-guidelines/:id/chapters/04', updateCh04);
app.get('/api/test-guidelines/:id/chapters/05', getCh05);
app.patch('/api/test-guidelines/:id/chapters/05', updateCh05);
app.patch('/api/test-guidelines/:id/chapters/06', updateCh06);
app.patch('/api/test-guidelines/:id/chapters/09', updateCh09);
app.patch('/api/test-guidelines/:id/chapters/10', updateCh10);
app.patch('/api/test-guidelines/:id/chapters/11', updateCh11);

// Explanations CRUD (ch08)
app.post('/api/test-guidelines/:id/chapters/08/explanations', createExpl);
app.patch('/api/test-guidelines/:id/chapters/08/explanations/:explId', updateExpl08);
app.delete('/api/test-guidelines/:id/chapters/08/explanations/:explId', removeExpl08);

// Characteristics CRUD (ch07)
app.get('/api/test-guidelines/:id/characteristics/search-adopted', searchAdoptedHandler);
app.get('/api/test-guidelines/:id/characteristics', listChars);
app.post('/api/test-guidelines/:id/characteristics', createChar);
app.put('/api/test-guidelines/:id/characteristics/reorder', reorderChars);
app.patch('/api/test-guidelines/:id/characteristics/:charId', updateChar);
app.delete('/api/test-guidelines/:id/characteristics/:charId', removeChar);
app.post('/api/test-guidelines/:id/characteristics/:charId/expressions', createExpr);
app.patch('/api/test-guidelines/:id/characteristics/:charId/expressions/:exprId', updateExpr);
app.delete('/api/test-guidelines/:id/characteristics/:charId/expressions/:exprId', removeExpr);

// TQ sub-entities (ch10)
app.post('/api/test-guidelines/:id/chapters/10/subjects', createSubjectHandler);
app.patch('/api/test-guidelines/:id/chapters/10/subjects/:sId', updateSubjectHandler);
app.delete('/api/test-guidelines/:id/chapters/10/subjects/:sId', removeSubjectHandler);
app.post('/api/test-guidelines/:id/chapters/10/breeding-schemes', createBsHandler);
app.patch('/api/test-guidelines/:id/chapters/10/breeding-schemes/:bsId', updateBsHandler);
app.delete('/api/test-guidelines/:id/chapters/10/breeding-schemes/:bsId', removeBsHandler);
app.post('/api/test-guidelines/:id/chapters/10/propagation-methods', createPmHandler);
app.patch('/api/test-guidelines/:id/chapters/10/propagation-methods/:pmId', updatePmHandler);
app.delete('/api/test-guidelines/:id/chapters/10/propagation-methods/:pmId', removePmHandler);
app.post('/api/test-guidelines/:id/chapters/10/characteristics', createCharHandler);
app.delete('/api/test-guidelines/:id/chapters/10/characteristics/:charId', removeCharHandler);

// Paragraphs CRUD
app.post('/api/test-guidelines/:id/paragraphs', createParagraph);
app.patch('/api/test-guidelines/:id/paragraphs/:pId', updateParagraph);
app.delete('/api/test-guidelines/:id/paragraphs/:pId', removeParagraph);

// Profile routes
app.patch('/api/profile/twps', updateMyTwps);

// Access request routes
app.post('/api/access-request', submit);
app.get('/api/offices', offices);

// Admin routes
app.get('/api/admin/access-requests', listPending);
app.post('/api/admin/access-requests/:id/approve', approve);
app.post('/api/admin/access-requests/:id/reject', reject);

// ── Admin workflow actions ────────────────────────────────────────────────────
app.post('/api/admin/test-guidelines/:id/copy-for-discussion', copyForDiscussion);
app.post('/api/admin/test-guidelines/:id/start-new-project',   startNewProject);
app.post('/api/admin/test-guidelines/:id/submit-to-tc-edc',    submitToTcEdc);
app.post('/api/admin/test-guidelines/:id/adopt',               adopt);
app.patch('/api/admin/test-guidelines/:id/edc-comments',       setEdcCommentDates);

// ── EDC member management ─────────────────────────────────────────────────────
// IMPORTANT: copy-from route must be registered BEFORE the /:userId wildcard
// to prevent Hono from matching "copy-from" as a userId parameter.
app.post('/api/admin/technical-bodies/:tbCodeId/edc-members/copy-from/:srcId', copyEdcMembers);
app.get('/api/admin/technical-bodies/:tbCodeId/edc-members',                   listEdcMembers);
app.post('/api/admin/technical-bodies/:tbCodeId/edc-members',                  addEdcMembers);
app.delete('/api/admin/technical-bodies/:tbCodeId/edc-members/:userId',        removeEdcMember);

// Admin user management
app.get('/api/admin/users/counts', userCounts);
app.get('/api/admin/users', listUsers);
app.get('/api/admin/users/:id', getUser);
app.put('/api/admin/users/:id/role', updateRole);
app.delete('/api/admin/users/:id', deleteUserHandler);

// Admin: TG creation
app.get('/api/admin/test-guidelines/search', searchTgs);
app.get('/api/admin/test-guidelines/deadlines', getDeadlines);
app.get('/api/admin/test-guidelines/check-reference', checkReference);
app.get('/api/admin/upov-codes', searchUpovCodesHandler);
app.get('/api/admin/test-guidelines/:id/source', getSourceTg);
app.post('/api/admin/test-guidelines', createTg);
app.patch('/api/admin/test-guidelines/:id', updateTg_);
app.patch('/api/admin/test-guidelines/:id/status', transitionStatus);

// Admin: Technical Bodies
app.get('/api/admin/technical-bodies', listTB);
app.get('/api/admin/technical-bodies/options', tbOptions);
app.get('/api/admin/technical-bodies/:id', getTB);
app.patch('/api/admin/technical-bodies/:id', patchTB);
app.delete('/api/admin/technical-bodies/:id', delTB);
app.post('/api/admin/technical-bodies', postTB);

// Admin: ASW Data
app.get('/api/admin/asw-data', listAsw);
app.get('/api/admin/asw-data/options', aswOptions);
app.get('/api/admin/asw-data/:id', getAsw);
app.patch('/api/admin/asw-data/:id', patchAsw);
app.delete('/api/admin/asw-data/:id', delAsw);
app.post('/api/admin/asw-data', postAsw);

// Centralized error handling
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
});

export default app;