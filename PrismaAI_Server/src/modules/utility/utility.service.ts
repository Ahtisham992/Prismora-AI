// utility.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class UtilityService {
  async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    try {
      if (!file?.path) {
        throw new Error('File path missing');
      }

      const formData = new FormData();

      // ✅ use file path (NOT buffer)
      formData.append('file', fs.createReadStream(file.path));

      formData.append('upload_preset', 'prismora');

      const response = await axios.post(
        'https://api.cloudinary.com/v1_1/dmb2x7tam/video/upload',
        formData,
        {
          headers: formData.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      console.log('☁️ Cloudinary response:', response.data);

      // optional cleanup (important)
      fs.unlink(file.path, () => {});

      return response.data.secure_url;
    } catch (error) {
      console.error(
        '❌ Cloudinary upload failed:',
        error?.response?.data || error.message,
      );

      throw new InternalServerErrorException('Upload failed');
    }
  }
}