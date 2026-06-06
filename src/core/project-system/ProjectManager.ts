export interface ProjectMetadata {
  id: string;
  name: string;
  version: string;
  created: number;
  lastModified: number;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  // Will be expanded with explicit Asset, Scene, Tilemap references
  assets: string[];
  scenes: string[];
  settings: Record<string, any>;
}

export class ProjectManager {
  private currentProject: ProjectData | null = null;

  createProject(name: string): ProjectData {
    this.currentProject = {
      metadata: {
        id: crypto.randomUUID(),
        name,
        version: '1.0.0',
        created: Date.now(),
        lastModified: Date.now()
      },
      assets: [],
      scenes: [],
      settings: {}
    };
    return this.currentProject;
  }

  loadProject(data: ProjectData) {
    this.currentProject = data;
  }

  getCurrentProject(): ProjectData | null {
    return this.currentProject;
  }

  saveProject(): ProjectData | null {
    if (this.currentProject) {
      this.currentProject.metadata.lastModified = Date.now();
      return this.currentProject;
    }
    return null;
  }
}
