
import { ValidationError } from './order-validation.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ENQUIRY_STATUSES = new Set(['new', 'contacted', 'closed']);
const ORDER_CHANNELS = new Set(['website', 'whatsapp', 'instagram', 'x', 'in_store']);

function isValidId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function cleanText(value, fieldName, maxLength, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${fieldName} is required.`);
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

function parseMoney(value, fieldName = 'Payment amount') {
  const text = String(value);

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new ValidationError(`Invalid ${fieldName.toLowerCase()}.`);
  }

  const [whole, fraction = ''] = text.split('.');
  const kobo = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));

  if (kobo <= 0n || kobo > 999999999999n) {
    throw new ValidationError(`${fieldName} is outside the allowed range.`);
  }

  return {
    text: `${kobo / 100n}.${String(kobo % 100n).padStart(2, '0')}`,
    kobo,
  };
}

function toKobo(value) {
  const text = String(value);
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function generateOrderNumber() {
  return `AF-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export async function listAdminEnquiries(client, url) {
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const requestedLimit = Number(url.searchParams.get('limit') || 20);
  const requestedOffset = Number(url.searchParams.get('offset') || 0);

  if (status && ![...ENQUIRY_STATUSES, 'converted'].includes(status)) {
    throw new ValidationError('Invalid enquiry status filter.');
  }

  if (type && !['cart', 'direct_product'].includes(type)) {
    throw new ValidationError('Invalid enquiry type filter.');
  }

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
    conditions.push(`e.status = $${values.length}`);
  }

  if (type) {
    values.push(type);
    conditions.push(`e.enquiry_type = $${values.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const countResult = await client.query(
    `SELECT COUNT(*)::integer AS total
     FROM enquiries e
     ${whereClause}`,
    values
  );

  const result = await client.query(
    `SELECT
       e.id,
       e.enquiry_number,
       e.enquiry_type,
       e.customer_id,
       e.customer_name,
       e.whatsapp_number,
       e.source,
       e.status,
       e.delivery_city,
       e.requested_delivery_date,
       e.estimated_total,
       e.currency,
       e.converted_order_id,
       e.created_at,
       e.updated_at,
       COUNT(ei.id)::integer AS item_count
     FROM enquiries e
     LEFT JOIN enquiry_items ei ON ei.enquiry_id = e.id
     ${whereClause}
     GROUP BY e.id
     ORDER BY e.created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    [...values, requestedLimit, requestedOffset]
  );

  return {
    success: true,
    enquiries: result.rows,
    pagination: {
      total: countResult.rows[0].total,
      limit: requestedLimit,
      offset: requestedOffset,
      hasMore:
        requestedOffset + result.rows.length <
        countResult.rows[0].total,
    },
  };
}

export async function getAdminEnquiry(client, enquiryId) {
  if (!isValidId(enquiryId)) {
    throw new ValidationError('Invalid enquiry ID.');
  }

  const enquiryResult = await client.query(
    `SELECT
       e.id,
       e.enquiry_number,
       e.enquiry_type,
       e.customer_id,
       e.customer_name,
       e.whatsapp_number,
       e.source,
       e.status,
       e.delivery_city,
       e.delivery_address,
       e.delivery_notes,
       e.requested_delivery_date,
       e.estimated_total,
       e.currency,
       e.converted_order_id,
       e.created_at,
       e.updated_at
     FROM enquiries e
     WHERE e.id = $1
     LIMIT 1`,
    [enquiryId]
  );

  if (!enquiryResult.rows.length) {
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
     FROM enquiry_items
     WHERE enquiry_id = $1
     ORDER BY created_at ASC`,
    [enquiryId]
  );

  return {
    success: true,
    enquiry: {
      ...enquiryResult.rows[0],
      items: itemsResult.rows,
    },
  };
}

export async function updateAdminEnquiry(client, enquiryId, body) {
  if (!isValidId(enquiryId)) {
    throw new ValidationError('Invalid enquiry ID.');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid enquiry update.');
  }

  const allowed = new Set([
    'status',
    'customerName',
    'whatsappNumber',
    'deliveryCity',
    'deliveryAddress',
    'deliveryNotes',
    'requestedDeliveryDate',
  ]);

  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      throw new ValidationError(`Unsupported enquiry update field: ${key}.`);
    }
  }

  if (Object.hasOwn(body, 'status')) {
    if (!ENQUIRY_STATUSES.has(body.status)) {
      throw new ValidationError(
        'Enquiry status must be new, contacted or closed. Converted enquiries are managed by conversion.'
      );
    }
  }

  const assignments = [];
  const values = [];

  const add = (column, value) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (Object.hasOwn(body, 'status')) {
    add('status', body.status);
  }

  if (Object.hasOwn(body, 'customerName')) {
    add(
      'customer_name',
      cleanText(body.customerName, 'Customer name', 150)
    );
  }

  if (Object.hasOwn(body, 'whatsappNumber')) {
    const phone = cleanText(body.whatsappNumber, 'WhatsApp number', 30);

    if (
      phone &&
      (!/^[+0-9\s()-]+$/.test(phone) ||
        phone.replace(/\D/g, '').length < 7)
    ) {
      throw new ValidationError('Please provide a valid WhatsApp number.');
    }

    add('whatsapp_number', phone);
  }

  if (Object.hasOwn(body, 'deliveryCity')) {
    add(
      'delivery_city',
      cleanText(body.deliveryCity, 'Delivery city', 100)
    );
  }

  if (Object.hasOwn(body, 'deliveryAddress')) {
    add(
      'delivery_address',
      cleanText(body.deliveryAddress, 'Delivery address', 1000)
    );
  }

  if (Object.hasOwn(body, 'deliveryNotes')) {
    add(
      'delivery_notes',
      cleanText(body.deliveryNotes, 'Delivery notes', 1000)
    );
  }

  if (Object.hasOwn(body, 'requestedDeliveryDate')) {
    const date = body.requestedDeliveryDate;

    if (
      date !== null &&
      date !== '' &&
      (typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date))
    ) {
      throw new ValidationError('Please provide a valid requested delivery date.');
    }

    add('requested_delivery_date', date || null);
  }

  if (!assignments.length) {
    throw new ValidationError('No supported enquiry changes were provided.');
  }

  values.push(enquiryId);

  const result = await client.query(
    `UPDATE enquiries
     SET ${assignments.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
       AND status <> 'converted'
     RETURNING
       id,
       enquiry_number,
       enquiry_type,
       customer_name,
       whatsapp_number,
       source,
       status,
       delivery_city,
       delivery_address,
       delivery_notes,
       requested_delivery_date,
       estimated_total,
       currency,
       converted_order_id,
       created_at,
       updated_at`,
    values
  );

  if (!result.rows.length) {
    const exists = await client.query(
      'SELECT id FROM enquiries WHERE id = $1',
      [enquiryId]
    );

    if (!exists.rows.length) {
      return null;
    }

    throw new ValidationError('A converted enquiry cannot be edited.');
  }

  return {
    success: true,
    message: 'Enquiry updated successfully.',
    enquiry: result.rows[0],
  };
}

export async function convertAdminEnquiry(
  client,
  enquiryId,
  body,
  adminId
) {
  if (!isValidId(enquiryId)) {
    throw new ValidationError('Invalid enquiry ID.');
  }

  if (!isValidId(adminId)) {
    throw new ValidationError('Authenticated admin is required.');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid order conversion details.');
  }

  const orderChannel = cleanText(
    body.orderChannel,
    'Order channel',
    20,
    true
  );

  if (!ORDER_CHANNELS.has(orderChannel)) {
    throw new ValidationError('Invalid order channel.');
  }

  const payment = parseMoney(body.paymentAmount);
  const paymentMethod = cleanText(
    body.paymentMethod,
    'Payment method',
    40,
    true
  );

  const paymentReference = cleanText(
    body.paymentReference,
    'Payment reference',
    150
  );

  const paymentNotes = cleanText(
    body.paymentNotes,
    'Payment notes',
    1000
  );

  const paymentDate = body.paymentDate
    ? new Date(body.paymentDate)
    : new Date();

  if (Number.isNaN(paymentDate.getTime())) {
    throw new ValidationError('Invalid payment date.');
  }

  await client.query('BEGIN');

  try {
    const enquiryResult = await client.query(
      `SELECT *
       FROM enquiries
       WHERE id = $1
       FOR UPDATE`,
      [enquiryId]
    );

    const enquiry = enquiryResult.rows[0];

    if (!enquiry) {
      await client.query('ROLLBACK');
      return null;
    }

    if (enquiry.status === 'converted' || enquiry.converted_order_id) {
      throw new ValidationError(
        'This enquiry has already been converted into an order.'
      );
    }

    if (enquiry.status === 'closed') {
      throw new ValidationError(
        'A closed enquiry cannot be converted. Reopen it first.'
      );
    }

    const totalKobo = toKobo(enquiry.estimated_total);

    if (payment.kobo > totalKobo) {
      throw new ValidationError(
        'The initial payment cannot exceed the order total.'
      );
    }

    const paymentStatus =
      payment.kobo === totalKobo
        ? 'fully_paid'
        : 'deposit_paid';

    const orderNumber = generateOrderNumber();

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
         total_amount,
         currency,
         payment_status,
         confirmed_at,
         confirmed_by
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         'processing', 'not_ready',
         $7, $8, $9, $10, $11, $12, $13, NOW(), $14
       )
       RETURNING
         id,
         order_number,
         status,
         fulfilment_status,
         payment_status,
         total_amount,
         currency,
         created_at`,
      [
        orderNumber,
        enquiry.customer_id,
        enquiry.customer_name,
        enquiry.whatsapp_number,
        enquiry.source,
        orderChannel,
        enquiry.delivery_city,
        enquiry.delivery_address,
        enquiry.delivery_notes,
        enquiry.requested_delivery_date,
        enquiry.estimated_total,
        enquiry.currency,
        paymentStatus,
        adminId,
      ]
    );

    const order = orderResult.rows[0];

    await client.query(
      `INSERT INTO order_items (
         order_id,
         product_id,
         variation_id,
         product_name,
         variation_name,
         selected_options,
         quantity,
         unit_price,
         line_total
       )
       SELECT
         $1,
         product_id,
         variation_id,
         product_name,
         variation_name,
         selected_options,
         quantity,
         unit_price,
         line_total
       FROM enquiry_items
       WHERE enquiry_id = $2`,
      [order.id, enquiryId]
    );

    const paymentInsert = await client.query(
      `INSERT INTO order_payments (
         order_id,
         amount,
         payment_method,
         payment_reference,
         payment_date,
         notes,
         recorded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         amount,
         payment_method,
         payment_reference,
         payment_date`,
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

    await client.query(
      `INSERT INTO order_history (
         order_id,
         event_type,
         new_value,
         description,
         recorded_by
       )
       VALUES ($1, 'order_created', $2, $3, $4)`,
      [
        order.id,
        paymentStatus,
        `Order created from enquiry ${enquiry.enquiry_number} with an initial ${
          paymentStatus === 'fully_paid' ? 'full payment' : 'deposit'
        }.`,
        adminId,
      ]
    );

    await client.query(
      `UPDATE enquiries
       SET
         status = 'converted',
         converted_order_id = $2,
         updated_at = NOW()
       WHERE id = $1`,
      [enquiryId, order.id]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Enquiry converted into an official order.',
      order: {
        ...order,
        initialPayment: paymentInsert.rows[0],
      },
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Enquiry conversion rollback failed:', rollbackError);
    });

    throw error;
  }
}
