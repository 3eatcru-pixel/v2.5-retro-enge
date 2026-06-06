export interface AudioAsset {
  id: string;
  buffer: AudioBuffer;
}

export type AudioBusName = 'master' | 'music' | 'sfx' | 'ui' | string;

export class AudioSystem {
  private context: AudioContext | null = null;
  private soundPool: Map<string, AudioAsset> = new Map();
  
  // Audios Buses
  private buses: Map<AudioBusName, GainNode> = new Map();
  
  // Master volume control is handled by the 'master' bus gain
  
  private currentMusicSource: AudioBufferSourceNode | null = null;

  init(): void {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.setupBuses();
    }
  }

  private setupBuses() {
    if (!this.context) return;
    
    // Create master bus
    const masterGain = this.context.createGain();
    masterGain.connect(this.context.destination);
    this.buses.set('master', masterGain);

    // Create sub-buses, defaulting to connecting to master
    this.createBus('music', 'master');
    this.createBus('sfx', 'master');
    this.createBus('ui', 'master');
  }

  public createBus(name: string, targetBus: AudioBusName = 'master'): GainNode | null {
    if (!this.context) return null;
    const gainNode = this.context.createGain();
    const target = this.buses.get(targetBus) || this.context.destination;
    gainNode.connect(target);
    this.buses.set(name, gainNode);
    return gainNode;
  }

  public setBusVolume(name: AudioBusName, volume: number): void {
    const bus = this.buses.get(name);
    if (bus) {
      bus.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public getBus(name: AudioBusName): GainNode | undefined {
    return this.buses.get(name);
  }

  registerSound(id: string, buffer: AudioBuffer): void {
    this.soundPool.set(id, { id, buffer });
  }

  playSound(id: string, busName: AudioBusName = 'sfx', volume: number = 1.0): void {
    if (!this.context) return;
    const asset = this.soundPool.get(id);
    if (!asset) return;

    const source = this.context.createBufferSource();
    source.buffer = asset.buffer;
    
    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;
    
    const targetBus = this.buses.get(busName) || this.buses.get('master')!;
    
    source.connect(gainNode);
    gainNode.connect(targetBus);
    
    source.start(0);
  }

  playSpatialSound(id: string, x: number, y: number, z: number = 0, busName: AudioBusName = 'sfx', volume: number = 1.0): void {
    if (!this.context) return;
    const asset = this.soundPool.get(id);
    if (!asset) return;

    const source = this.context.createBufferSource();
    source.buffer = asset.buffer;

    const panner = this.context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    const targetBus = this.buses.get(busName) || this.buses.get('master')!;

    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(targetBus);

    source.start(0);
  }

  playMusic(id: string, loop: boolean = true, volume: number = 1.0): void {
    if (!this.context) return;
    
    if (this.currentMusicSource) {
      this.currentMusicSource.stop(0);
    }

    const asset = this.soundPool.get(id);
    if (!asset) return;

    this.currentMusicSource = this.context.createBufferSource();
    this.currentMusicSource.buffer = asset.buffer;
    this.currentMusicSource.loop = loop;
    
    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;
    
    const targetBus = this.buses.get('music') || this.buses.get('master')!;
    
    this.currentMusicSource.connect(gainNode);
    gainNode.connect(targetBus);
    
    this.currentMusicSource.start(0);
  }

  stopMusic(): void {
    if (this.currentMusicSource) {
       this.currentMusicSource.stop(0);
       this.currentMusicSource = null;
    }
  }

  // --- Effects Chains ---
  public addEffectToBus(busName: AudioBusName, effectNode: AudioNode): void {
    const bus = this.buses.get(busName);
    if (!bus || !this.context) return;
    
    // Disconnect bus from its current output (assuming master if not master itself)
    bus.disconnect();
    
    // Re-route through effect
    bus.connect(effectNode);
    effectNode.connect(busName === 'master' ? this.context.destination : this.buses.get('master')!);
  }

  public createLowPassFilter(frequency: number = 1000): BiquadFilterNode | null {
    if (!this.context) return null;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    return filter;
  }

  suspend(): void {
    if (this.context && this.context.state === 'running') {
      this.context.suspend();
    }
  }

  resume(): void {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  /**
   * Synthesize an 8-bit or arcade sound effect in real-time.
   */
  public playTone(freq = 440, duration = 0.1, type: OscillatorType = 'sine', volume = 0.1): void {
    if (!this.context) return;
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.context.currentTime);
      
      gain.gain.setValueAtTime(volume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
      
      const target = this.buses.get('sfx') || this.context.destination;
      osc.connect(gain);
      gain.connect(target);
      
      osc.start();
      osc.stop(this.context.currentTime + duration);
    } catch (e) {
      console.warn("[Synth Error] playTone failed:", e);
    }
  }
}
