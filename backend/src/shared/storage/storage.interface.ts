export interface IStorageService {
  /**
   * Upload a file and return its public URL.
   * The returned URL is what gets stored in the DB as `imageUrl`.
   */
  upload(file: Express.Multer.File): Promise<string>;

  /**
   * Delete a file by its public URL.
   * No-op when the file does not exist.
   */
  delete(publicUrl: string): Promise<void>;
}
