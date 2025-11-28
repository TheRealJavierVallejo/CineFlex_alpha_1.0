import { Project } from '../types';
import PdfWorker from '../workers/pdf.worker.ts?worker';

export const generateStoryboardPDF = (project: Project): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Initialize Worker
    const worker = new PdfWorker();

    // Send Data
    worker.postMessage({ project });

    // Listen for response
    worker.onmessage = (e) => {
      const { type, payload, error } = e.data;
      
      if (type === 'SUCCESS') {
        // Payload is a Blob
        const url = URL.createObjectURL(payload);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/\s+/g, '_')}_Storyboard.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        worker.terminate();
        resolve();
      } else {
        worker.terminate();
        reject(new Error(error));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
  });
};