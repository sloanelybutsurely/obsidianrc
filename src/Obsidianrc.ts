import { Plugin } from "obsidian";

import { ThreadedNotes } from "./ThreadedNotes";

export class Obsidianrc extends Plugin {
  public threaded: ThreadedNotes;

  onload() {
    this.threaded = new ThreadedNotes(this);

    console.log("[Obsidianrc] loaded");

    if (typeof window !== "undefined") {
      (window as any).rc = this;
    }
  }

  onunload() {}
}
