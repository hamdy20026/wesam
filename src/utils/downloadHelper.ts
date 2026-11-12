/**
 * Utility for downloading the application dist zip file safely and completely.
 * Uses native download anchor without aborting the network stream.
 */
export const downloadDistZip = async (
  onProgress?: (loading: boolean) => void,
  onStatusMessage?: (msg: string | null) => void
) => {
  if (onProgress) onProgress(true);
  if (onStatusMessage) onStatusMessage('جاري تحميل حزمة المنظومة (dist.zip)...');

  try {
    const a = document.createElement('a');
    a.href = '/api/download/dist-zip';
    a.setAttribute('download', 'wessam_electrical_erp_dist.zip');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      } catch {}
      if (onProgress) onProgress(false);
      if (onStatusMessage) onStatusMessage('تم بدء تنزيل الملف بنجاح!');
      setTimeout(() => {
        if (onStatusMessage) onStatusMessage(null);
      }, 3000);
    }, 1200);
  } catch (err: any) {
    try {
      window.location.assign('/api/download/dist-zip');
    } catch {
      window.open('/api/download/dist-zip', '_blank');
    }
    if (onProgress) onProgress(false);
  }
};
