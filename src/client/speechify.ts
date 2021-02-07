import { Data, StreamChunk } from "@common";
import {
  SpeechifyClient,
  ClientState,
  SpeechifyClientEvent,
  ClientEventType,
} from "@common/client";

export default class SpeechifyClientImpl implements SpeechifyClient {
  private currentUtterance : SpeechSynthesisUtterance | null = null;
  private nextUtterance : SpeechSynthesisUtterance | null = null;
  private host: string;
  private listener: ((event: SpeechifyClientEvent) => void) | null= null;
  constructor(host: string) {
    this.host = host;
  }
  async addToQueue(data: Data): Promise<boolean> {
    const response = await fetch(`${this.host}/api/addToQueue`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
    })
    return response.status < 400 ? Promise.resolve(true) : Promise.resolve(false);
  }

  async play(): Promise<void> {
    if(speechSynthesis.speaking && !speechSynthesis.paused) {
      return
    }

    if(speechSynthesis.paused) {
      speechSynthesis.resume();
      return;
    }

    if(!this.currentUtterance) {
      this.currentUtterance = await this.getNextUtterance();
      if(this.currentUtterance !== null) {
        await this.playCurrent();
      }
    }
  }

  async playCurrent(): Promise<void> {
    this.currentUtterance!.onpause = () => this.setToNotPlaying();
    this.currentUtterance!.onresume = () => this.setToPlaying();
    this.currentUtterance!.onstart = () => this.setToPlaying();
    this.currentUtterance!.onend = async () => {
      this.currentUtterance = this.nextUtterance;
      const laterUtterance = await this.getNextUtterance();
      if(this.currentUtterance === null && laterUtterance !== null) {
        // has been added somewhat later
        this.currentUtterance = laterUtterance;
      }
      if(this.currentUtterance !== null) {
        await this.playCurrent();
      } else {
        this.setToNotPlaying()
      }
    }
    speechSynthesis.speak(this.currentUtterance!);
    this.nextUtterance = await this.getNextUtterance();
  }

  async getNextUtterance(): Promise<SpeechSynthesisUtterance | null> {
    const response = await fetch(`${this.host}/api/getNextChunk`);
    const json = await response.json();
    if(!json.chunk) {
      return null;
    }
    return new SpeechSynthesisUtterance(json.chunk);
  }

  pause(): void {
    speechSynthesis.pause();
    this.setToNotPlaying()
  }

  // if it's hardcoded and no longer used for state tracking this could be removed
  getState(): ClientState {
    return ClientState.NOT_PLAYING;
  }

  subscribe(listener: (event: SpeechifyClientEvent) => void): () => void {
    this.listener = listener;
    return () => {};
  }

  private setToPlaying(): void {
    this.listener!({
      type: 0,
      state: ClientState.PLAYING
    })
  }

  private setToNotPlaying(): void {
    this.listener!({
      type: 0,
      state: ClientState.NOT_PLAYING
    })
  }
}
