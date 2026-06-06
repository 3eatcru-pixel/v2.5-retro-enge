import fs from 'fs';
import path from 'path';

const assetsDir = path.join(process.cwd(), 'public', 'assets');
const outputFile = path.join(process.cwd(), 'public', 'assets-manifest.json');

const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ogg', '.wav', '.mp3', '.json'];

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDirectory(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (validExtensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

try {
  const allFiles = scanDirectory(assetsDir);
  const manifest = allFiles.map((filePath) => {
    // Make path relative to /public
    const relativePath = filePath.replace(path.join(process.cwd(), 'public'), '').replace(/\\/g, '/');
    
    // Generate an ID (like ninja-adventure/Actor/Characters/Boy/SpriteSheet.png or something)
    const id = relativePath.replace(/^\//, '');
    
    // Determine type
    const ext = path.extname(relativePath).toLowerCase();
    let type = 'image';
    if (['.ogg', '.wav', '.mp3'].includes(ext)) type = 'audio';
    if (ext === '.json') type = 'json';

    // Tags
    const tags = id.split('/').slice(0, -1);
    
    return {
      id,
      url: relativePath,
      type,
      tags
    };
  });

  fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));
  console.log(`Successfully generated manifest with ${manifest.length} assets.`);
} catch (error) {
  console.error("Error generating manifest:", error);
}
