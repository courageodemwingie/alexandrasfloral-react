const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// PostgreSQL NUMERIC(12,2) maximum: 9,999,999,999.99 NGN.
const MAX_MONEY_KOBO = 999999999999n;

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

function isValidId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function parseMoneyToKobo(value) {
  const amount = String(value);

  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
    throw new ValidationError('Invalid product price.');
  }

  const [whole, fraction = ''] = amount.split('.');
  const amountInKobo =
    BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));

  if (amountInKobo > MAX_MONEY_KOBO) {
    throw new ValidationError('Product price exceeds the allowed limit.');
  }

  return amountInKobo;
}

function formatKobo(amount) {
  const whole = amount / 100n;
  const fraction = String(amount % 100n).padStart(2, '0');
  return `${whole}.${fraction}`;
}

async function validateSelectedOptions(client, productId, selectedOptions) {
  if (selectedOptions === undefined || selectedOptions === null) {
    return [];
  }

  if (!Array.isArray(selectedOptions)) {
    throw new ValidationError('Invalid product customisation selections.');
  }

  if (selectedOptions.length > 20) {
    throw new ValidationError('Too many product customisation selections.');
  }

  const seenOptions = new Set();
  const validatedOptions = [];

  for (const selection of selectedOptions) {
    const { optionId, valueId } = selection || {};

    if (!isValidId(optionId) || !isValidId(valueId)) {
      throw new ValidationError('Invalid product customisation selection.');
    }

    if (seenOptions.has(optionId)) {
      throw new ValidationError(
        'A product option cannot be selected more than once.'
      );
    }

    seenOptions.add(optionId);

    const result = await client.query(
      `SELECT
         po.id AS option_id,
         po.name AS option_name,
         pov.id AS value_id,
         pov.name AS value_name
       FROM product_options po
       JOIN product_option_values pov ON pov.option_id = po.id
       WHERE po.id = $1
         AND pov.id = $2
         AND po.product_id = $3
         AND po.is_active = TRUE
         AND pov.is_active = TRUE
       LIMIT 1`,
      [optionId, valueId, productId]
    );

    if (result.rows.length === 0) {
      throw new ValidationError(
        'One or more selected customisation options are unavailable.'
      );
    }

    const option = result.rows[0];

    validatedOptions.push({
      optionId: option.option_id,
      option: option.option_name,
      valueId: option.value_id,
      value: option.value_name,
    });
  }

  return validatedOptions;
}

export async function validateOrderItems(client, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Your order must contain at least one product.');
  }

  if (items.length > 50) {
    throw new ValidationError('An order cannot contain more than 50 items.');
  }

  const validatedItems = [];
  let orderTotalKobo = 0n;

  for (const item of items) {
    const {
      productId,
      variationId = null,
      quantity,
      selectedOptions = [],
    } = item || {};

    if (!isValidId(productId)) {
      throw new ValidationError('An order contains an invalid product.');
    }

    if (variationId !== null && !isValidId(variationId)) {
      throw new ValidationError(
        'An order contains an invalid product variation.'
      );
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      throw new ValidationError(
        'Product quantities must be whole numbers between 1 and 100.'
      );
    }

    const productResult = await client.query(
      `SELECT
         p.id,
         p.name,
         p.slug,
         p.base_price,
         p.has_variable_pricing,
         p.is_active,
         c.name AS category_name,
         c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1
         AND p.is_active = TRUE
         AND c.is_active = TRUE
       LIMIT 1`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new ValidationError(
        'One or more products are no longer available.'
      );
    }

    const product = productResult.rows[0];
    let variation = null;

    if (variationId) {
      const variationResult = await client.query(
        `SELECT id, name, size_details, price
         FROM product_variations
         WHERE id = $1
           AND product_id = $2
           AND is_active = TRUE
         LIMIT 1`,
        [variationId, productId]
      );

      if (variationResult.rows.length === 0) {
        throw new ValidationError(
          `The selected variation for "${product.name}" is unavailable.`
        );
      }

      variation = variationResult.rows[0];
    }

    // Main product price is the default. A variation overrides it only
    // when the user explicitly selects a valid active variation.
    const priceToUse = variation ? variation.price : product.base_price;

    if (priceToUse === null || priceToUse === undefined) {
      throw new ValidationError(
        `A main product price has not been configured for "${product.name}".`
      );
    }

    const unitPriceKobo = parseMoneyToKobo(priceToUse);

    const validatedOptions = await validateSelectedOptions(
      client,
      productId,
      selectedOptions
    );

    const lineTotalKobo = unitPriceKobo * BigInt(quantity);

    if (lineTotalKobo > MAX_MONEY_KOBO) {
      throw new ValidationError(
        'The product line total exceeds the allowed limit.'
      );
    }

    orderTotalKobo += lineTotalKobo;

    if (orderTotalKobo > MAX_MONEY_KOBO) {
      throw new ValidationError('The order total exceeds the allowed limit.');
    }

    validatedItems.push({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      categoryName: product.category_name,
      categorySlug: product.category_slug,
      variationId: variation?.id || null,
      variationName: variation?.name || null,
      sizeDetails: variation?.size_details || null,
      selectedOptions: validatedOptions,
      quantity,
      unitPrice: formatKobo(unitPriceKobo),
      lineTotal: formatKobo(lineTotalKobo),
    });
  }

  return {
    items: validatedItems,
    totalAmount: formatKobo(orderTotalKobo),
  };
}