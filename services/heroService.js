// Import Supabase client
const { supabase, createAdminClient } = require('../supabase/config/supabaseClient');

class HeroService {
  static _cache = { data: null, expiresAt: 0 };
  static _cacheTtlMs = 30000;

  // Get all hero slides
  static async getAllSlides() {
    if (HeroService._cache.data && Date.now() < HeroService._cache.expiresAt) {
      return HeroService._cache.data;
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('hero_slides')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const rows = data || [];
    HeroService._cache = { data: rows, expiresAt: Date.now() + HeroService._cacheTtlMs };
    return rows;
  }

  // Get hero slide by ID
  static async getSlideById(id) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('hero_slides')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  // Create new hero slide
  static async createSlide(slideData) {
    // Basic validation
    if (!slideData.imageUrl) {
      throw new Error('Image URL is required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('hero_slides')
      .insert({
        image_url: slideData.imageUrl,
        mobile_image_url: slideData.mobileImageUrl || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    HeroService._cache = { data: null, expiresAt: 0 };
    return data;
  }

  // Update hero slide
  static async updateSlide(id, updateData) {
    // Basic validation
    if (!updateData.imageUrl) {
      throw new Error('Image URL is required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('hero_slides')
      .update({
        image_url: updateData.imageUrl,
        mobile_image_url: updateData.mobileImageUrl || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Hero slide not found');
    }

    HeroService._cache = { data: null, expiresAt: 0 };
    return data;
  }

  // Delete hero slide
  static async deleteSlide(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('hero_slides')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    HeroService._cache = { data: null, expiresAt: 0 };
  }

  // Upload image to ecommerce storage bucket in hero-folder
  static async uploadImage(fileBuffer, fileName, contentType, folder = 'hero-folder') {
    const adminClient = createAdminClient();
    
    const safeFolder = String(folder || 'hero-folder').trim() || 'hero-folder';
    // Organize images in folder structure
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${safeFolder}/${timestamp}-${fileName}`;
    
    const { data, error } = await adminClient.storage
      .from('ecommerce')
      .upload(uniqueFileName, fileBuffer, {
        contentType: contentType,
        upsert: false
      });

    if (error) {
      throw new Error(`Storage upload error: ${error.message}`);
    }

    // Get public URL for the uploaded image
    const { data: { publicUrl } } = adminClient.storage
      .from('ecommerce')
      .getPublicUrl(uniqueFileName);

    return {
      path: data.path,
      publicUrl: publicUrl,
      fileName: uniqueFileName
    };
  }

  // Delete image from storage
  static async deleteImage(filePath) {
    const adminClient = createAdminClient();
    
    const { error } = await adminClient.storage
      .from('ecommerce')
      .remove([filePath]);

    if (error) {
      throw new Error(`Storage delete error: ${error.message}`);
    }
  }

  // List all images in ecommerce bucket
  static async listImages(prefix = '') {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.storage
      .from('ecommerce')
      .list(prefix, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw new Error(`Storage list error: ${error.message}`);
    }

    // Get public URLs for all images
    const imagesWithUrls = (data || []).map(file => {
      const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
      const { data: { publicUrl } } = adminClient.storage
        .from('ecommerce')
        .getPublicUrl(fullPath);
      
      return {
        name: fullPath,
        publicUrl: publicUrl,
        createdAt: file.created_at
      };
    });

    return imagesWithUrls;
  }

  static async deleteImages(paths) {
    if (!Array.isArray(paths) || paths.length === 0) return;
    const adminClient = createAdminClient();
    const { error } = await adminClient.storage
      .from('ecommerce')
      .remove(paths);
    if (error) {
      throw new Error(`Storage delete error: ${error.message}`);
    }
  }
}

module.exports = { HeroService };
