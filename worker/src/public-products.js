
function productSelectSql() {
  return `
    SELECT
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
      p.sort_order,

      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', v.id,
              'name', v.name,
              'size_details', v.size_details,
              'price', v.price,
              'image_key', v.image_key,
              'sort_order', v.sort_order
            )
            ORDER BY v.sort_order ASC, v.created_at ASC
          )
          FROM product_variations v
          WHERE v.product_id = p.id
            AND v.is_active = TRUE
        ),
        '[]'::json
      ) AS variations,

      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', po.id,
              'name', po.name,
              'sort_order', po.sort_order,
              'values', (
                SELECT COALESCE(
                  json_agg(
                    json_build_object(
                      'id', pov.id,
                      'name', pov.name,
                      'image_key', pov.image_key,
                      'sort_order', pov.sort_order
                    )
                    ORDER BY pov.sort_order ASC, pov.created_at ASC
                  ),
                  '[]'::json
                )
                FROM product_option_values pov
                WHERE pov.option_id = po.id
                  AND pov.is_active = TRUE
              )
            )
            ORDER BY po.sort_order ASC, po.created_at ASC
          )
          FROM product_options po
          WHERE po.product_id = p.id
            AND po.is_active = TRUE
        ),
        '[]'::json
      ) AS options

    FROM products p
    JOIN categories c ON c.id = p.category_id
  `;
}

export async function listPublicCategories(client) {
  const result = await client.query(
    `
      SELECT
        id,
        name,
        slug,
        description,
        sort_order
      FROM categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, name ASC
    `
  );

  return {
    success: true,
    categories: result.rows,
  };
}

export async function listPublicProducts(client, url) {
  const categorySlug = url.searchParams.get('category');
  const search = url.searchParams.get('search');

  if (categorySlug && categorySlug.length > 180) {
    return {
      success: false,
      message: 'Invalid category filter.',
    };
  }

  if (search && search.length > 200) {
    return {
      success: false,
      message: 'Product search is too long.',
    };
  }

  const conditions = [
    'p.is_active = TRUE',
    "p.publication_status = 'published'",
    'c.is_active = TRUE',
  ];

  const values = [];

  if (categorySlug) {
    values.push(categorySlug);
    conditions.push(`c.slug = $${values.length}`);
  }

  if (search && search.trim()) {
    values.push(`%${search.trim()}%`);
    conditions.push(
      `(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`
    );
  }

  const result = await client.query(
    `
      ${productSelectSql()}
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.sort_order ASC, p.created_at DESC
    `,
    values
  );

  return {
    success: true,
    products: result.rows,
    total: result.rows.length,
  };
}

export async function getPublicProduct(client, slug) {
  if (
    typeof slug !== 'string' ||
    !slug.trim() ||
    slug.length > 180
  ) {
    return null;
  }

  const result = await client.query(
    `
      ${productSelectSql()}
      WHERE p.slug = $1
        AND p.is_active = TRUE
        AND p.publication_status = 'published'
        AND c.is_active = TRUE
      LIMIT 1
    `,
    [slug.trim()]
  );

  return result.rows[0] || null;
}
