import api from './api';

const uploadService = {

    /**
     * Upload an image file to Cloudinary via our backend.
     * @param {File} file - The File object from an <input type="file">
     * @returns {Promise<{url: string, public_id: string}>}
     */
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/upload/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.data; // { url, public_id, width, height }
    },

    /**
     * Delete an image from Cloudinary via our backend.
     * @param {string} publicId - The Cloudinary public_id
     */
    async deleteImage(publicId) {
        await api.delete('/upload/image', {
            data: { public_id: publicId },
        });
    },
};

export default uploadService;