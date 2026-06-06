export class DependencyGraph {
  private graph = new Map<string, string[]>(); // node -> dependencies
  private reverseGraph = new Map<string, string[]>(); // node -> dependents

  addNode(guid: string) {
    if (!this.graph.has(guid)) {
      this.graph.set(guid, []);
      this.reverseGraph.set(guid, []);
    }
  }

  addDependency(guid: string, dependencyGuid: string) {
    this.addNode(guid);
    this.addNode(dependencyGuid);

    const deps = this.graph.get(guid)!;
    if (!deps.includes(dependencyGuid)) {
      deps.push(dependencyGuid);
    }

    const dependents = this.reverseGraph.get(dependencyGuid)!;
    if (!dependents.includes(guid)) {
      dependents.push(guid);
    }
  }

  getDependencies(guid: string): string[] {
    return this.graph.get(guid) || [];
  }

  getDependents(guid: string): string[] {
    return this.reverseGraph.get(guid) || [];
  }

  removeNode(guid: string) {
    // Remove from all dependents
    const deps = this.graph.get(guid) || [];
    for (const dep of deps) {
      const reverse = this.reverseGraph.get(dep);
      if (reverse) {
        const index = reverse.indexOf(guid);
        if (index > -1) reverse.splice(index, 1);
      }
    }

    // Remove from all dependencies
    const dependents = this.reverseGraph.get(guid) || [];
    for (const dep of dependents) {
      const g = this.graph.get(dep);
      if (g) {
        const index = g.indexOf(guid);
        if (index > -1) g.splice(index, 1);
      }
    }

    this.graph.delete(guid);
    this.reverseGraph.delete(guid);
  }
}
