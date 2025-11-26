
/*
 * 🖼️ SERVICE: IMAGE TOOLS
 * 
 * This file handles images that you upload (like reference photos).
 * Images can be very big (megabytes), which makes the app slow and crashes the "Export" feature.
 * 
 * This tool shrinks (compresses) the images so they look good but take up less space.
 */

export const compressImage = (file: File, maxWidth: number = 1920): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // If image is too wide, shrink it
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG at 0.8 quality to save storage space in JSON
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
