/**
 * Image Storage Service (Phase 13.2)
 * 
 * Manages physical storage of uploaded student problem images on disk.
 * Uses an abstract storage interface to support replaceable storage drivers.
 */

export interface StoredImage {
  data: Uint8Array;
  mimeType: string;
  storagePath: string;
}

export class ImageStorage {
  private static basePath = './data/uploads/image-problems';

  public static setBasePath(path: string): void {
    this.basePath = path;
  }

  public static async ensureDirectory(): Promise<void> {
    try {
      await Deno.mkdir(this.basePath, { recursive: true });
    } catch {
      // ignore if exists
    }
  }

  /**
   * Saves image binary to disk and returns its storage reference URL
   */
  public static async save(
    questionId: string,
    data: Uint8Array,
    mimeType = 'image/png'
  ): Promise<string> {
    await this.ensureDirectory();
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg')
      ? 'jpg'
      : mimeType.includes('webp')
      ? 'webp'
      : 'png';
    const filename = `${questionId}.${ext}`;
    const filePath = `${this.basePath}/${filename}`;

    await Deno.writeFile(filePath, data);
    return `/api/images/${questionId}`;
  }

  /**
   * Retrieves image binary from disk
   */
  public static async get(questionId: string): Promise<StoredImage | null> {
    const extensions = ['png', 'jpg', 'jpeg', 'webp'];
    for (const ext of extensions) {
      const filePath = `${this.basePath}/${questionId}.${ext}`;
      try {
        const data = await Deno.readFile(filePath);
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
        return { data, mimeType, storagePath: filePath };
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Deletes image file from disk
   */
  public static async delete(questionId: string): Promise<boolean> {
    const extensions = ['png', 'jpg', 'jpeg', 'webp'];
    for (const ext of extensions) {
      const filePath = `${this.basePath}/${questionId}.${ext}`;
      try {
        await Deno.remove(filePath);
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }
}
