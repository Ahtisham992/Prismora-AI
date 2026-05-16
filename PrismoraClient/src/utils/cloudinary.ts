import { Platform } from 'react-native';

const CLOUDINARY_UPLOAD_PRESET = 'unsigned_uploads';
const CLOUDINARY_CLOUD_NAME = 'de9h8z5nl';

export const uploadVideoToCloudinary = async (fileUri: string) => {
  try {
    if (!fileUri) throw new Error('No file URI provided');

    // Fix URI for iOS
    const uri =
      Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri;

    const formData = new FormData();

    formData.append('file', {
      uri: uri,
      type: 'video/mp4',
      name: `video_${Date.now()}.mp4`,
    } as any);

    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.log('Cloudinary error:', data);
      throw new Error(data?.error?.message || 'Upload failed');
    }

    return {
      url: data.secure_url, // ✅ final usable link
      public_id: data.public_id,
      duration: data.duration,
      format: data.format,
      thumbnail: data.thumbnail_url,
    };
  } catch (error) {
    console.log('Upload error:', error);
    throw error;
  }
};