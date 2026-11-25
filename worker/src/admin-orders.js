import {
  validateOrderItems,
  ValidationError,
} from './order-validation.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SOURCES = new Set([
  'website',
  'whatsapp',
  'instagram',
  'x',
  'in_store',
]);

const CHANNELS = SOURCES;

const FULFILMENT_STATUSES = new Set([
  'not_ready',
  'ready',
  'delivered',
]);

const ORDER_STATUSES = new Set([
  'new',
  'contacted',
  'awaiting_payment',
  'paid',
  'processing',
  'dispatched',
  'completed',
  'cancelled',
]);

function isValidId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function cleanText(value, field, maxLength, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${field} is required.`);
    return null;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`Invalid ${field}.`);
  }

  const result = value.trim();

  if (required && !result) {
    throw new ValidationError(`${field} is required.`);
  }

  if (result.length > maxLength) {
    throw new ValidationError(`${field} is too long.`);
  }

  return result || null;
}

function validatePhone(value) {
  const phone = cleanText(value, 'WhatsApp number', 30, true);

  if (
    !/^[+0-9\s()-]+$/.test(phone) ||
    phone.replace(/\D/g, '').length < 7
  ) {
    throw new ValidationError('Please provide a valid WhatsApp number.');
  }

  return phone;
}

function validateDate(value, field = 'Date') {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new ValidationError(`Please provide a valid ${field.toLowerCase()}.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new ValidationError(`Please provide a valid ${field.toLowerCase()}.`);
  }

  return value;
}

function parseMoney(value, field = 'Payment amount') {
  const text = String(value);

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new ValidationError(`Invalid ${field.toLowerCase()}.`);
  }

  const [whole, fraction = ''] = text.split('.');

  const kobo =
    BigInt(whole) * 100n +
    BigInt(fraction.padEnd(2, '0'));

  if (kobo <= 0n || kobo > 999999999999n) {
    throw new ValidationError(`${field} is outside the allowed range.`);
  }

  return {
    text: `${kobo / 100n}.${String(kobo % 100n).padStart(2, '0')}`,
    kobo,
  };
}

function parseNonNegativeMoney(value, field = 'Amount') {
  const text = String(value ?? '0');

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new ValidationError(`Invalid ${field.toLowerCase()}.`);
  }

  const [whole, fraction = ''] = text.split('.');

  const kobo =
    BigInt(whole) * 100n +
    BigInt(fraction.padEnd(2, '0'));

  if (kobo > 999999999999n) {
    throw new ValidationError(`${field} is outside the allowed range.`);
  }

  return {
    text: `${kobo / 100n}.${String(kobo % 100n).padStart(2, '0')}`,
    kobo,
  };
}

function toKobo(value) {
  const [whole, fraction = ''] = String(value).split('.');

  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function generateOrderNumber() {
  return `AF-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

async function createCustomer(client, name, phone, city) {
  const result = await client.query(
    `INSERT INTO customers (
       full_name, whatsapp_number, city, updated_at
     )
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (whatsapp_number)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       city = COALESCE(EXCLUDED.city, customers.city),
       updated_at = NOW()
     RETURNING id`,
    [name, phone, city]
  );

  return result.rows[0].id;
}

async function saveOrderItems(client, orderId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (
         order_id, product_id, variation_id, product_name,
         variation_name, selected_options, quantity,
         unit_price, line_total
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        orderId,
        item.productId,
        item.variationId,
        item.productName,
        item.variationName,
        JSON.stringify(item.selectedOptions),
        item.quantity,
        item.unitPrice,
        item.lineTotal,
      ]
    );
  }
}

async function addHistory(
  client,
  orderId,
  eventType,
  description,
  adminId,
  oldValue = null,
  newValue = null
) {
  await client.query(
    `INSERT INTO order_history (
       order_id, event_type, old_value,
       new_value, description, recorded_by
     )
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [orderId, eventType, oldValue, newValue, description, adminId]
  );
}

/* CREATE MANUAL ORDER */

export async function createAdminOrder(client, body, adminId) {
  if (!isValidId(adminId)) {
    throw new ValidationError('Authenticated admin is required.');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid order details.');
  }

  const customerName = cleanText(
    body.customerName,
    'Customer name',
    150,
    true
  );

  const whatsappNumber = validatePhone(body.whatsappNumber);
  const orderSource = cleanText(body.orderSource, 'Order source', 20, true);
  const orderChannel = cleanText(body.orderChannel, 'Order channel', 20, true);

  if (!SOURCES.has(orderSource)) {
    throw new ValidationError('Invalid order source.');
  }

  if (!CHANNELS.has(orderChannel)) {
    throw new ValidationError('Invalid order channel.');
  }

  const deliveryCity = cleanText(body.deliveryCity, 'Delivery city', 100);
  const deliveryAddress = cleanText(body.deliveryAddress, 'Delivery address', 1000);
  const deliveryNotes = cleanText(body.deliveryNotes, 'Delivery notes', 1000);
  const deliveryDate = validateDate(body.deliveryDate, 'Delivery date');

  const deliveryFee = parseNonNegativeMoney(
    body.deliveryFee ?? '0',
    'Delivery fee'
  );

  const internalNotes = cleanText(body.internalNotes, 'Internal notes', 3000);

  const payment = parseMoney(body.paymentAmount);
  const paymentMethod = cleanText(body.paymentMethod, 'Payment method', 40, true);
  const paymentReference = cleanText(body.paymentReference, 'Payment reference', 150);
  const paymentNotes = cleanText(body.paymentNotes, 'Payment notes', 1000);

  const paymentDate = body.paymentDate
    ? new Date(body.paymentDate)
    : new Date();

  if (Number.isNaN(paymentDate.getTime())) {
    throw new ValidationError('Invalid payment date.');
  }

  await client.query('BEGIN');

  try {
    const validated = await validateOrderItems(client, body.items);

    const subtotalKobo = toKobo(validated.totalAmount);
    const totalKobo = subtotalKobo + deliveryFee.kobo;

    const subtotalAmount = validated.totalAmount;
    const totalAmount =
      `${totalKobo / 100n}.${String(totalKobo % 100n).padStart(2, '0')}`;

    if (payment.kobo > totalKobo) {
      throw new ValidationError(
        'Initial payment cannot exceed the order total.'
      );
    }

    const paymentStatus =
      payment.kobo === totalKobo ? 'fully_paid' : 'deposit_paid';

    const customerId = await createCustomer(
      client,
      customerName,
      whatsappNumber,
      deliveryCity
    );

    const orderResult = await client.query(
      `INSERT INTO orders (
         order_number,
         customer_id,
         customer_name,
         whatsapp_number,
         order_source,
         order_channel,
         status,
         fulfilment_status,
         delivery_city,
         delivery_address,
         delivery_notes,
         delivery_date,
         subtotal_amount,
         delivery_fee,
         total_amount,
         currency,
         payment_status,
         internal_notes,
         confirmed_at,
         confirmed_by
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         'processing', 'not_ready',
         $7, $8, $9, $10, $11, $12, $13,
         'NGN', $14, $15, NOW(), $16
       )
       RETURNING *`,
      [
        generateOrderNumber(),
        customerId,
        customerName,
        whatsappNumber,
        orderSource,
        orderChannel,
        deliveryCity,
        deliveryAddress,
        deliveryNotes,
        deliveryDate,
        subtotalAmount,
        deliveryFee.text,
        totalAmount,
        paymentStatus,
        internalNotes,
        adminId,
      ]
    );

    const order = orderResult.rows[0];

    await saveOrderItems(client, order.id, validated.items);

    await client.query(
      `INSERT INTO order_payments (
         order_id, amount, payment_method, payment_reference,
         payment_date, notes, recorded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        order.id,
        payment.text,
        paymentMethod,
        paymentReference,
        paymentDate.toISOString(),
        paymentNotes,
        adminId,
      ]
    );

    await addHistory(
      client,
      order.id,
      'order_created',
      'Official order manually recorded with initial payment.',
      adminId,
      null,
      paymentStatus
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Order created successfully.',
      order,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Order creation rollback failed:', rollbackError);
    });

    throw error;
  }
}

/* LIST ORDERS */

export async function listAdminOrders(client, url) {
  const status = url.searchParams.get('status');
  const source = url.searchParams.get('source');
  const channel = url.searchParams.get('channel');
  const paymentStatus = url.searchParams.get('paymentStatus');
  const fulfilmentStatus = url.searchParams.get('fulfilmentStatus');

  if (status && !ORDER_STATUSES.has(status)) {
    throw new ValidationError('Invalid order status filter.');
  }

  if (source && !SOURCES.has(source)) {
    throw new ValidationError('Invalid order source filter.');
  }

  if (channel && !CHANNELS.has(channel)) {
    throw new ValidationError('Invalid order channel filter.');
  }

  if (
    paymentStatus &&
    !['deposit_paid', 'fully_paid', 'refunded'].includes(paymentStatus)
  ) {
    throw new ValidationError('Invalid payment status filter.');
  }

  if (fulfilmentStatus && !FULFILMENT_STATUSES.has(fulfilmentStatus)) {
    throw new ValidationError('Invalid fulfilment status filter.');
  }

  const limit = Number(url.searchParams.get('limit') || 20);
  const offset = Number(url.searchParams.get('offset') || 0);

  if (
    !Number.isInteger(limit) || limit < 1 || limit > 100 ||
    !Number.isInteger(offset) || offset < 0
  ) {
    throw new ValidationError('Invalid pagination values.');
  }

  const conditions = [];
  const values = [];

  const addFilter = (column, value) => {
    if (value) {
      values.push(value);
      conditions.push(`${column} = $${values.length}`);
    }
  };

  addFilter('o.status', status);
  addFilter('o.order_source', source);
  addFilter('o.order_channel', channel);
  addFilter('o.payment_status', paymentStatus);
  addFilter('o.fulfilment_status', fulfilmentStatus);

  const where = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const countResult = await client.query(
    `SELECT COUNT(*)::integer AS total
     FROM orders o
     ${where}`,
    values
  );

  const result = await client.query(
    `SELECT
       o.id,
       o.order_number,
       o.customer_name,
       o.whatsapp_number,
       o.order_source,
       o.order_channel,
       o.status,
       o.payment_status,
       o.fulfilment_status,
       o.subtotal_amount,
       o.delivery_fee,
       o.total_amount,
       o.currency,
       o.delivery_city,
       o.delivery_date,
       o.created_at,
       COALESCE(oi.item_count, 0)::integer AS item_count,
       COALESCE(op.amount_paid, 0)::numeric(12,2) AS amount_paid
     FROM orders o
     LEFT JOIN (
       SELECT
         order_id,
         COUNT(*)::integer AS item_count
       FROM order_items
       GROUP BY order_id
     ) oi ON oi.order_id = o.id
     LEFT JOIN (
       SELECT
         order_id,
         SUM(amount)::numeric(12,2) AS amount_paid
       FROM order_payments
       GROUP BY order_id
     ) op ON op.order_id = o.id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    [...values, limit, offset]
  );

  return {
    success: true,
    orders: result.rows,
    pagination: {
      total: countResult.rows[0].total,
      limit,
      offset,
      hasMore: offset + result.rows.length < countResult.rows[0].total,
    },
  };
}

/* GET ORDER DETAILS */

export async function getAdminOrder(client, orderId) {
  if (!isValidId(orderId)) {
    throw new ValidationError('Invalid order ID.');
  }

  const orderResult = await client.query(
    `SELECT * FROM orders WHERE id = $1 LIMIT 1`,
    [orderId]
  );

  if (!orderResult.rows.length) return null;

  const [items, payments, refunds, history] = await Promise.all([
    client.query(
      `SELECT * FROM order_items
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [orderId]
    ),

    client.query(
      `SELECT id, amount, payment_method, payment_reference,
              payment_date, notes, recorded_by, created_at
       FROM order_payments
       WHERE order_id = $1
       ORDER BY payment_date ASC`,
      [orderId]
    ),

    client.query(
      `SELECT id, amount, refund_method, refund_reference,
              refund_date, reason, recorded_by, created_at
       FROM order_refunds
       WHERE order_id = $1
       LIMIT 1`,
      [orderId]
    ),

    client.query(
      `SELECT id, event_type, old_value, new_value,
              description, recorded_by, created_at
       FROM order_history
       WHERE order_id = $1
       ORDER BY created_at DESC`,
      [orderId]
    ),
  ]);

  return {
    success: true,
    order: {
      ...orderResult.rows[0],
      items: items.rows,
      payments: payments.rows,
      refund: refunds.rows[0] || null,
      history: history.rows,
    },
  };
}

/* UPDATE ORDER DETAILS */

export async function updateAdminOrder(client, orderId, body, adminId) {
  if (!isValidId(orderId)) {
    throw new ValidationError('Invalid order ID.');
  }

  if (!isValidId(adminId)) {
    throw new ValidationError('Authenticated admin is required.');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid order update.');
  }

  const allowed = new Set([
    'status',
    'fulfilmentStatus',
    'customerName',
    'whatsappNumber',
    'deliveryCity',
    'deliveryAddress',
    'deliveryNotes',
    'deliveryDate',
    'internalNotes',
  ]);

  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      throw new ValidationError(`Unsupported update field: ${key}.`);
    }
  }

  await client.query('BEGIN');

  try {
    const existingResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      await client.query('ROLLBACK');
      return null;
    }

    const assignments = [];
    const values = [];

    const add = (column, value) => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    const historyEntries = [];

    if (Object.hasOwn(body, 'status')) {
      if (!ORDER_STATUSES.has(body.status)) {
        throw new ValidationError('Invalid order status.');
      }

      if (body.status !== existing.status) {
        add('status', body.status);
        historyEntries.push([
          'status_changed',
          existing.status,
          body.status,
          `Order status changed from ${existing.status} to ${body.status}.`,
        ]);
      }
    }

    if (Object.hasOwn(body, 'fulfilmentStatus')) {
      if (!FULFILMENT_STATUSES.has(body.fulfilmentStatus)) {
        throw new ValidationError('Invalid fulfilment status.');
      }

      if (body.fulfilmentStatus !== existing.fulfilment_status) {
        add('fulfilment_status', body.fulfilmentStatus);
        historyEntries.push([
          'fulfilment_changed',
          existing.fulfilment_status,
          body.fulfilmentStatus,
          `Fulfilment status changed to ${body.fulfilmentStatus}.`,
        ]);
      }
    }

    if (
      Object.hasOwn(body, 'customerName') ||
      Object.hasOwn(body, 'whatsappNumber')
    ) {
      const name = Object.hasOwn(body, 'customerName')
        ? cleanText(body.customerName, 'Customer name', 150, true)
        : existing.customer_name;

      const phone = Object.hasOwn(body, 'whatsappNumber')
        ? validatePhone(body.whatsappNumber)
        : existing.whatsapp_number;

      const city = Object.hasOwn(body, 'deliveryCity')
        ? cleanText(body.deliveryCity, 'Delivery city', 100)
        : existing.delivery_city;

      const customerId = await createCustomer(client, name, phone, city);

      add('customer_id', customerId);
      add('customer_name', name);
      add('whatsapp_number', phone);
    }

    if (Object.hasOwn(body, 'deliveryCity')) {
      add('delivery_city', cleanText(body.deliveryCity, 'Delivery city', 100));
    }

    if (Object.hasOwn(body, 'deliveryAddress')) {
      add('delivery_address', cleanText(body.deliveryAddress, 'Delivery address', 1000));
    }

    if (Object.hasOwn(body, 'deliveryNotes')) {
      add('delivery_notes', cleanText(body.deliveryNotes, 'Delivery notes', 1000));
    }

    if (Object.hasOwn(body, 'deliveryDate')) {
      add('delivery_date', validateDate(body.deliveryDate, 'Delivery date'));
    }

    if (Object.hasOwn(body, 'internalNotes')) {
      add('internal_notes', cleanText(body.internalNotes, 'Internal notes', 3000));
    }

    if (!assignments.length) {
      throw new ValidationError('No order changes were provided.');
    }

    values.push(orderId);

    const updated = await client.query(
      `UPDATE orders
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    for (const entry of historyEntries) {
      await addHistory(
        client,
        orderId,
        entry[0],
        entry[3],
        adminId,
        entry[1],
        entry[2]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Order updated successfully.',
      order: updated.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Order update rollback failed:', rollbackError);
    });

    throw error;
  }
}

/* RECORD AN ADDITIONAL PAYMENT */

export async function recordAdminOrderPayment(client, orderId, body, adminId) {
  if (!isValidId(orderId) || !isValidId(adminId)) {
    throw new ValidationError('Invalid order or admin ID.');
  }

  const payment = parseMoney(body?.amount);
  const method = cleanText(body?.paymentMethod, 'Payment method', 40, true);
  const reference = cleanText(body?.paymentReference, 'Payment reference', 150);
  const notes = cleanText(body?.notes, 'Payment notes', 1000);

  const paymentDate = body?.paymentDate
    ? new Date(body.paymentDate)
    : new Date();

  if (Number.isNaN(paymentDate.getTime())) {
    throw new ValidationError('Invalid payment date.');
  }

  await client.query('BEGIN');

  try {
    const result = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    const order = result.rows[0];

    if (!order) {
      await client.query('ROLLBACK');
      return null;
    }

    if (order.payment_status === 'refunded') {
      throw new ValidationError('A refunded order cannot receive another payment.');
    }

    const totals = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric(12,2) AS paid
       FROM order_payments WHERE order_id = $1`,
      [orderId]
    );

    const paidKobo = toKobo(totals.rows[0].paid);
    const totalKobo = toKobo(order.total_amount);
    const balanceKobo = totalKobo - paidKobo;

    if (payment.kobo > balanceKobo) {
      throw new ValidationError('Payment cannot exceed the outstanding balance.');
    }

    await client.query(
      `INSERT INTO order_payments (
         order_id, amount, payment_method, payment_reference,
         payment_date, notes, recorded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orderId,
        payment.text,
        method,
        reference,
        paymentDate.toISOString(),
        notes,
        adminId,
      ]
    );

    const newPaidKobo = paidKobo + payment.kobo;
    const newStatus =
      newPaidKobo >= totalKobo ? 'fully_paid' : 'deposit_paid';

    await client.query(
      `UPDATE orders
       SET payment_status = $2, updated_at = NOW()
       WHERE id = $1`,
      [orderId, newStatus]
    );

    await addHistory(
      client,
      orderId,
      'payment_received',
      `Payment of NGN ${payment.text} recorded.`,
      adminId,
      order.payment_status,
      newStatus
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Payment recorded successfully.',
      paymentStatus: newStatus,
      amountPaid: `${newPaidKobo / 100n}.${String(newPaidKobo % 100n).padStart(2, '0')}`,
      balance: `${(totalKobo - newPaidKobo) / 100n}.${String((totalKobo - newPaidKobo) % 100n).padStart(2, '0')}`,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Payment rollback failed:', rollbackError);
    });

    throw error;
  }
}

/* RECORD A FULL REFUND */

export async function refundAdminOrder(client, orderId, body, adminId) {
  if (!isValidId(orderId) || !isValidId(adminId)) {
    throw new ValidationError('Invalid order or admin ID.');
  }

  const method = cleanText(body?.refundMethod, 'Refund method', 40, true);
  const reference = cleanText(body?.refundReference, 'Refund reference', 150);
  const reason = cleanText(body?.reason, 'Refund reason', 1000);

  const refundDate = body?.refundDate
    ? new Date(body.refundDate)
    : new Date();

  if (Number.isNaN(refundDate.getTime())) {
    throw new ValidationError('Invalid refund date.');
  }

  await client.query('BEGIN');

  try {
    const result = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    const order = result.rows[0];

    if (!order) {
      await client.query('ROLLBACK');
      return null;
    }

    if (order.payment_status === 'refunded') {
      throw new ValidationError('This order has already been refunded.');
    }

    const paymentsResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric(12,2) AS paid
       FROM order_payments WHERE order_id = $1`,
      [orderId]
    );

    const paid = parseMoney(paymentsResult.rows[0].paid, 'Refund amount');

    await client.query(
      `INSERT INTO order_refunds (
         order_id, amount, refund_method,
         refund_reference, refund_date, reason, recorded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orderId,
        paid.text,
        method,
        reference,
        refundDate.toISOString(),
        reason,
        adminId,
      ]
    );

    await client.query(
      `UPDATE orders
       SET payment_status = 'refunded', updated_at = NOW()
       WHERE id = $1`,
      [orderId]
    );

    await addHistory(
      client,
      orderId,
      'order_refunded',
      `Full refund of NGN ${paid.text} recorded.`,
      adminId,
      order.payment_status,
      'refunded'
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Full refund recorded successfully.',
      refundAmount: paid.text,
      paymentStatus: 'refunded',
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Refund rollback failed:', rollbackError);
    });

    throw error;
  }
}