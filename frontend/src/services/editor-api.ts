import api, { docGenerationApi } from './api';
import type { OpenResponse } from '@/types/editor';

const base = (id: number) => `/api/test-guidelines/${id}`;

export const editorApi = {
  // Editor session
  open: (id: number) =>
    api.get<OpenResponse>(`${base(id)}/open`).then((r) => r.data),

  // Per-chapter autosave
  patchChapter: (id: number, ch: string, data: Record<string, any>) =>
    api.patch(`${base(id)}/chapters/${ch}`, data).then((r) => r.data),

  // Shared paragraphs
  createParagraph: (id: number, data: { Sub_Add_Info: string }) =>
    api.post(`${base(id)}/paragraphs`, data).then((r) => r.data),
  updateParagraph: (id: number, pId: number, data: { Sub_Add_Info: string }) =>
    api.patch(`${base(id)}/paragraphs/${pId}`, data).then((r) => r.data),
  deleteParagraph: (id: number, pId: number) =>
    api.delete(`${base(id)}/paragraphs/${pId}`).then((r) => r.data),

  // Chapter 07 — characteristics
  createCharacteristic: (id: number, data: Record<string, any>) =>
    api.post(`${base(id)}/characteristics`, data).then((r) => r.data),
  updateCharacteristic: (id: number, charId: number, data: Record<string, any>) =>
    api.patch(`${base(id)}/characteristics/${charId}`, data).then((r) => r.data),
  deleteCharacteristic: (id: number, charId: number) =>
    api.delete(`${base(id)}/characteristics/${charId}`).then((r) => r.data),
  reorderCharacteristics: (id: number, order: { TOC_ID: number; CharacteristicOrder: number }[]) =>
    api.put(`${base(id)}/characteristics/reorder`, { order }).then((r) => r.data),
  searchAdopted: (id: number, q: string) =>
    api.get(`${base(id)}/characteristics/search-adopted`, { params: { q } }).then((r) => r.data),

  // Chapter 07 — expressions
  createExpression: (id: number, charId: number, data: Record<string, any>) =>
    api.post(`${base(id)}/characteristics/${charId}/expressions`, data).then((r) => r.data),
  updateExpression: (id: number, charId: number, exprId: number, data: Record<string, any>) =>
    api.patch(`${base(id)}/characteristics/${charId}/expressions/${exprId}`, data).then((r) => r.data),
  deleteExpression: (id: number, charId: number, exprId: number) =>
    api.delete(`${base(id)}/characteristics/${charId}/expressions/${exprId}`).then((r) => r.data),

  // Chapter 02/03/04 — propagation methods
  createExamPropMethod: (id: number, ch: string, data: Record<string, any>) =>
    api.post(`${base(id)}/chapters/${ch}/propagation-methods`, data).then((r) => r.data),
  updateExamPropMethod: (id: number, ch: string, pmId: number, data: Record<string, any>) =>
    api.patch(`${base(id)}/chapters/${ch}/propagation-methods/${pmId}`, data).then((r) => r.data),
  deleteExamPropMethod: (id: number, ch: string, pmId: number) =>
    api.delete(`${base(id)}/chapters/${ch}/propagation-methods/${pmId}`).then((r) => r.data),

  // Chapter 03 specific — propagation methods
  createCh03PropMethod: (id: number, data: Record<string, any>) =>
    api.post(`${base(id)}/chapters/03/propagation-methods`, data).then((r) => r.data),
  updateCh03PropMethod: (id: number, pmId: number, data: Record<string, any>) =>
    api.patch(`${base(id)}/chapters/03/propagation-methods/${pmId}`, data).then((r) => r.data),
  deleteCh03PropMethod: (id: number, pmId: number) =>
    api.delete(`${base(id)}/chapters/03/propagation-methods/${pmId}`).then((r) => r.data),

  // Chapter 08 — explanations
  createExplanation: (id: number, data: Record<string, any>) =>
    api.post(`${base(id)}/chapters/08/explanations`, data).then((r) => r.data),
  updateExplanation: (id: number, explId: number, data: Record<string, any>) =>
    api.patch(`${base(id)}/chapters/08/explanations/${explId}`, data).then((r) => r.data),
  deleteExplanation: (id: number, explId: number) =>
    api.delete(`${base(id)}/chapters/08/explanations/${explId}`).then((r) => r.data),

  // Chapter 10 — TQ sub-entities
  createTqSubject: (id: number, data: Record<string, any>) =>
    api.post(`${base(id)}/chapters/10/subjects`, data).then((r) => r.data),
  updateTqSubject: (id: number, sId: number, data: Record<string, any>) =>
    api.patch(`${base(id)}/chapters/10/subjects/${sId}`, data).then((r) => r.data),
  deleteTqSubject: (id: number, sId: number) =>
    api.delete(`${base(id)}/chapters/10/subjects/${sId}`).then((r) => r.data),

  createBreedingScheme: (id: number, data: Record<string, any>) =>
    api.post(`${base(id)}/chapters/10/breeding-schemes`, data).then((r) => r.data),
  updateBreedingScheme: (id: number, bsId: number, data: Record<string, any>) =>
    api.patch(`${base(id)}/chapters/10/breeding-schemes/${bsId}`, data).then((r) => r.data),
  deleteBreedingScheme: (id: number, bsId: number) =>
    api.delete(`${base(id)}/chapters/10/breeding-schemes/${bsId}`).then((r) => r.data),

  createTqPropMethod: (id: number, data: Record<string, any>) =>
    api.post(`${base(id)}/chapters/10/propagation-methods`, data).then((r) => r.data),
  updateTqPropMethod: (id: number, pmId: number, data: Record<string, any>) =>
    api.patch(`${base(id)}/chapters/10/propagation-methods/${pmId}`, data).then((r) => r.data),
  deleteTqPropMethod: (id: number, pmId: number) =>
    api.delete(`${base(id)}/chapters/10/propagation-methods/${pmId}`).then((r) => r.data),

  createTqChar: (id: number, data: Record<string, any>) =>
    api.post(`${base(id)}/chapters/10/characteristics`, data).then((r) => r.data),
  deleteTqChar: (id: number, charId: number) =>
    api.delete(`${base(id)}/chapters/10/characteristics/${charId}`).then((r) => r.data),

  createSimilarVariety: (id: number, data: Record<string, any>) =>
    api.post(`${base(id)}/chapters/10/similar-varieties`, data).then((r) => r.data),
  updateSimilarVariety: (id: number, svId: number, data: Record<string, any>) =>
    api.patch(`${base(id)}/chapters/10/similar-varieties/${svId}`, data).then((r) => r.data),
  deleteSimilarVariety: (id: number, svId: number) =>
    api.delete(`${base(id)}/chapters/10/similar-varieties/${svId}`).then((r) => r.data),

  /**
   * GET /api/test-guidelines/:id/chapters/:ch/preview?lang=en
   * Returns HTML string rendered by the Java backend.
   * Uses extended timeout (3 minutes) for document generation.
   */
  docPreview: (id: number, ch: string, lang: string) => {
    // Convert '00' to '0' for the API endpoint
    const chapterPath = ch === '00' ? '0' : ch;
    return docGenerationApi
      .get<string>(`${base(id)}/chapters/${chapterPath}/preview`, {
        params: { lang },
        responseType: 'text',
      })
      .then((r) => r.data);
  },

          /**
   * Full document gen-preview (list page row click)
   * GET /api/test-guidelines/:id/doc-gen-preview?lang=en
   * Returns full HTML document preview for the test guideline.
   * Proxied through Node BE → Java doc-gen-preview service.
   * Uses extended timeout (3 minutes).
   */
  docGenPreview: (id: number, lang: string = 'en') =>
    docGenerationApi
      .get<string>(`${base(id)}/doc-gen-preview`, {
        params: { lang },
        responseType: 'text',
      })
      .then((r) => r.data),

  /**
   * Full document generate 
   * GET /api/test-guidelines/:id/doc-generate?lang=en
   * Uses extended timeout (3 minutes) for document generation.
   */
  docGenerate: (id: number, lang: string) =>
    docGenerationApi
      .get(`${base(id)}/doc-generate`, {
        params: { lang },
        responseType: 'blob',
      })
      .then((r) => ({
        blob: r.data as Blob,
        contentType: (r.headers['content-type'] as string) || 'application/octet-stream',
        contentDisposition: r.headers['content-disposition'] as string | undefined,
      })),
};