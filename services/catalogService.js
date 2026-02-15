const { createAdminClient } = require('../supabase/config/supabaseClient');

class CatalogService {
  static async getCatalog() {
    const adminClient = createAdminClient();
    const [{ data: categories, error: catErr }, { data: subcategories, error: subErr }, { data: products, error: prodErr }, { data: productImages, error: imgErr }, { data: variants, error: varErr }] =
      await Promise.all([
        adminClient.from('categories').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true }),
        adminClient.from('subcategories').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true }),
        adminClient.from('products').select('*').order('id', { ascending: true }),
        adminClient.from('product_images').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true }),
        adminClient.from('product_variants').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true })
      ]);

    if (catErr || subErr || prodErr || imgErr || varErr) {
      const err = catErr || subErr || prodErr || imgErr || varErr;
      throw new Error(`Database error: ${err.message}`);
    }

    const productsBySub = new Map();
    products.forEach(product => {
      const list = productsBySub.get(product.subcategory_id) || [];
      const gallery = productImages.filter(img => img.product_id === product.id).map(img => img.image_url);
      const productVariants = variants.filter(v => v.product_id === product.id).map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        price: v.price,
        stockQuantity: v.stock_quantity,
        sku: v.sku
      }));
      list.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        originalPrice: product.original_price,
        imageUrl: product.image_url,
        discountPercentage: product.discount_percentage,
        discountColor: product.discount_color,
        description: product.description,
        rating: product.rating,
        reviews: product.reviews,
        inStock: product.in_stock,
        stockQuantity: product.stock_quantity,
        sku: product.sku,
        taxPercent: product.tax_percent,
        shippingMethod: product.shipping_method,
        status: product.status,
        weight: product.weight,
        origin: product.origin,
        imageGallery: gallery,
        variants: productVariants
      });
      productsBySub.set(product.subcategory_id, list);
    });

    const subcategoriesByCategory = new Map();
    subcategories.forEach(sub => {
      const list = subcategoriesByCategory.get(sub.category_id) || [];
      list.push({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        image: sub.image_url,
        products: productsBySub.get(sub.id) || []
      });
      subcategoriesByCategory.set(sub.category_id, list);
    });

    const catalog = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image_url,
      subcategories: subcategoriesByCategory.get(cat.id) || []
    }));

    return catalog;
  }
}

module.exports = { CatalogService };
