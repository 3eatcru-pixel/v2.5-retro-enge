import { Player } from './Player';
import { RetroStorage } from '../../core/storage/RetroStorage';

async function bootstrap() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error("Could not find game canvas");

  const player = new Player(canvas);
  (window as any).RetroPlayer = player;

  // Try fetching from high-capacity storage service for hot-test
  const hotProjectUrl = await RetroStorage.getItem('retro_hot_project');
  if (hotProjectUrl) {
    try {
      const data = JSON.parse(hotProjectUrl);
      await player.loadProject(data);
      player.start();
      console.log('Started Hot Project');
      return;
    } catch(e) {
      console.error("Hot project load failed", e);
    }
  }

  // Otherwise try loading standard bundle (used when exported to zip normally)
  try {
    const res = await fetch('/project.json');
    if (res.ok) {
       const projectData = await res.json();
       await player.loadProject(projectData);
       player.start();
       console.log('Started local project.json');
    }
  } catch(e) {
    console.error("Failed to fetch project.json bundle", e);
  }
}

bootstrap();
