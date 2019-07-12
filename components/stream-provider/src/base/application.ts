/**
 * Represents a bootable application
 */
export interface IApplication {
  /**
   * Boot the application
   */
  boot(): Promise<void>;
}
