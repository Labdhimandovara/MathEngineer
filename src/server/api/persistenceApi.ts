/**
 * Persistence & Sync API Handler (Phase 13.2)
 * 
 * Routes and validates all persistence endpoints:
 * - Image problem metadata & binaries
 * - Learning attempts & progress records
 * - Assessment sessions & history
 * - Student preferences & batch migration
 */

import {
  ImageProblemRepository,
  LearningAttemptRepository,
  AssessmentRepository,
  UserPreferencesRepository,
} from '../db/repositories/index.ts';
import { ImageStorage } from '../storage/imageStorage.ts';
import { runMigrations } from '../db/migrations.ts';

// Schema migrations run on server startup in server.ts

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message }, status);
}

/**
 * Validates mathematical question parameters
 */
function validateProblemPayload(body: any): string | null {
  if (!body || typeof body !== 'object') {
    return 'Invalid request payload: must be a JSON object.';
  }
  if (!body.questionId || typeof body.questionId !== 'string') {
    return 'Missing or invalid questionId.';
  }
  if (
    body.method &&
    !['bisection', 'false-position', 'newton-raphson'].includes(body.method)
  ) {
    return `Invalid numerical method: ${body.method}`;
  }
  if (body.decimalPlaces !== undefined) {
    const dp = Number(body.decimalPlaces);
    if (!Number.isInteger(dp) || dp < 1 || dp > 15) {
      return 'decimalPlaces must be an integer between 1 and 15.';
    }
  }
  return null;
}

export async function handlePersistenceRequest(
  req: Request,
  url: URL
): Promise<Response | null> {
  const method = req.method;
  const path = url.pathname;

  // 1. Image Problems: /api/problems/image
  if (path === '/api/problems/image' || path === '/api/problems/image/') {
    if (method === 'GET') {
      const list = await ImageProblemRepository.list();
      return jsonResponse({ success: true, count: list.length, problems: list });
    }

    if (method === 'POST') {
      try {
        const body = await req.json();
        const err = validateProblemPayload(body);
        if (err) return errorResponse(err, 400);

        const saved = await ImageProblemRepository.save(body);
        return jsonResponse({ success: true, problem: saved }, 201);
      } catch (err: any) {
        return errorResponse(err?.message || 'Error saving image problem', 400);
      }
    }
    return errorResponse('Method not allowed', 405);
  }

  // Single Image Problem: /api/problems/image/:questionId
  if (path.startsWith('/api/problems/image/')) {
    const questionId = decodeURIComponent(path.slice('/api/problems/image/'.length));
    if (!questionId) return errorResponse('Missing questionId in path', 400);

    if (method === 'GET') {
      const problem = await ImageProblemRepository.get(questionId);
      if (!problem) {
        return errorResponse(`Problem with questionId '${questionId}' not found`, 404);
      }
      return jsonResponse({ success: true, problem });
    }

    if (method === 'PATCH' || method === 'POST') {
      try {
        const body = await req.json();
        const err = validateProblemPayload({ ...body, questionId });
        if (err) return errorResponse(err, 400);

        const updated = await ImageProblemRepository.update(questionId, body);
        if (!updated) {
          // If not existing, save as new
          const saved = await ImageProblemRepository.save({ ...body, questionId });
          return jsonResponse({ success: true, problem: saved }, 201);
        }
        return jsonResponse({ success: true, problem: updated });
      } catch (err: any) {
        return errorResponse(err?.message || 'Error updating problem', 400);
      }
    }

    if (method === 'DELETE') {
      await ImageProblemRepository.delete(questionId);
      await ImageStorage.delete(questionId);
      return jsonResponse({ success: true, deleted: questionId });
    }

    return errorResponse('Method not allowed', 405);
  }

  // 2. Image Binaries: /api/images/:questionId
  if (path.startsWith('/api/images/')) {
    const questionId = decodeURIComponent(path.slice('/api/images/'.length));
    if (!questionId) return errorResponse('Missing questionId', 400);

    if (method === 'GET') {
      const stored = await ImageStorage.get(questionId);
      if (!stored) {
        return errorResponse('Image not found', 404);
      }
      return new Response(stored.data as any, {
        status: 200,
        headers: {
          'Content-Type': stored.mimeType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    if (method === 'POST') {
      try {
        const contentType = req.headers.get('content-type') || 'image/png';
        const buffer = await req.arrayBuffer();
        if (!buffer || buffer.byteLength === 0) {
          return errorResponse('Uploaded image body is empty', 400);
        }
        const storageUrl = await ImageStorage.save(
          questionId,
          new Uint8Array(buffer),
          contentType
        );
        // Link to repository if record exists
        await ImageProblemRepository.update(questionId, {
          imageStoragePath: storageUrl,
          imageThumbnailUrl: storageUrl,
        });
        return jsonResponse({ success: true, url: storageUrl }, 201);
      } catch (err: any) {
        return errorResponse(err?.message || 'Failed to save image', 500);
      }
    }
  }

  // 3. Learning Attempts: /api/attempts
  if (path === '/api/attempts' || path === '/api/attempts/') {
    if (method === 'GET') {
      const methodFilter = url.searchParams.get('method') || undefined;
      const questionIdFilter = url.searchParams.get('questionId') || undefined;
      const sourceFilter = url.searchParams.get('source') || undefined;

      const attempts = await LearningAttemptRepository.list({
        method: methodFilter,
        questionId: questionIdFilter,
        source: sourceFilter,
      });
      return jsonResponse({ success: true, count: attempts.length, attempts });
    }

    if (method === 'POST') {
      try {
        const body = await req.json();
        if (!body || !body.id || !body.questionId) {
          return errorResponse('Missing id or questionId on attempt', 400);
        }
        const saved = await LearningAttemptRepository.save(body);
        return jsonResponse({ success: true, attempt: saved }, 201);
      } catch (err: any) {
        return errorResponse(err?.message || 'Error saving attempt', 400);
      }
    }
    return errorResponse('Method not allowed', 405);
  }

  // 4. Assessments: /api/assessments
  if (path === '/api/assessments' || path === '/api/assessments/') {
    if (method === 'GET') {
      const includeActive = url.searchParams.get('includeActive') === 'true';
      const assessments = await AssessmentRepository.list(includeActive);
      return jsonResponse({ success: true, count: assessments.length, assessments });
    }

    if (method === 'POST') {
      try {
        const body = await req.json();
        if (!body || !body.id) {
          return errorResponse('Missing id on assessment', 400);
        }
        const saved = await AssessmentRepository.save(body);
        return jsonResponse({ success: true, assessment: saved }, 201);
      } catch (err: any) {
        return errorResponse(err?.message || 'Error saving assessment', 400);
      }
    }
    return errorResponse('Method not allowed', 405);
  }

  // 5. Batch Sync & Migration: /api/sync
  if (path === '/api/sync' || path === '/api/sync/') {
    if (method === 'POST') {
      try {
        const body = await req.json();
        let migratedProblems = 0;
        let migratedAttempts = 0;
        let migratedAssessments = 0;

        if (Array.isArray(body.imageProblems)) {
          for (const prob of body.imageProblems) {
            if (prob && prob.questionId) {
              await ImageProblemRepository.save(prob);
              migratedProblems++;
            }
          }
        }

        if (Array.isArray(body.attempts)) {
          migratedAttempts = await LearningAttemptRepository.saveBatch(body.attempts);
        }

        if (Array.isArray(body.assessments)) {
          migratedAssessments = await AssessmentRepository.saveBatch(body.assessments);
        }

        if (body.preferences) {
          await UserPreferencesRepository.set('anonymous_student', body.preferences);
        }

        return jsonResponse({
          success: true,
          migrated: {
            imageProblems: migratedProblems,
            attempts: migratedAttempts,
            assessments: migratedAssessments,
          },
        });
      } catch (err: any) {
        return errorResponse(err?.message || 'Sync failed', 400);
      }
    }
    return errorResponse('Method not allowed', 405);
  }

  // 6. User Preferences: /api/preferences
  if (path === '/api/preferences' || path === '/api/preferences/') {
    if (method === 'GET') {
      const prefs = await UserPreferencesRepository.get('anonymous_student');
      return jsonResponse({ success: true, preferences: prefs });
    }

    if (method === 'POST') {
      try {
        const body = await req.json();
        const updated = await UserPreferencesRepository.set('anonymous_student', body);
        return jsonResponse({ success: true, preferences: updated });
      } catch (err: any) {
        return errorResponse(err?.message || 'Error updating preferences', 400);
      }
    }
    return errorResponse('Method not allowed', 405);
  }

  // Path not handled by persistence router
  return null;
}
