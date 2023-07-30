import type { TAbstractFile, TFile } from "obsidian";
import type { Obsidianrc } from "./Obsidianrc";

const UNIQUE_NOTE_PATTERN = /^\d{14} - (.+)(?:\.md)$/;

export class ThreadedNotes {
  constructor(private plugin: Obsidianrc) {
    this.plugin.registerEvent(
      plugin.app.vault.on("create", this.handleCreate, this),
    );
    this.plugin.registerEvent(
      plugin.app.vault.on("rename", this.handleRename, this),
    );
  }

  private async handleCreate(file: TAbstractFile) {
    if (this.isStitch(file)) {
      const thread = await this.maybeCreateThreadForStitch(file);
      this.plugin.app.vault.append(
        file as TFile,
        `\n\n***\n${this.plugin.app.fileManager.generateMarkdownLink(
          thread as TFile,
          file.path,
        )}`,
      );
    }
  }

  private async handleRename(file: TAbstractFile, oldPath: string) {
    const [oldFile] = oldPath.split("/").reverse();

    if (this.isStitch(oldFile)) {
      const oldThread = await this.maybeCreateThreadForStitch(oldFile);
      const oldFooter = this.footer(oldThread, oldPath);
      if (this.isStitch(file)) {
        // rename old stitch
        const thread = await this.maybeCreateThreadForStitch(file);
        this.plugin.app.vault.process(file as TFile, (data: string) => {
          const newFooter = this.footer(thread, file.path);
          if (data.includes(oldFooter)) {
            return data.replace(oldFooter, newFooter);
          } else {
            return data.concat("\n\n", newFooter);
          }
        });
      }
    } else {
      if (this.isStitch(file)) {
        // create new stitch
        const thread = await this.maybeCreateThreadForStitch(file);
        this.plugin.app.vault.append(
          file as TFile,
          `\n\n${this.footer(thread as TFile, file.path)}`,
        );
      }
    }
  }

  private async maybeCreateThreadForStitch(
    file: TAbstractFile | TFile | string,
  ) {
    const path = `${this.thread(file)}.md`;
    return (
      this.plugin.app.vault.getAbstractFileByPath(path) ||
      this.plugin.app.vault.create(path, "")
    );
  }

  private isStitch(file: TAbstractFile | string) {
    const name = typeof file === "string" ? file : file.name;
    return UNIQUE_NOTE_PATTERN.test(name);
  }

  private thread(file: TAbstractFile | string) {
    const name = typeof file === "string" ? file : file.name;
    const matches = name.match(UNIQUE_NOTE_PATTERN);
    return matches?.[1];
  }

  private footer(file: TAbstractFile | TFile, source: string) {
    return `***\n${this.plugin.app.fileManager.generateMarkdownLink(
      file as TFile,
      source,
    )}`;
  }
}
