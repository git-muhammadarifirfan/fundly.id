// ============================================
// Fundly.id - Kompresi gambar di browser sebelum diunggah
// ============================================

/**
 * Perkecil gambar ke sisi terpanjang `maxSize` px dan ubah ke WebP.
 * Foto profil 3-5 MB dari kamera HP biasanya menjadi ±30-80 KB tanpa
 * perbedaan yang terlihat di ukuran avatar. Mengembalikan file asli jika
 * browser tidak mendukung atau hasilnya tidak lebih kecil.
 */
export async function compressImage(file: File, maxSize = 512, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') || 'avatar';
    return new File([blob], `${name}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  }
}
