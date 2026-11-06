// uploadService.js — Prize images in Supabase Storage (bucket "prizes")
import { supabase, check } from './supabaseClient';

const BUCKET = 'prizes';
const FOLDER = 'prize-images';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Storage keys don't like spaces or special characters
function safeFileName(name) {
    return name
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
}

const uploadService = {
    // Returns { url, path } — url is public, path is used for deleteImage
    async uploadImage(file) {
        if (!ALLOWED.includes(file.type)) {
            throw new Error('Only JPEG, PNG, WEBP and GIF images are allowed');
        }
        if (file.size > MAX_SIZE) {
            throw new Error('Gambar melebihi 5MB / Image exceeds 5MB');
        }

        const path = `${FOLDER}/${Date.now()}-${safeFileName(file.name)}`;

        check(await supabase.storage
            .from(BUCKET)
            .upload(path, file, { contentType: file.type, upsert: false }));

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return { url: data.publicUrl, path };
    },

    async deleteImage(path) {
        if (!path) return;
        check(await supabase.storage.from(BUCKET).remove([path]));
    },

    // Get the storage path back from a public URL (e.g. prize.image_url)
    pathFromUrl(url) {
        const marker = `/storage/v1/object/public/${BUCKET}/`;
        const i = url?.indexOf(marker) ?? -1;
        return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
    },
};

export default uploadService;
