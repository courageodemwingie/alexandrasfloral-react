
import { ValidationError } from './order-validation.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PUBLICATION_STATUSES = new Set([
  'draft',
  'published',
  'archived',
]);

function validateId(id, fieldName = 'ID') {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return id;
}

function cleanText(value, fieldName, maxLength, required = false) {
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${fieldName} is required.`);
    }

    return null;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  const cleaned = value.trim();

  if (required && !cleaned) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  if (cleaned.length > maxLength) {
    throw new ValidationError(`${fieldName} is too long.`);
  }

  return cleaned || null;
}

function validateBoolean(value, fieldName, fallback = false) {
  if (value === undefined) return fallback;

  if (typeof value !== 'boolean') {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return value;
}

function validateInteger(value, fieldName, fallback = 0) {
  if (value === undefined) return fallback;

  if (!Number.isInteger(value) || value < 0 || value > 1000000) {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return value;
}

function validatePrice(value, fieldName, required = true) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ValidationError(`${fieldName} is required.`);
    }

    return null;
  }

  const price = String(value).trim();

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(price)) {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return numericPrice.toFixed(2);
}

function createSlug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

async function validateSlug(client, slug, excludeId = null) {
  if (!slug) {
    throw new ValidationError('A valid product slug is required.');
  }

  const result = await client.query(
    `SELECT id
     FROM products
     WHERE slug = $1
       AND ($2::uuid IS NULL OR id <> $2::uuid)
     LIMIT 1`,
    [slug, excludeId]
  );

  if (result.rows.length > 0) {
    throw new ValidationError(
      'This product URL already exists. Please use a different slug.'
    );
  }
}

async function validateCategory(client, categoryId) {
  const result = await client.query(
    `SELECT id
     FROM categories
     WHERE id = $1
       AND is_active = TRUE
     LIMIT 1`,
    [categoryId]
  );

  if (result.rows.length === 0) {
    throw new ValidationError('Please select an active product category.');
  }
}

function validatePublicationStatus(value, fallback = 'draft') {
  const status = value === undefined ? fallback : value;

  if (
    typeof status !== 'string' ||
    !PUBLICATION_STATUSES.has(status)
  ) {
    throw new ValidationError('Invalid product publication status.');
  }

  return status;
}

function validateVariation(variation, index) {
  if (!variation || typeof variation !== 'object' || Array.isArray(variation)) {
    throw new ValidationError(`Invalid variation at position ${index + 1}.`);
  }

  const id = variation.id
    ? validateId(variation.id, 'variation ID')
    : null;

  return {
    id,
    name: cleanText(
      variation.name,
      'Variation name',
      150,
      true
    ),
    sizeDetails: cleanText(
      variation.sizeDetails,
      'Variation size details',
      500
    ),
    price: validatePrice(
      variation.price,
      'Variation price'
    ),
    imageKey: cleanText(
      variation.imageKey,
      'Variation image key',
      1000
    ),
    sortOrder: validateInteger(
      variation.sortOrder,
      'Variation sort order',
      index
    ),
    isActive: validateBoolean(
      variation.isActive,
      'Variation active status',
      true
    ),
  };
}

function validateOption(option, index) {
  if (!option || typeof option !== 'object' || Array.isArray(option)) {
    throw new ValidationError(`Invalid product option at position ${index + 1}.`);
  }

  const id = option.id
    ? validateId(option.id, 'option ID')
    : null;

  if (!Array.isArray(option.values || [])) {
    throw new ValidationError('Option values must be an array.');
  }

  if ((option.values || []).length > 100) {
    throw new ValidationError('Too many values for one product option.');
  }

  return {
    id,
    name: cleanText(option.name, 'Option name', 150, true),
    sortOrder: validateInteger(
      option.sortOrder,
      'Option sort order',
      index
    ),
    isActive: validateBoolean(
      option.isActive,
      'Option active status',
      true
    ),
    values: (option.values || []).map((value, valueIndex) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ValidationError('Invalid product option value.');
      }

      return {
        id: value.id
          ? validateId(value.id, 'option value ID')
          : null,
        name: cleanText(
          value.name,
          'Option value name',
          150,
          true
        ),
        imageKey: cleanText(
          value.imageKey,
          'Option value image key',
          1000
        ),
        sortOrder: validateInteger(
          value.sortOrder,
          'Option value sort order',
          valueIndex
        ),
        isActive: validateBoolean(
          value.isActive,
          'Option value active status',
          true
        ),
      };
    }),
  };
}

function validateProductBody(body, existing = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid product details.');
  }

  const allowedFields = new Set([
    'name',
    'slug',
    'description',
    'categoryId',
    'basePrice',
    'hasVariablePricing',
    'mainImageKey',
    'featured',
    'isActive',
    'sortOrder',
    'publicationStatus',
    'variations',
    'options',
  ]);

  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) {
      throw new ValidationError(`Unsupported product field: ${field}.`);
    }
  }

  const name = Object.hasOwn(body, 'name')
    ? cleanText(body.name, 'Product name', 200, true)
    : existing?.name;

  if (!name) {
    throw new ValidationError('Product name is required.');
  }

  const categoryId = Object.hasOwn(body, 'categoryId')
    ? validateId(body.categoryId, 'category ID')
    : existing?.category_id;

  if (!categoryId) {
    throw new ValidationError('Product category is required.');
  }

  const slugInput = Object.hasOwn(body, 'slug')
    ? cleanText(body.slug, 'Product slug', 180)
    : existing?.slug;

  const slug = createSlug(slugInput || name);

  if (!slug) {
    throw new ValidationError('A valid product slug is required.');
  }

  const description = Object.hasOwn(body, 'description')
    ? cleanText(body.description, 'Product description', 10000)
    : existing?.description ?? null;

  const basePrice = Object.hasOwn(body, 'basePrice')
    ? validatePrice(body.basePrice, 'Base price', false)
    : existing?.base_price ?? null;

  const hasVariablePricing = Object.hasOwn(body, 'hasVariablePricing')
    ? validateBoolean(body.hasVariablePricing, 'variation pricing setting')
    : existing?.has_variable_pricing ?? false;

  const mainImageKey = Object.hasOwn(body, 'mainImageKey')
    ? cleanText(body.mainImageKey, 'Main image key', 1000)
    : existing?.main_image_key ?? null;

  const featured = Object.hasOwn(body, 'featured')
    ? validateBoolean(body.featured, 'featured status')
    : existing?.featured ?? false;

  const isActive = Object.hasOwn(body, 'isActive')
    ? validateBoolean(body.isActive, 'active status')
    : existing?.is_active ?? true;

  const sortOrder = Object.hasOwn(body, 'sortOrder')
    ? validateInteger(body.sortOrder, 'Product sort order')
    : existing?.sort_order ?? 0;

  const publicationStatus = validatePublicationStatus(
    body.publicationStatus,
    existing?.publication_status ?? 'draft'
  );

  const variations = Object.hasOwn(body, 'variations')
    ? (() => {
        if (!Array.isArray(body.variations) || body.variations.length > 100) {
          throw new ValidationError('Invalid product variations.');
        }

        return body.variations.map(validateVariation);
      })()
    : undefined;

  const options = Object.hasOwn(body, 'options')
    ? (() => {
        if (!Array.isArray(body.options) || body.options.length > 30) {
          throw new ValidationError('Invalid product options.');
        }

        return body.options.map(validateOption);
      })()
    : undefined;

  if (publicationStatus === 'published') {
    if (!hasVariablePricing && basePrice === null) {
      throw new ValidationError(
        'A base price is required before publishing this product.'
      );
    }

    if (
      hasVariablePricing &&
      variations &&
      !variations.some((variation) => variation.isActive)
    ) {
      throw new ValidationError(
        'At least one active variation is required before publishing.'
      );
    }
  }

  if (
    publicationStatus === 'published' &&
    hasVariablePricing &&
    !variations &&
    existing
  ) {
    // Existing variations will be checked against the database below.
  }

  return {
    name,
    slug,
    description,
    categoryId,
    basePrice,
    hasVariablePricing,
    mainImageKey,
    featured,
    isActive,
    sortOrder,
    publicationStatus,
    variations,
    options,
  };
}

async function saveVariations(client, productId, variations) {
  const existingResult = await client.query(
    `SELECT id
     FROM product_variations
     WHERE product_id = $1`,
    [productId]
  );

  const existingIds = new Set(existingResult.rows.map((row) => row.id));
  const retainedIds = new Set();

  for (const variation of variations) {
    if (variation.id && !existingIds.has(variation.id)) {
      throw new ValidationError(
        'A variation does not belong to this product.'
      );
    }

    if (variation.id) {
      if (retainedIds.has(variation.id)) {
        throw new ValidationError('Duplicate variation ID.');
      }

      retainedIds.add(variation.id);

      await client.query(
        `UPDATE product_variations
         SET name = $1,
             size_details = $2,
             price = $3,
             image_key = $4,
             sort_order = $5,
             is_active = $6
         WHERE id = $7
           AND product_id = $8`,
        [
          variation.name,
          variation.sizeDetails,
          variation.price,
          variation.imageKey,
          variation.sortOrder,
          variation.isActive,
          variation.id,
          productId,
        ]
      );
    } else {
      await client.query(
        `INSERT INTO product_variations (
           product_id,
           name,
           size_details,
           price,
           image_key,
           sort_order,
           is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          productId,
          variation.name,
          variation.sizeDetails,
          variation.price,
          variation.imageKey,
          variation.sortOrder,
          variation.isActive,
        ]
      );
    }
  }

  for (const existingId of existingIds) {
    if (!retainedIds.has(existingId)) {
      await client.query(
        `UPDATE product_variations
         SET is_active = FALSE
         WHERE id = $1
           AND product_id = $2`,
        [existingId, productId]
      );
    }
  }
}

async function saveOptions(client, productId, options) {
  const existingResult = await client.query(
    `SELECT id
     FROM product_options
     WHERE product_id = $1`,
    [productId]
  );

  const existingIds = new Set(existingResult.rows.map((row) => row.id));
  const retainedIds = new Set();

  for (const option of options) {
    let optionId = option.id;

    if (optionId && !existingIds.has(optionId)) {
      throw new ValidationError(
        'A product option does not belong to this product.'
      );
    }

    if (optionId) {
      if (retainedIds.has(optionId)) {
        throw new ValidationError('Duplicate product option ID.');
      }

      retainedIds.add(optionId);

      await client.query(
        `UPDATE product_options
         SET name = $1,
             sort_order = $2,
             is_active = $3
         WHERE id = $4
           AND product_id = $5`,
        [
          option.name,
          option.sortOrder,
          option.isActive,
          optionId,
          productId,
        ]
      );
    } else {
      const result = await client.query(
        `INSERT INTO product_options (
           product_id,
           name,
           sort_order,
           is_active
         )
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          productId,
          option.name,
          option.sortOrder,
          option.isActive,
        ]
      );

      optionId = result.rows[0].id;
      retainedIds.add(optionId);
    }

    const valueResult = await client.query(
      `SELECT id
       FROM product_option_values
       WHERE option_id = $1`,
      [optionId]
    );

    const existingValueIds = new Set(
      valueResult.rows.map((row) => row.id)
    );

    const retainedValueIds = new Set();

    for (const value of option.values) {
      if (value.id && !existingValueIds.has(value.id)) {
        throw new ValidationError(
          'An option value does not belong to this option.'
        );
      }

      if (value.id) {
        if (retainedValueIds.has(value.id)) {
          throw new ValidationError('Duplicate option value ID.');
        }

        retainedValueIds.add(value.id);

        await client.query(
          `UPDATE product_option_values
           SET name = $1,
               image_key = $2,
               sort_order = $3,
               is_active = $4
           WHERE id = $5
             AND option_id = $6`,
          [
            value.name,
            value.imageKey,
            value.sortOrder,
            value.isActive,
            value.id,
            optionId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO product_option_values (
             option_id,
             name,
             image_key,
             sort_order,
             is_active
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [
            optionId,
            value.name,
            value.imageKey,
            value.sortOrder,
            value.isActive,
          ]
        );
      }
    }

    for (const existingValueId of existingValueIds) {
      if (!retainedValueIds.has(existingValueId)) {
        await client.query(
          `UPDATE product_option_values
           SET is_active = FALSE
           WHERE id = $1
             AND option_id = $2`,
          [existingValueId, optionId]
        );
      }
    }
  }

  for (const existingId of existingIds) {
    if (!retainedIds.has(existingId)) {
      await client.query(
        `UPDATE product_options
         SET is_active = FALSE
         WHERE id = $1
           AND product_id = $2`,
        [existingId, productId]
      );

      await client.query(
        `UPDATE product_option_values
         SET is_active = FALSE
         WHERE option_id = $1`,
        [existingId]
      );
    }
  }
}

async function getProductDetails(client, productId) {
  const productResult = await client.query(
    `SELECT
       p.id,
       p.name,
       p.slug,
       p.description,
       p.category_id,
       c.name AS category_name,
       c.slug AS category_slug,
       p.base_price,
       p.has_variable_pricing,
       p.main_image_key,
       p.featured,
       p.is_active,
       p.sort_order,
       p.publication_status,
       p.created_at,
       p.updated_at
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1
     LIMIT 1`,
    [productId]
  );

  if (productResult.rows.length === 0) {
    return null;
  }

  const variationsResult = await client.query(
    `SELECT
       id,
       name,
       size_details,
       price,
       image_key,
       sort_order,
       is_active
     FROM product_variations
     WHERE product_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [productId]
  );

  const optionsResult = await client.query(
    `SELECT
       id,
       name,
       sort_order,
       is_active
     FROM product_options
     WHERE product_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [productId]
  );

  const options = [];

  for (const option of optionsResult.rows) {
    const valuesResult = await client.query(
      `SELECT
         id,
         name,
         image_key,
         sort_order,
         is_active
       FROM product_option_values
       WHERE option_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [option.id]
    );

    options.push({
      ...option,
      values: valuesResult.rows,
    });
  }

  return {
    ...productResult.rows[0],
    variations: variationsResult.rows,
    options,
  };
}

export async function listAdminProducts(client, url) {
  const status = url.searchParams.get('status');
  const categoryId = url.searchParams.get('categoryId');
  const search = url.searchParams.get('search');

  if (status && !PUBLICATION_STATUSES.has(status)) {
    throw new ValidationError('Invalid publication status filter.');
  }

  if (categoryId) {
    validateId(categoryId, 'category ID');
  }

  const limit = Number(url.searchParams.get('limit') || 20);
  const offset = Number(url.searchParams.get('offset') || 0);

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 1000000
  ) {
    throw new ValidationError('Invalid pagination values.');
  }

  if (search !== null && search.length > 200) {
    throw new ValidationError('Product search is too long.');
  }

  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`p.publication_status = $${values.length}`);
  }

  if (categoryId) {
    values.push(categoryId);
    conditions.push(`p.category_id = $${values.length}`);
  }

  if (search && search.trim()) {
    values.push(`%${search.trim()}%`);
    conditions.push(
      `(p.name ILIKE $${values.length} OR p.slug ILIKE $${values.length})`
    );
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const countResult = await client.query(
    `SELECT COUNT(*)::integer AS total
     FROM products p
     ${whereClause}`,
    values
  );

  const queryValues = [...values, limit, offset];

  const result = await client.query(
    `SELECT
       p.id,
       p.name,
       p.slug,
       p.description,
       p.category_id,
       c.name AS category_name,
       p.base_price,
       p.has_variable_pricing,
       p.main_image_key,
       p.featured,
       p.is_active,
       p.sort_order,
       p.publication_status,
       p.created_at,
       p.updated_at
     FROM products p
     JOIN categories c ON c.id = p.category_id
     ${whereClause}
     ORDER BY p.sort_order ASC, p.created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    queryValues
  );

  return {
    success: true,
    products: result.rows,
    pagination: {
      total: countResult.rows[0].total,
      limit,
      offset,
      hasMore: offset + result.rows.length < countResult.rows[0].total,
    },
  };
}

export async function getAdminProduct(client, productId) {
  validateId(productId, 'product ID');

  const product = await getProductDetails(client, productId);

  if (!product) {
    return null;
  }

  return {
    success: true,
    product,
  };
}

export async function createAdminProduct(client, body) {
  const product = validateProductBody(body);

  await validateCategory(client, product.categoryId);

  await client.query('BEGIN');

  try {
    await validateSlug(client, product.slug);

    const result = await client.query(
      `INSERT INTO products (
         name,
         slug,
         description,
         category_id,
         base_price,
         has_variable_pricing,
         main_image_key,
         featured,
         is_active,
         sort_order,
         publication_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        product.name,
        product.slug,
        product.description,
        product.categoryId,
        product.basePrice,
        product.hasVariablePricing,
        product.mainImageKey,
        product.featured,
        product.isActive,
        product.sortOrder,
        product.publicationStatus,
      ]
    );

    const productId = result.rows[0].id;

    if (product.variations) {
      await saveVariations(client, productId, product.variations);
    }

    if (product.options) {
      await saveOptions(client, productId, product.options);
    }

    if (product.publicationStatus === 'published' &&
        product.hasVariablePricing) {
      const activeResult = await client.query(
        `SELECT COUNT(*)::integer AS total
         FROM product_variations
         WHERE product_id = $1
           AND is_active = TRUE`,
        [productId]
      );

      if (activeResult.rows[0].total === 0) {
        throw new ValidationError(
          'At least one active variation is required before publishing.'
        );
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Product created successfully.',
      product: await getProductDetails(client, productId),
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Product creation rollback failed:', rollbackError);
    });

    throw error;
  }
}

export async function updateAdminProduct(client, productId, body) {
  validateId(productId, 'product ID');

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid product details.');
  }

  await client.query('BEGIN');

  try {
    const existingResult = await client.query(
      `SELECT *
       FROM products
       WHERE id = $1
       FOR UPDATE`,
      [productId]
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      await client.query('ROLLBACK');
      return null;
    }

    const product = validateProductBody(body, existing);

    await validateCategory(client, product.categoryId);
    await validateSlug(client, product.slug, productId);

    await client.query(
      `UPDATE products
       SET name = $1,
           slug = $2,
           description = $3,
           category_id = $4,
           base_price = $5,
           has_variable_pricing = $6,
           main_image_key = $7,
           featured = $8,
           is_active = $9,
           sort_order = $10,
           publication_status = $11,
           updated_at = NOW()
       WHERE id = $12`,
      [
        product.name,
        product.slug,
        product.description,
        product.categoryId,
        product.basePrice,
        product.hasVariablePricing,
        product.mainImageKey,
        product.featured,
        product.isActive,
        product.sortOrder,
        product.publicationStatus,
        productId,
      ]
    );

    if (product.variations !== undefined) {
      await saveVariations(client, productId, product.variations);
    }

    if (product.options !== undefined) {
      await saveOptions(client, productId, product.options);
    }

    if (product.publicationStatus === 'published') {
      if (!product.hasVariablePricing && product.basePrice === null) {
        throw new ValidationError(
          'A base price is required before publishing this product.'
        );
      }

      if (product.hasVariablePricing) {
        const activeResult = await client.query(
          `SELECT COUNT(*)::integer AS total
           FROM product_variations
           WHERE product_id = $1
             AND is_active = TRUE`,
          [productId]
        );

        if (activeResult.rows[0].total === 0) {
          throw new ValidationError(
            'At least one active variation is required before publishing.'
          );
        }
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Product updated successfully.',
      product: await getProductDetails(client, productId),
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Product update rollback failed:', rollbackError);
    });

    throw error;
  }
}
