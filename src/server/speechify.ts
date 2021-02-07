import { DataType, Data, StreamChunk } from "@common";
import { SpeechifyServer } from "@common/server";

export default class MySpeechify implements SpeechifyServer {
  private queue: Array<Data> = [];
  constructor() {}

  addToQueue(data: Data): boolean {
    this.queue.push(data);
    return true;
  }

  getNextChunk(): StreamChunk | undefined {
    const elem = this.queue.shift();
    if(!elem) {
      return undefined;
    }

    switch (elem.type) {
      case 'HTML':
        // it may not be the best solution but a good one would involve DOM tree-traversal to get order of content, translate titles (e.g h1) and so on...seems out of scope
        return elem.data;
      case 'JSON':
        const { from, message, channel, timeSent } = JSON.parse(elem.data);
        return `Message from ${from.replace('@', '')} sent to channel ${channel.replace('#', '')} on ${new Date(timeSent)}. Message contents: ${message}`;
      default:
        return elem.data;
    }
  }
}
