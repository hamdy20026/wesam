/**
 * Utility for downloading the application dist zip file safely and completely.
 * Uses XHR JSON base64 transfer + local memory Blob so iframe proxies never truncate or replace the download.
 */
export const downloadDistZip = async (
  onProgress?: (loading: boolean) => void,
  onStatusMessage?: (msg: string | null) => void
) => {
  if (onProgress) onProgress(true);
  if (onStatusMessage) onStatusMessage('جاري تجهيز وتحميل حزمة المنظومة الكاملة (dist.zip)...');

  try {
    // 1. Fetch via JSON endpoint so AI Studio iframe proxy never intercepts with a 10KB HTML page
    const res = await fetch(`/api/download/dist-zip-json?t=${Date.now()}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.base64) {
        const binaryStr = window.atob(data.base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        // Verify valid PK zip header
        if (bytes.length > 1000 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
          const blob = new Blob([bytes], { type: 'application/zip' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.setAttribute('download', data.filename || 'wessam_electrical_erp_dist.zip');
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            try {
              if (document.body.contains(a)) document.body.removeChild(a);
              URL.revokeObjectURL(blobUrl);
            } catch {}
          }, 5000);

          if (onProgress) onProgress(false);
          if (onStatusMessage) onStatusMessage('تم تنزيل حزمة المنظومة الكاملة بنجاح!');
          setTimeout(() => {
            if (onStatusMessage) onStatusMessage(null);
          }, 3500);
          return;
        }
      }
    }

    // 2. Fallback for static XAMPP hosting: fetch('./dist.zip') as arrayBuffer
    const staticRes = await fetch(`./dist.zip?t=${Date.now()}`, { cache: 'no-store' });
    if (staticRes.ok) {
      const buf = await staticRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      if (bytes.length > 1000 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
        const blob = new Blob([bytes], { type: 'application/zip' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.setAttribute('download', 'wessam_electrical_erp_dist.zip');
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            if (document.body.contains(a)) document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          } catch {}
        }, 5000);
        if (onProgress) onProgress(false);
        if (onStatusMessage) onStatusMessage('تم تنزيل حزمة المنظومة الكاملة بنجاح!');
        setTimeout(() => {
          if (onStatusMessage) onStatusMessage(null);
        }, 3500);
        return;
      }
    }

    throw new Error('Fallback to direct link');
  } catch (err: any) {
    const a = document.createElement('a');
    a.href = './dist.zip';
    a.setAttribute('download', 'wessam_electrical_erp_dist.zip');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        if (document.body.contains(a)) document.body.removeChild(a);
      } catch {}
    }, 2000);
    if (onProgress) onProgress(false);
  }
};
