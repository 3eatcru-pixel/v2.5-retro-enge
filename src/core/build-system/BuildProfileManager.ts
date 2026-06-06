export interface BuildProfile {
  id: string;
  name: string;
  target: 'web' | 'desktop' | 'mobile';
  outputDirectory: string;
  minifyAssets: boolean;
  stripLogs: boolean;
  compressTextures: boolean;
  enableSourceMaps: boolean;
  bundleFormat: 'zip' | 'pak' | 'raw';
}

export class BuildProfileManager {
  private profiles = new Map<string, BuildProfile>();
  private activeProfileId: string | null = null;

  constructor() {
    this.createDefaultProfiles();
  }

  private createDefaultProfiles() {
    this.addProfile({
      id: 'default-web',
      name: 'Web (Release)',
      target: 'web',
      outputDirectory: 'dist/web',
      minifyAssets: true,
      stripLogs: true,
      compressTextures: true,
      enableSourceMaps: false,
      bundleFormat: 'raw',
    });

    this.addProfile({
      id: 'default-desktop',
      name: 'Desktop (NW.js / Electron)',
      target: 'desktop',
      outputDirectory: 'dist/desktop',
      minifyAssets: true,
      stripLogs: false,
      compressTextures: true,
      enableSourceMaps: false,
      bundleFormat: 'pak',
    });
  }

  public addProfile(profile: BuildProfile) {
    this.profiles.set(profile.id, profile);
    if (!this.activeProfileId) {
      this.activeProfileId = profile.id;
    }
  }

  public removeProfile(profileId: string) {
    this.profiles.delete(profileId);
    if (this.activeProfileId === profileId) {
      this.activeProfileId = this.profiles.keys().next().value || null;
    }
  }

  public getProfile(profileId: string): BuildProfile | undefined {
    return this.profiles.get(profileId);
  }

  public getAllProfiles(): BuildProfile[] {
    return Array.from(this.profiles.values());
  }

  public setActiveProfile(profileId: string) {
    if (this.profiles.has(profileId)) {
      this.activeProfileId = profileId;
    }
  }

  public getActiveProfile(): BuildProfile | undefined {
    if (!this.activeProfileId) return undefined;
    return this.profiles.get(this.activeProfileId);
  }
}
