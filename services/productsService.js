const { createAdminClient } = require('../supabase/config/supabaseClient');

class ProductsService {
  static async getAllProducts() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async getProductById(id) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Product not found');
    }

    let subcategory = null;
    let category = null;

    if (data.subcategory_id) {
      const { data: sub, error: subErr } = await adminClient
        .from('subcategories')
        .select('*')
        .eq('id', data.subcategory_id)
        .single();
      if (subErr) {
        throw new Error(`Database error: ${subErr.message}`);
      }
      subcategory = sub || null;

      if (subcategory?.category_id) {
        const { data: cat, error: catErr } = await adminClient
          .from('categories')
          .select('*')
          .eq('id', subcategory.category_id)
          .single();
        if (catErr) {
          throw new Error(`Database error: ${catErr.message}`);
        }
        category = cat || null;
      }
    }

    return {
      ...data,
      category_id: category?.id ?? null,
      category_slug: category?.slug || null,
      category_name: category?.name || null,
      subcategory_slug: subcategory?.slug || null,
      subcategory_name: subcategory?.name || null
    };
  }

  static async getProductBySlug(slug) {
    const adminClient = createAdminClient();
    const { data: product, error } = await adminClient
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!product) {
      throw new Error('Product not found');
    }

    let subcategory = null;
    let category = null;

    if (product.subcategory_id) {
      const { data: sub, error: subErr } = await adminClient
        .from('subcategories')
        .select('*')
        .eq('id', product.subcategory_id)
        .single();
      if (subErr) {
        throw new Error(`Database error: ${subErr.message}`);
      }
      subcategory = sub || null;

      if (subcategory?.category_id) {
        const { data: cat, error: catErr } = await adminClient
          .from('categories')
          .select('*')
          .eq('id', subcategory.category_id)
          .single();
        if (catErr) {
          throw new Error(`Database error: ${catErr.message}`);
        }
        category = cat || null;
      }
    }

    return {
      ...product,
      category_slug: category?.slug || null,
      category_name: category?.name || null,
      subcategory_slug: subcategory?.slug || null,
      subcategory_name: subcategory?.name || null
    };
  }

  static async createProduct(productData) {
    if (!productData.subcategoryId || !productData.name || !productData.slug || productData.price === undefined) {
      throw new Error('Subcategory, name, slug, and price are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('products')
      .insert({
        subcategory_id: productData.subcategoryId,
        name: productData.name,
        slug: productData.slug,
        description: productData.description || null,
        price: productData.price,
        original_price: productData.originalPrice || null,
        image_url: productData.imageUrl || null,
        discount_percentage: productData.discountPercentage || null,
        discount_color: productData.discountColor || null,
        rating: productData.rating || null,
        reviews: productData.reviews || null,
        in_stock: productData.inStock !== undefined ? productData.inStock : true,
        stock_quantity: productData.stockQuantity || 0,
        sku: productData.sku || null,
        tax_percent: productData.taxPercent || null,
        shipping_method: productData.shippingMethod || null,
        status: productData.status || 'active',
        weight: productData.weight || null,
        origin: productData.origin || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateProduct(id, productData) {
    if (!productData.subcategoryId || !productData.name || !productData.slug || productData.price === undefined) {
      throw new Error('Subcategory, name, slug, and price are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('products')
      .update({
        subcategory_id: productData.subcategoryId,
        name: productData.name,
        slug: productData.slug,
        description: productData.description || null,
        price: productData.price,
        original_price: productData.originalPrice || null,
        image_url: productData.imageUrl || null,
        discount_percentage: productData.discountPercentage || null,
        discount_color: productData.discountColor || null,
        rating: productData.rating || null,
        reviews: productData.reviews || null,
        in_stock: productData.inStock !== undefined ? productData.inStock : true,
        stock_quantity: productData.stockQuantity || 0,
        sku: productData.sku || null,
        tax_percent: productData.taxPercent || null,
        shipping_method: productData.shippingMethod || null,
        status: productData.status || 'active',
        weight: productData.weight || null,
        origin: productData.origin || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Product not found');
    }

    return data;
  }

  static async updateInventory(id, { stockQuantity, inStock, lowStockLevel }) {
    if (stockQuantity === undefined || stockQuantity === null || Number.isNaN(Number(stockQuantity))) {
      throw new Error('Stock quantity is required');
    }

    const adminClient = createAdminClient();
    const normalizedStock = Number(stockQuantity);
    const payload = {
      stock_quantity: normalizedStock,
      in_stock: inStock !== undefined ? Boolean(inStock) : normalizedStock > 0,
      updated_at: new Date().toISOString()
    };
    if (lowStockLevel !== undefined && lowStockLevel !== null && !Number.isNaN(Number(lowStockLevel))) {
      payload.low_stock_level = Number(lowStockLevel);
    }

    const { data, error } = await adminClient
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Product not found');
    }

    return data;
  }

  static async deleteProduct(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async uploadMainImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `products/main/${timestamp}-${fileName}`;

    const { data, error } = await adminClient.storage
      .from('ecommerce')
      .upload(uniqueFileName, fileBuffer, {
        contentType: contentType,
        upsert: false
      });

    if (error) {
      throw new Error(`Storage upload error: ${error.message}`);
    }

    const { data: { publicUrl } } = adminClient.storage
      .from('ecommerce')
      .getPublicUrl(uniqueFileName);

    return {
      path: data.path,
      publicUrl: publicUrl,
      fileName: uniqueFileName
    };
  }
}

module.exports = { ProductsService };
