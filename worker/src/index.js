import { Client } from 'pg';

import {
  loginAdmin,
  getAuthenticatedAdmin,
  logoutAdmin,
} from './auth.js';

import {
  createCartOrder,
  createDirectEnquiry,
} from './orders.js';

import {
  listAdminOrders,
  getAdminOrder,
  updateAdminOrder,
} from './admin-orders.js';

import {
  listAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
} from './admin-products.js';
import { uploadAdminImage } from './admin-uploads.js';

const PRODUCTION_ORIGINS = new Set([
  'https://alexandrasfloral.com',
  'https://www.alexandrasfloral.com',
  'https://alexandrasfloral-react.vercel.app',
]);

const LOCAL_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const UNSAFE_METHODS = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

function isLocalRequest(url) {
  return (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1'
  );
}

function getAllowedOrigin(request) {
  const origin = request.headers.get('Origin');

  if (!origin) {
    return null;
  }

  const requestUrl = new URL(request.url);
  const isLocal = isLocalRequest(requestUrl);

  const allowedOrigins = isLocal
    ? new Set([...PRODUCTION_ORIGINS, ...LOCAL_ORIGINS])
    : PRODUCTION_ORIGINS;

  return allowedOrigins.has(origin) ? origin : false;
}

function jsonResponse(
  data,
  status = 200,
  origin = null,
  extraHeaders = {}
) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Vary', 'Origin');
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function isJsonRequest(request) {
  const contentType = request.headers.get('Content-Type') || '';

  const mediaType = contentType
    .split(';')[0]
    .trim()
    .toLowerCase();

  return mediaType === 'application/json';
}

async function readJsonBody(request) {
  if (!isJsonRequest(request)) {
    return {
      success: false,
      status: 415,
      message: 'JSON request required.',
    };
  }

  const MAX_BODY_SIZE = 100_000;

  const contentLengthHeader = request.headers.get('Content-Length');
  const contentLength = Number(contentLengthHeader);

  if (
    contentLengthHeader &&
    Number.isFinite(contentLength) &&
    contentLength > MAX_BODY_SIZE
  ) {
    return {
      success: false,
      status: 413,
      message: 'Request body is too large.',
    };
  }

  if (!request.body) {
    return {
      success: false,
      status: 400,
      message: 'Invalid JSON request body.',
    };
  }

  const reader = request.body.getReader();
  const chunks = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalSize += value.byteLength;

      if (totalSize > MAX_BODY_SIZE) {
        await reader.cancel().catch(() => {});

        return {
          success: false,
          status: 413,
          message: 'Request body is too large.',
        };
      }

      chunks.push(value);
    }

    const bodyBytes = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of chunks) {
      bodyBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const bodyText = new TextDecoder('utf-8', {
      fatal: true,
    }).decode(bodyBytes);

    const body = JSON.parse(bodyText);

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return {
        success: false,
        status: 400,
        message: 'Invalid request body.',
      };
    }

    return {
      success: true,
      body,
    };
  } catch {
    return {
      success: false,
      status: 400,
      message: 'Invalid JSON request body.',
    };
  } finally {
    reader.releaseLock();
  }
}

function getClientIp(request, localRequest) {
  if (localRequest) {
    return 'local-development';
  }

  const clientIp = request.headers.get('CF-Connecting-IP');

  if (!clientIp || !clientIp.trim()) {
    return null;
  }

  return clientIp.trim();
}

async function checkPublicRateLimit(request, env, localRequest, limiterName) {
  const clientIp = getClientIp(request, localRequest);

  if (!clientIp) {
    return {
      allowed: false,
      status: 503,
      message: 'Unable to verify request network.',
    };
  }

  const limiter = env[limiterName];

  if (!limiter) {
    return {
      allowed: false,
      status: 503,
      message: 'Request protection is temporarily unavailable.',
    };
  }

  const result = await limiter.limit({
    key: clientIp,
  });

  if (!result.success) {
    return {
      allowed: false,
      status: 429,
      message: 'Too many requests. Please try again in a minute.',
    };
  }

  return { allowed: true };
}

async function withDatabase(env, callback) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: {
      rejectUnauthorized: true,
    },
  });

  try {
    await client.connect();
    return await callback(client);
  } finally {
    await client.end().catch((error) => {
      console.error('Database disconnect error:', error);
    });
  }
}

async function requireAdmin(client, request) {
  return getAuthenticatedAdmin(client, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = getAllowedOrigin(request);
    const localRequest = isLocalRequest(url);

    if (origin === false) {
      return jsonResponse(
        {
          success: false,
          message: 'Origin not allowed.',
        },
        403
      );
    }

    if (request.method === 'OPTIONS') {
      const headers = new Headers({
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      });

      if (origin) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
      }

      return new Response(null, {
        status: 204,
        headers,
      });
    }

    if (
      UNSAFE_METHODS.has(request.method) &&
      !localRequest &&
      !origin
    ) {
      return jsonResponse(
        {
          success: false,
          message: 'Request origin is required.',
        },
        403
      );
    }

    try {
      // API health check.
      if (
        url.pathname === '/api/health' &&
        request.method === 'GET'
      ) {
        const result = await withDatabase(env, async (client) => {
          const query = await client.query(
            'SELECT NOW() AS database_time'
          );

          return query.rows[0].database_time;
        });

        return jsonResponse(
          {
            success: true,
            message: 'Alexandra’s Floral API is connected to Neon.',
            database: 'connected',
            databaseTime: result,
          },
          200,
          origin
        );
      }
            // Admin login.
      if (
        url.pathname === '/api/auth/login' &&
        request.method === 'POST'
      ) {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin
          );
        }

        const { email, password } = parsed.body;

        if (
          typeof email !== 'string' ||
          typeof password !== 'string' ||
          email.length > 255 ||
          password.length < 1 ||
          password.length > 1024
        ) {
          return jsonResponse(
            {
              success: false,
              message: 'Invalid email or password.',
            },
            400,
            origin
          );
        }

        const clientIp = getClientIp(request, localRequest);

        if (!clientIp) {
          return jsonResponse(
            {
              success: false,
              message: 'Unable to verify request origin network.',
            },
            503,
            origin
          );
        }

        const ipRateLimit = await env.LOGIN_IP_LIMITER.limit({
          key: clientIp,
        });

        if (!ipRateLimit.success) {
          return jsonResponse(
            {
              success: false,
              message:
                'Too many login attempts from this network. Please try again in a minute.',
            },
            429,
            origin,
            {
              'Retry-After': '60',
            }
          );
        }

        const normalizedEmail = email.trim().toLowerCase();

        const emailRateLimit = await env.LOGIN_LIMITER.limit({
          key: normalizedEmail,
        });

        if (!emailRateLimit.success) {
          return jsonResponse(
            {
              success: false,
              message:
                'Too many login attempts for this account. Please try again in a minute.',
            },
            429,
            origin,
            {
              'Retry-After': '60',
            }
          );
        }

        const result = await withDatabase(env, (client) =>
          loginAdmin(client, normalizedEmail, password, request)
        );

        if (!result.success) {
          return jsonResponse(result, 401, origin);
        }

        return jsonResponse(
          {
            success: true,
            message: 'Login successful.',
            admin: result.admin,
          },
          200,
          origin,
          {
            'Set-Cookie': result.cookie,
          }
        );
      }

      // Check the current admin session.
      if (
        url.pathname === '/api/auth/me' &&
        request.method === 'GET'
      ) {
        const admin = await withDatabase(env, (client) =>
          requireAdmin(client, request)
        );

        if (!admin) {
          return jsonResponse(
            {
              success: false,
              message: 'Not authenticated.',
            },
            401,
            origin
          );
        }

        return jsonResponse(
          {
            success: true,
            admin,
          },
          200,
          origin
        );
      }

      // Admin logout.
      if (
        url.pathname === '/api/auth/logout' &&
        request.method === 'POST'
      ) {
        const result = await withDatabase(env, (client) =>
          logoutAdmin(client, request)
        );

        return jsonResponse(
          {
            success: true,
            message: 'Logged out successfully.',
          },
          200,
          origin,
          {
            'Set-Cookie': result.cookie,
          }
        );
      }
            // Create a cart checkout order.
      if (
        url.pathname === '/api/orders' &&
        request.method === 'POST'
      ) {
        const rateLimit = await checkPublicRateLimit(
          request,
          env,
          localRequest,
          'ORDER_LIMITER'
        );

        if (!rateLimit.allowed) {
          return jsonResponse(
            {
              success: false,
              message: rateLimit.message,
            },
            rateLimit.status,
            origin,
            rateLimit.status === 429
              ? { 'Retry-After': '60' }
              : {}
          );
        }

        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin
          );
        }

        const result = await withDatabase(env, (client) =>
          createCartOrder(client, parsed.body)
        );

        return jsonResponse(result, 201, origin);
      }

      // Create a direct product enquiry.
      if (
        url.pathname === '/api/enquiries' &&
        request.method === 'POST'
      ) {
        const rateLimit = await checkPublicRateLimit(
          request,
          env,
          localRequest,
          'ENQUIRY_LIMITER'
        );

        if (!rateLimit.allowed) {
          return jsonResponse(
            {
              success: false,
              message: rateLimit.message,
            },
            rateLimit.status,
            origin,
            rateLimit.status === 429
              ? { 'Retry-After': '60' }
              : {}
          );
        }

        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin
          );
        }

        const result = await withDatabase(env, (client) =>
          createDirectEnquiry(client, parsed.body)
        );

        return jsonResponse(result, 201, origin);
      }

      // Admin order list and filters.
      if (
        url.pathname === '/api/admin/orders' &&
        request.method === 'GET'
      ) {
        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: 'Not authenticated.',
              },
            };
          }

          return {
            status: 200,
            data: await listAdminOrders(client, url),
          };
        });

        return jsonResponse(
          result.data,
          result.status,
          origin
        );
      }

      // Admin individual order details.
      const adminOrderMatch = url.pathname.match(
        /^\/api\/admin\/orders\/([^/]+)$/
      );

      if (
        adminOrderMatch &&
        request.method === 'GET'
      ) {
        const orderId = decodeURIComponent(adminOrderMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: 'Not authenticated.',
              },
            };
          }

          const order = await getAdminOrder(client, orderId);

          if (!order) {
            return {
              status: 404,
              data: {
                success: false,
                message: 'Order not found.',
              },
            };
          }

          return {
            status: 200,
            data: order,
          };
        });

        return jsonResponse(
          result.data,
          result.status,
          origin
        );
      }
            // Admin order updates.
      if (
        adminOrderMatch &&
        request.method === 'PATCH'
      ) {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin
          );
        }

        const orderId = decodeURIComponent(adminOrderMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: 'Not authenticated.',
              },
            };
          }

          const updated = await updateAdminOrder(
            client,
            orderId,
            parsed.body
          );

          if (!updated) {
            return {
              status: 404,
              data: {
                success: false,
                message: 'Order not found.',
              },
            };
          }

          return {
            status: 200,
            data: updated,
          };
        });

        return jsonResponse(
          result.data,
          result.status,
          origin
        );
      }

      // Admin product list and filters.
      if (
        url.pathname === '/api/admin/products' &&
        request.method === 'GET'
      ) {
        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: 'Not authenticated.',
              },
            };
          }

          return {
            status: 200,
            data: await listAdminProducts(client, url),
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Create an admin product.
      if (
        url.pathname === '/api/admin/products' &&
        request.method === 'POST'
      ) {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin
          );
        }

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: 'Not authenticated.',
              },
            };
          }

          return {
            status: 201,
            data: await createAdminProduct(client, parsed.body),
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Upload an image to R2.

      if (
        url.pathname === '/api/admin/uploads' &&
        request.method === 'POST'
      ) {
        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: 'Not authenticated.',
              },
            };
          }

          return await uploadAdminImage(request, env);
        });

        return jsonResponse(
          result.data,
          result.status,
          origin
        );
      }

      // Match an individual admin product.
      const adminProductMatch = url.pathname.match(
        /^\/api\/admin\/products\/([^/]+)$/
      );

      // Get individual admin product details.
      if (
        adminProductMatch &&
        request.method === 'GET'
      ) {
        const productId = decodeURIComponent(adminProductMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: 'Not authenticated.',
              },
            };
          }

          const product = await getAdminProduct(client, productId);

          if (!product) {
            return {
              status: 404,
              data: {
                success: false,
                message: 'Product not found.',
              },
            };
          }

          return {
            status: 200,
            data: product,
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Update an admin product.
      if (
        adminProductMatch &&
        request.method === 'PATCH'
      ) {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin
          );
        }

        const productId = decodeURIComponent(adminProductMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: 'Not authenticated.',
              },
            };
          }

          const updated = await updateAdminProduct(
            client,
            productId,
            parsed.body
          );

          if (!updated) {
            return {
              status: 404,
              data: {
                success: false,
                message: 'Product not found.',
              },
            };
          }

          return {
            status: 200,
            data: updated,
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Unknown API routes.
      return jsonResponse(
        {
          success: false,
          message: 'API endpoint not found.',
        },
        404,
        origin
      );
    } catch (error) {
      console.error('API error:', error);

      const isValidationError = error.name === 'ValidationError';

      return jsonResponse(
        {
          success: false,
          message: isValidationError
            ? error.message
            : 'An unexpected server error occurred.',
        },
        isValidationError ? 400 : 500,
        origin
      );
    }
  },
};