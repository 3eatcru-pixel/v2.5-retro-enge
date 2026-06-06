export type FieldType = 'number' | 'string' | 'boolean' | 'color' | 'select' | 'array' | 'slider' | 'asset';

export interface FieldSchema {
  name: string;
  type: FieldType;
  label: string;
  default?: any;
  options?: string[]; // for select
  min?: number; // for slider
  max?: number; // for slider
  step?: number; // for slider
  assetType?: 'image' | 'audio' | 'any'; // for asset field
}

export interface ComponentSchema {
  name: string;
  fields: FieldSchema[];
  createDefault: () => any;
}

export class ComponentRegistry {
  private static schemas = new Map<string, ComponentSchema>();

  public static register(schema: ComponentSchema) {
    this.schemas.set(schema.name, schema);
  }

  public static getSchema(name: string): ComponentSchema | undefined {
    return this.schemas.get(name);
  }

  public static getAllSchemas(): ComponentSchema[] {
    return Array.from(this.schemas.values());
  }

  public static create(name: string): any {
    const schema = this.schemas.get(name);
    return schema ? schema.createDefault() : {};
  }
}
