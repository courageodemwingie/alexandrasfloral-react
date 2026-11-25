import { Client } from "pg";

import {
  loginAdmin,
  getAuthenticatedAdmin,
  logoutAdmin,
  requestPasswordReset,
  resetAdminPassword,
} from "./auth.js";

import { createCartOrder, createDirectEnquiry } from "./orders.js";

import {
  createAdminOrder,
  listAdminOrders,
  getAdminOrder,
  updateAdminOrder,
  recordAdminOrderPayment,
  refundAdminOrder,
} from "./admin-orders.js";

import {
  listAdminEnquiries,
  getAdminEnquiry,
  updateAdminEnquiry,
  convertAdminEnquiry,
} from "./admin-enquiries.js";

import {
  listAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
} from "./admin-products.js";
import { uploadAdminImage } from "./admin-uploads.js";
import {
  listPublicCategories,
  listPublicProducts,
  getPublicProduct,
} from "./public-products.js";

async function sendPasswordResetEmail(email, resetUrl, env) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Alexandra's Floral <no-reply@mail.alexandrasfloral.com>",
      to: [email],
      subject: "Reset your Alexandra's Floral admin password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; color: #333;">
          <h2>Password reset request</h2>
          <p>We received a request to reset your Alexandra's Floral admin password.</p>
          <p>Click the button below to choose a new password. This link expires in 30 minutes.</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}"
               style="background: #6b1f35; color: white; padding: 14px 24px; text-decoration: none; border-radius: 5px;">
              Reset my password
            </a>
          </p>
          <p>If you did not request this change, you can safely ignore this email.</p>
          <p>Alexandra's Floral</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Password reset email delivery failed:", error);
    throw new Error("Unable to send password reset email.");
  }

  return true;
}

const PRODUCTION_ORIGINS = new Set([
  "https://alexandrasfloral.com",
  "https://www.alexandrasfloral.com",
  "https://alexandrasfloral-react.vercel.app",
]);

const LOCAL_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isLocalRequest(url) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

function getAllowedOrigin(request) {
  const origin = request.headers.get("Origin");

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

function jsonResponse(data, status = 200, origin = null, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function isJsonRequest(request) {
  const contentType = request.headers.get("Content-Type") || "";

  const mediaType = contentType.split(";")[0].trim().toLowerCase();

  return mediaType === "application/json";
}

async function readJsonBody(request) {
  if (!isJsonRequest(request)) {
    return {
      success: false,
      status: 415,
      message: "JSON request required.",
    };
  }

  const MAX_BODY_SIZE = 100_000;

  const contentLengthHeader = request.headers.get("Content-Length");
  const contentLength = Number(contentLengthHeader);

  if (
    contentLengthHeader &&
    Number.isFinite(contentLength) &&
    contentLength > MAX_BODY_SIZE
  ) {
    return {
      success: false,
      status: 413,
      message: "Request body is too large.",
    };
  }

  if (!request.body) {
    return {
      success: false,
      status: 400,
      message: "Invalid JSON request body.",
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
          message: "Request body is too large.",
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

    const bodyText = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bodyBytes);

    const body = JSON.parse(bodyText);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {
        success: false,
        status: 400,
        message: "Invalid request body.",
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
      message: "Invalid JSON request body.",
    };
  } finally {
    reader.releaseLock();
  }
}

function getClientIp(request, localRequest) {
  if (localRequest) {
    return "local-development";
  }

  const clientIp = request.headers.get("CF-Connecting-IP");

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
      message: "Unable to verify request network.",
    };
  }

  const limiter = env[limiterName];

  if (!limiter) {
    return {
      allowed: false,
      status: 503,
      message: "Request protection is temporarily unavailable.",
    };
  }

  const result = await limiter.limit({
    key: clientIp,
  });

  if (!result.success) {
    return {
      allowed: false,
      status: 429,
      message: "Too many requests. Please try again in a minute.",
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
      console.error("Database disconnect error:", error);
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
          message: "Origin not allowed.",
        },
        403,
      );
    }

    if (request.method === "OPTIONS") {
      const headers = new Headers({
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      });

      if (origin) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Credentials", "true");
      }

      return new Response(null, {
        status: 204,
        headers,
      });
    }

    if (UNSAFE_METHODS.has(request.method) && !localRequest && !origin) {
      return jsonResponse(
        {
          success: false,
          message: "Request origin is required.",
        },
        403,
      );
    }

    try {
      // API health check.
      if (url.pathname === "/api/health" && request.method === "GET") {
        const result = await withDatabase(env, async (client) => {
          const query = await client.query("SELECT NOW() AS database_time");

          return query.rows[0].database_time;
        });

        return jsonResponse(
          {
            success: true,
            message: "Alexandra’s Floral API is connected to Neon.",
            database: "connected",
            databaseTime: result,
          },
          200,
          origin,
        );
      }

      // Serve product images from R2.
      if (url.pathname === "/api/images" && request.method === "GET") {
        const imageKey = url.searchParams.get("key");

        if (
          !imageKey ||
          !/^products\/[A-Za-z0-9_-]+\.(jpg|png|webp|gif)$/i.test(imageKey)
        ) {
          return jsonResponse(
            {
              success: false,
              message: "Invalid image key.",
            },
            400,
            origin,
          );
        }

        if (!env.PRODUCT_IMAGES) {
          return jsonResponse(
            {
              success: false,
              message: "Image storage is not configured.",
            },
            503,
            origin,
          );
        }

        const image = await env.PRODUCT_IMAGES.get(imageKey);

        if (!image) {
          return jsonResponse(
            {
              success: false,
              message: "Image not found.",
            },
            404,
            origin,
          );
        }

        const headers = new Headers();

        image.writeHttpMetadata(headers);

        headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("ETag", image.httpEtag);

        if (origin) {
          headers.set("Access-Control-Allow-Origin", origin);
          headers.set("Vary", "Origin");
        }

        return new Response(image.body, {
          status: 200,
          headers,
        });
      }

      // Admin login.
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin,
          );
        }

        const { email, password } = parsed.body;

        if (
          typeof email !== "string" ||
          typeof password !== "string" ||
          email.length > 255 ||
          password.length < 1 ||
          password.length > 1024
        ) {
          return jsonResponse(
            {
              success: false,
              message: "Invalid email or password.",
            },
            400,
            origin,
          );
        }

        const clientIp = getClientIp(request, localRequest);

        if (!clientIp) {
          return jsonResponse(
            {
              success: false,
              message: "Unable to verify request origin network.",
            },
            503,
            origin,
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
                "Too many login attempts from this network. Please try again in a minute.",
            },
            429,
            origin,
            {
              "Retry-After": "60",
            },
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
                "Too many login attempts for this account. Please try again in a minute.",
            },
            429,
            origin,
            {
              "Retry-After": "60",
            },
          );
        }

        const result = await withDatabase(env, (client) =>
          loginAdmin(client, normalizedEmail, password, request),
        );

        if (!result.success) {
          return jsonResponse(result, 401, origin);
        }

        return jsonResponse(
          {
            success: true,
            message: "Login successful.",
            admin: result.admin,
          },
          200,
          origin,
          {
            "Set-Cookie": result.cookie,
          },
        );
      }

      // Request admin password reset.
      if (
        url.pathname === "/api/auth/forgot-password" &&
        request.method === "POST"
      ) {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message:
                "If an eligible account exists, a reset link will be sent.",
            },
            200,
            origin,
          );
        }

        const { email } = parsed.body;

        if (typeof email !== "string" || !email.trim() || email.length > 255) {
          return jsonResponse(
            {
              success: false,
              message: "Please enter a valid email address.",
            },
            400,
            origin,
          );
        }

        const clientIp = getClientIp(request, localRequest);

        if (!clientIp) {
          return jsonResponse(
            {
              success: false,
              message: "Unable to process this request.",
            },
            503,
            origin,
          );
        }

        const ipRateLimit = await env.LOGIN_IP_LIMITER.limit({
          key: `password-reset:${clientIp}`,
        });

        if (!ipRateLimit.success) {
          return jsonResponse(
            {
              success: true,
              message:
                "If an eligible account exists, a reset link will be sent.",
            },
            200,
            origin,
          );
        }

        const normalizedEmail = email.trim().toLowerCase();

        const emailRateLimit = await env.LOGIN_LIMITER.limit({
          key: `password-reset:${normalizedEmail}`,
        });

        if (!emailRateLimit.success) {
          return jsonResponse(
            {
              success: true,
              message:
                "If an eligible account exists, a reset link will be sent.",
            },
            200,
            origin,
          );
        }

        const result = await withDatabase(env, (client) =>
          requestPasswordReset(client, normalizedEmail),
        );

        if (result.resetToken) {
          const frontendOrigin = origin;

          const resetUrl = new URL("/admin/reset-password", frontendOrigin);

          resetUrl.searchParams.set("token", result.resetToken);

          await sendPasswordResetEmail(result.email, resetUrl.toString(), env);
        }

        return jsonResponse(
          {
            success: true,
            message:
              "If an eligible account exists, a reset link will be sent.",
          },
          200,
          origin,
        );
      }

      // Complete admin password reset.
      if (
        url.pathname === "/api/auth/reset-password" &&
        request.method === "POST"
      ) {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: "Invalid password reset request.",
            },
            400,
            origin,
          );
        }

        const { token, password } = parsed.body;

        if (
          typeof token !== "string" ||
          typeof password !== "string" ||
          token.length !== 43 ||
          !/^[A-Za-z0-9_-]+$/.test(token) ||
          password.length < 12 ||
          password.length > 1024
        ) {
          return jsonResponse(
            {
              success: false,
              message:
                "Enter a valid reset link and a password of at least 12 characters.",
            },
            400,
            origin,
          );
        }

        const clientIp = getClientIp(request, localRequest);

        if (!clientIp) {
          return jsonResponse(
            {
              success: false,
              message: "Unable to process this request.",
            },
            503,
            origin,
          );
        }

        const rateLimit = await env.LOGIN_IP_LIMITER.limit({
          key: `password-reset-complete:${clientIp}`,
        });

        if (!rateLimit.success) {
          return jsonResponse(
            {
              success: false,
              message:
                "Too many password reset attempts. Please try again in a minute.",
            },
            429,
            origin,
            {
              "Retry-After": "60",
            },
          );
        }

        const result = await withDatabase(env, (client) =>
          resetAdminPassword(client, token, password),
        );

        if (!result.success) {
          return jsonResponse(
            {
              success: false,
              message: result.message,
            },
            400,
            origin,
          );
        }

        return jsonResponse(
          {
            success: true,
            message:
              "Your password has been reset. Please sign in with your new password.",
          },
          200,
          origin,
        );
      }

      // Check the current admin session.
      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const admin = await withDatabase(env, (client) =>
          requireAdmin(client, request),
        );

        if (!admin) {
          return jsonResponse(
            {
              success: false,
              message: "Not authenticated.",
            },
            401,
            origin,
          );
        }

        return jsonResponse(
          {
            success: true,
            admin,
          },
          200,
          origin,
        );
      }

      // Admin logout.
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const result = await withDatabase(env, (client) =>
          logoutAdmin(client, request),
        );

        return jsonResponse(
          {
            success: true,
            message: "Logged out successfully.",
          },
          200,
          origin,
          {
            "Set-Cookie": result.cookie,
          },
        );
      }
      // Create a cart checkout order.
      if (url.pathname === "/api/orders" && request.method === "POST") {
        const rateLimit = await checkPublicRateLimit(
          request,
          env,
          localRequest,
          "ORDER_LIMITER",
        );

        if (!rateLimit.allowed) {
          return jsonResponse(
            {
              success: false,
              message: rateLimit.message,
            },
            rateLimit.status,
            origin,
            rateLimit.status === 429 ? { "Retry-After": "60" } : {},
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
            origin,
          );
        }

        const result = await withDatabase(env, (client) =>
          createCartOrder(client, parsed.body),
        );

        return jsonResponse(result, 201, origin);
      }

      // Create a direct product enquiry.
      if (url.pathname === "/api/enquiries" && request.method === "POST") {
        const rateLimit = await checkPublicRateLimit(
          request,
          env,
          localRequest,
          "ENQUIRY_LIMITER",
        );

        if (!rateLimit.allowed) {
          return jsonResponse(
            {
              success: false,
              message: rateLimit.message,
            },
            rateLimit.status,
            origin,
            rateLimit.status === 429 ? { "Retry-After": "60" } : {},
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
            origin,
          );
        }

        const result = await withDatabase(env, (client) =>
          createDirectEnquiry(client, parsed.body),
        );

        return jsonResponse(result, 201, origin);
      }

      // Admin enquiry list and filters.
      if (url.pathname === "/api/admin/enquiries" && request.method === "GET") {
        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          return {
            status: 200,
            data: await listAdminEnquiries(client, url),
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Match an individual admin enquiry or its conversion endpoint.
      const adminEnquiryMatch = url.pathname.match(
        /^\/api\/admin\/enquiries\/([^/]+)(?:\/(convert))?$/,
      );

      // Get individual enquiry details.
      if (
        adminEnquiryMatch &&
        !adminEnquiryMatch[2] &&
        request.method === "GET"
      ) {
        const enquiryId = decodeURIComponent(adminEnquiryMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          const enquiry = await getAdminEnquiry(client, enquiryId);

          if (!enquiry) {
            return {
              status: 404,
              data: {
                success: false,
                message: "Enquiry not found.",
              },
            };
          }

          return {
            status: 200,
            data: enquiry,
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Update an individual enquiry.
      if (
        adminEnquiryMatch &&
        !adminEnquiryMatch[2] &&
        request.method === "PATCH"
      ) {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin,
          );
        }

        const enquiryId = decodeURIComponent(adminEnquiryMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          const updated = await updateAdminEnquiry(
            client,
            enquiryId,
            parsed.body,
          );

          if (!updated) {
            return {
              status: 404,
              data: {
                success: false,
                message: "Enquiry not found.",
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

      // Convert an enquiry into an official paid/deposit-paid order.
      if (
        adminEnquiryMatch &&
        adminEnquiryMatch[2] === "convert" &&
        request.method === "POST"
      ) {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin,
          );
        }

        const enquiryId = decodeURIComponent(adminEnquiryMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          const converted = await convertAdminEnquiry(
            client,
            enquiryId,
            parsed.body,
            admin.id,
          );

          if (!converted) {
            return {
              status: 404,
              data: {
                success: false,
                message: "Enquiry not found.",
              },
            };
          }

          return {
            status: 201,
            data: converted,
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Create an official admin order.
      if (url.pathname === "/api/admin/orders" && request.method === "POST") {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin,
          );
        }

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          return {
            status: 201,
            data: await createAdminOrder(client, parsed.body, admin.id),
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Admin order list and filters.
      if (url.pathname === "/api/admin/orders" && request.method === "GET") {
        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          return {
            status: 200,
            data: await listAdminOrders(client, url),
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Record an additional payment against an order.
      const adminOrderPaymentMatch = url.pathname.match(
        /^\/api\/admin\/orders\/([^/]+)\/payments$/,
      );

      if (adminOrderPaymentMatch && request.method === "POST") {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin,
          );
        }

        const orderId = decodeURIComponent(adminOrderPaymentMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          return {
            status: 201,
            data: await recordAdminOrderPayment(
              client,
              orderId,
              parsed.body,
              admin.id,
            ),
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Record a full refund against an order.
      const adminOrderRefundMatch = url.pathname.match(
        /^\/api\/admin\/orders\/([^/]+)\/refund$/,
      );

      if (adminOrderRefundMatch && request.method === "POST") {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin,
          );
        }

        const orderId = decodeURIComponent(adminOrderRefundMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          return {
            status: 200,
            data: await refundAdminOrder(
              client,
              orderId,
              parsed.body,
              admin.id,
            ),
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Admin individual order details.
      const adminOrderMatch = url.pathname.match(
        /^\/api\/admin\/orders\/([^/]+)$/,
      );

      if (adminOrderMatch && request.method === "GET") {
        const orderId = decodeURIComponent(adminOrderMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          const order = await getAdminOrder(client, orderId);

          if (!order) {
            return {
              status: 404,
              data: {
                success: false,
                message: "Order not found.",
              },
            };
          }

          return {
            status: 200,
            data: order,
          };
        });

        return jsonResponse(result.data, result.status, origin);
      }
      // Admin order updates.
      if (adminOrderMatch && request.method === "PATCH") {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin,
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
                message: "Not authenticated.",
              },
            };
          }

          const updated = await updateAdminOrder(
            client,
            orderId,
            parsed.body,
            admin.id,
          );
          if (!updated) {
            return {
              status: 404,
              data: {
                success: false,
                message: "Order not found.",
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
      // Public active product categories.
      if (
        url.pathname === "/api/categories" &&
        request.method === "GET"
      ) {
        const result = await withDatabase(env, (client) =>
          listPublicCategories(client)
        );

        return jsonResponse(result, 200, origin, {
          "Cache-Control": "public, max-age=300, s-maxage=600",
        });
      }

      // Public published product catalogue.
      if (
        url.pathname === "/api/products" &&
        request.method === "GET"
      ) {
        const result = await withDatabase(env, (client) =>
          listPublicProducts(client, url)
        );

        const status = result.success ? 200 : 400;

        return jsonResponse(result, status, origin, {
          "Cache-Control": "public, max-age=60, s-maxage=120",
        });
      }

      // Public individual product details.
      const publicProductMatch = url.pathname.match(
        /^\/api\/products\/([^/]+)$/
      );

      if (
        publicProductMatch &&
        request.method === "GET"
      ) {
        const slug = decodeURIComponent(publicProductMatch[1]);

        const product = await withDatabase(env, (client) =>
          getPublicProduct(client, slug)
        );

        if (!product) {
          return jsonResponse(
            {
              success: false,
              message: "Product not found.",
            },
            404,
            origin
          );
        }

        return jsonResponse(
          {
            success: true,
            product,
          },
          200,
          origin,
          {
            "Cache-Control": "public, max-age=60, s-maxage=120",
          }
        );
      }
      // Admin product list and filters.
      if (url.pathname === "/api/admin/products" && request.method === "GET") {
        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
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
      if (url.pathname === "/api/admin/products" && request.method === "POST") {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin,
          );
        }

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
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

      if (url.pathname === "/api/admin/uploads" && request.method === "POST") {
        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          return await uploadAdminImage(request, env);
        });

        return jsonResponse(result.data, result.status, origin);
      }

      // Match an individual admin product.
      const adminProductMatch = url.pathname.match(
        /^\/api\/admin\/products\/([^/]+)$/,
      );

      // Get individual admin product details.
      if (adminProductMatch && request.method === "GET") {
        const productId = decodeURIComponent(adminProductMatch[1]);

        const result = await withDatabase(env, async (client) => {
          const admin = await requireAdmin(client, request);

          if (!admin) {
            return {
              status: 401,
              data: {
                success: false,
                message: "Not authenticated.",
              },
            };
          }

          const product = await getAdminProduct(client, productId);

          if (!product) {
            return {
              status: 404,
              data: {
                success: false,
                message: "Product not found.",
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
      if (adminProductMatch && request.method === "PATCH") {
        const parsed = await readJsonBody(request);

        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              message: parsed.message,
            },
            parsed.status,
            origin,
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
                message: "Not authenticated.",
              },
            };
          }

          const updated = await updateAdminProduct(
            client,
            productId,
            parsed.body,
          );

          if (!updated) {
            return {
              status: 404,
              data: {
                success: false,
                message: "Product not found.",
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
          message: "API endpoint not found.",
        },
        404,
        origin,
      );
    } catch (error) {
      console.error("API error:", error);

      const isValidationError = error.name === "ValidationError";

      return jsonResponse(
        {
          success: false,
          message: isValidationError
            ? error.message
            : "An unexpected server error occurred.",
        },
        isValidationError ? 400 : 500,
        origin,
      );
    }
  },
};
