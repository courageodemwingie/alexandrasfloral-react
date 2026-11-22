
import { ValidationError } from './order-validation.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_STATUSES = new Set([
  'new',
  'contacted',
  'awaiting_payment',
  'paid',
  'processing',
  'dispatched',
  'completed',
  'cancelled',
]);

const ALLOWED_SOURCES = new Set([
  'cart',
  'direct_enquiry',
]);

function validateOrderId(id) {
  return typeof id === 'string' && UUID_PATTERN.test(id);
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

function validatePhoneNumber(value) {
  const phone = cleanText(value, 'WhatsApp number', 30, true);

  if (
    !/^[+0-9\s()-]+$/.test(phone) ||
    phone.replace(/\D/g, '').length < 7
  ) {
    throw new ValidationError(
      'Please provide a valid WhatsApp number.'
    );
  }

  return phone;
}

function validateDeliveryDate(value) {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new ValidationError(
      'Please provide a valid delivery date.'
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new ValidationError(
      'Please provide a valid delivery date.'
    );
  }

  return value;
}

export async function listAdminOrders(client, url) {
  const status = url.searchParams.get('status');
  const source = url.searchParams.get('source');

  if (status && !ALLOWED_STATUSES.has(status)) {
    throw new ValidationError('Invalid order status filter.');
  }

  if (source && !ALLOWED_SOURCES.has(source)) {
    throw new ValidationError('Invalid order source filter.');
  }

  const requestedLimit = Number(url.searchParams.get('limit') || 20);
  const requestedOffset = Number(url.searchParams.get('offset') || 0);

  if (
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1 ||
    requestedLimit > 100 ||
    !Number.isInteger(requestedOffset) ||
    requestedOffset < 0
  ) {
    throw new ValidationError('Invalid pagination values.');
  }

  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`o.status = $${values.length}`);
  }

  if (source) {
    values.push(source);
    conditions.push(`o.order_source = $${values.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const countResult = await client.query(
    `SELECT COUNT(*)::integer AS total
     FROM orders o
     ${whereClause}`,
    values
  );

  const total = countResult.rows[0].total;

  const queryValues = [...values, requestedLimit, requestedOffset];

  const result = await client.query(
    `SELECT
       o.id,
       o.order_number,
       o.customer_id,
       o.customer_name,
       o.whatsapp_number,
       o.order_source,
       o.status,
       o.delivery_city,
       o.delivery_address,
       o.delivery_notes,
       o.delivery_date,
       o.total_amount,
       o.currency,
       o.created_at,
       o.updated_at,
       COUNT(oi.id)::integer AS item_count
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     ${whereClause}
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    queryValues
  );

  return {
    success: true,
    orders: result.rows,
    pagination: {
      total,
      limit: requestedLimit,
      offset: requestedOffset,
      hasMore: requestedOffset + result.rows.length < total,
    },
  };
}

export async function getAdminOrder(client, orderId) {
  if (!validateOrderId(orderId)) {
    throw new ValidationError('Invalid order ID.');
  }

  const orderResult = await client.query(
    `SELECT
       id,
       order_number,
       customer_id,
       customer_name,
       whatsapp_number,
       order_source,
       status,
       delivery_city,
       delivery_address,
       delivery_notes,
       delivery_date,
       total_amount,
       currency,
       created_at,
       updated_at
     FROM orders
     WHERE id = $1
     LIMIT 1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const itemsResult = await client.query(
    `SELECT
       id,
       product_id,
       variation_id,
       product_name,
       variation_name,
       selected_options,
       quantity,
       unit_price,
       line_total,
       created_at
     FROM order_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId]
  );

  return {
    success: true,
    order: {
      ...orderResult.rows[0],
      items: itemsResult.rows,
    },
  };
}

export async function updateAdminOrder(client, orderId, body) {
  if (!validateOrderId(orderId)) {
    throw new ValidationError('Invalid order ID.');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid update details.');
  }

  const allowedFields = new Set([
    'status',
    'customerName',
    'whatsappNumber',
    'deliveryCity',
    'deliveryAddress',
    'deliveryNotes',
    'deliveryDate',
  ]);

  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) {
      throw new ValidationError(
        `Unsupported update field: ${field}.`
      );
    }
  }

  await client.query('BEGIN');

  try {
    const existingResult = await client.query(
      `SELECT
         id,
         customer_id,
         customer_name,
         whatsapp_number
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId]
    );

    const existingOrder = existingResult.rows[0];

    if (!existingOrder) {
      await client.query('ROLLBACK');
      return null;
    }

    const assignments = [];
    const values = [];

    function addAssignment(column, value) {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    }

    if (Object.hasOwn(body, 'status')) {
      if (
        typeof body.status !== 'string' ||
        !ALLOWED_STATUSES.has(body.status)
      ) {
        throw new ValidationError('Invalid order status.');
      }

      addAssignment('status', body.status);
    }

    if (
      Object.hasOwn(body, 'customerName') ||
      Object.hasOwn(body, 'whatsappNumber')
    ) {
      const customerName = Object.hasOwn(body, 'customerName')
        ? cleanText(body.customerName, 'Customer name', 150, true)
        : existingOrder.customer_name;

      const whatsappNumber = Object.hasOwn(body, 'whatsappNumber')
        ? validatePhoneNumber(body.whatsappNumber)
        : existingOrder.whatsapp_number;

      if (!customerName || !whatsappNumber) {
        throw new ValidationError(
          'A customer name and WhatsApp number are both required to attach customer details.'
        );
      }

      const city = Object.hasOwn(body, 'deliveryCity')
        ? cleanText(body.deliveryCity, 'Delivery city', 100)
        : null;

      const customerResult = await client.query(
        `INSERT INTO customers (
           full_name,
           whatsapp_number,
           city,
           updated_at
         )
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (whatsapp_number)
         DO UPDATE SET
           full_name = EXCLUDED.full_name,
           city = COALESCE(EXCLUDED.city, customers.city),
           updated_at = NOW()
         RETURNING id`,
        [customerName, whatsappNumber, city]
      );

      addAssignment('customer_id', customerResult.rows[0].id);
      addAssignment('customer_name', customerName);
      addAssignment('whatsapp_number', whatsappNumber);
    }

    if (Object.hasOwn(body, 'deliveryCity')) {
      addAssignment(
        'delivery_city',
        cleanText(body.deliveryCity, 'Delivery city', 100)
      );
    }

    if (Object.hasOwn(body, 'deliveryAddress')) {
      addAssignment(
        'delivery_address',
        cleanText(body.deliveryAddress, 'Delivery address', 1000)
      );
    }

    if (Object.hasOwn(body, 'deliveryNotes')) {
      addAssignment(
        'delivery_notes',
        cleanText(body.deliveryNotes, 'Delivery notes', 1000)
      );
    }

    if (Object.hasOwn(body, 'deliveryDate')) {
      addAssignment(
        'delivery_date',
        validateDeliveryDate(body.deliveryDate)
      );
    }

    if (assignments.length === 0) {
      throw new ValidationError(
        'No supported order changes were provided.'
      );
    }

    values.push(orderId);

    const updateResult = await client.query(
      `UPDATE orders
       SET ${assignments.join(', ')},
           updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING
         id,
         order_number,
         customer_id,
         customer_name,
         whatsapp_number,
         order_source,
         status,
         delivery_city,
         delivery_address,
         delivery_notes,
         delivery_date,
         total_amount,
         currency,
         created_at,
         updated_at`,
      values
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Order updated successfully.',
      order: updateResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Order update rollback failed:', rollbackError);
    });

    throw error;
  }
}
