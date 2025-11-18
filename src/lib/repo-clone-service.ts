/**
 * Shared repository cloning service to avoid multiple clones
 * Clones once and shares the directory across multiple scanners
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

interface CloneResult {
  tempDir: string;
  cleanup: () => Promise<void>;
}

class RepoCloneService {
  private activeClones: Map<string, Promise<CloneResult>> = new Map();
  private cloneRefCounts: Map<string, number> = new Map();

  /**
   * Clone a repository or return existing clone
   */
  async cloneRepository(repository: string): Promise<CloneResult> {
    // Check if we already have an active clone for this repository
    const existing = this.activeClones.get(repository);
    if (existing) {
      console.log(`♻️  Reusing existing clone for ${repository}`);
      const result = await existing;
      // Increment reference count
      this.cloneRefCounts.set(repository, (this.cloneRefCounts.get(repository) || 0) + 1);
      return result;
    }

    // Create new clone
    console.log(`📥 Cloning ${repository}...`);
    const clonePromise = this.performClone(repository);
    this.activeClones.set(repository, clonePromise);
    this.cloneRefCounts.set(repository, 1);

    return clonePromise;
  }

  private async performClone(repository: string): Promise<CloneResult> {
    const tempDir = path.join(os.tmpdir(), `repo-scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Clone with increased timeout and buffer
      await execAsync(`git clone --depth 1 https://github.com/${repository}.git ${tempDir}`, {
        timeout: 180000, // 3 minutes
        maxBuffer: 100 * 1024 * 1024, // 100MB
        killSignal: 'SIGKILL' // Use SIGKILL instead of SIGTERM to avoid hanging
      });

      console.log(`✅ Repository cloned successfully to ${tempDir}`);

      // Create cleanup function
      const cleanup = async () => {
        const refCount = this.cloneRefCounts.get(repository) || 0;
        const newRefCount = refCount - 1;
        
        if (newRefCount <= 0) {
          // Last reference, actually cleanup
          console.log(`🧹 Cleaning up repository clone: ${tempDir}`);
          this.activeClones.delete(repository);
          this.cloneRefCounts.delete(repository);
          await this.cleanupTempDir(tempDir);
        } else {
          // Still have references, just decrement
          console.log(`📌 ${newRefCount} scanner(s) still using ${repository}`);
          this.cloneRefCounts.set(repository, newRefCount);
        }
      };

      return { tempDir, cleanup };
    } catch (error: any) {
      // Cleanup on error
      this.activeClones.delete(repository);
      this.cloneRefCounts.delete(repository);
      
      if (fs.existsSync(tempDir)) {
        await this.cleanupTempDir(tempDir);
      }
      
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  private async cleanupTempDir(dir: string, maxRetries = 5, delay = 1000): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (fs.existsSync(dir)) {
          // Wait a bit to ensure all file handles are closed
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Force remove with retries
          fs.rmSync(dir, { 
            recursive: true, 
            force: true, 
            maxRetries: 5, 
            retryDelay: 500 
          });
          
          console.log(`✅ Cleaned up temp directory: ${dir}`);
          return;
        }
      } catch (err: any) {
        if (attempt < maxRetries - 1 && (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'ENOTEMPTY')) {
          console.log(`⏳ Cleanup attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // Exponential backoff
        } else {
          console.warn(`⚠️  Failed to cleanup temp directory after ${maxRetries} attempts:`, err.message);
          return; // Don't throw, let OS clean it up eventually
        }
      }
    }
  }

  /**
   * Force cleanup all clones (for shutdown/error scenarios)
   */
  async cleanupAll(): Promise<void> {
    console.log('🧹 Cleaning up all repository clones...');
    const cleanupPromises: Promise<void>[] = [];
    
    for (const [repo, clonePromise] of this.activeClones.entries()) {
      try {
        const { tempDir } = await clonePromise;
        cleanupPromises.push(this.cleanupTempDir(tempDir));
      } catch (error) {
        console.warn(`Failed to cleanup ${repo}:`, error);
      }
    }
    
    await Promise.allSettled(cleanupPromises);
    this.activeClones.clear();
    this.cloneRefCounts.clear();
  }
}

// Singleton instance
export const repoCloneService = new RepoCloneService();
