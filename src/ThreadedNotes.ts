/*
 * Processes notes created with the Unique Note core plugin using a special
 * note title/name syntax.
 *
 * ## Links
 *
 * The first section of the file name after the unique note prefix is a comma
 * separated list of "root" notes to link in the footer of the new note.
 *
 * ## Alias (optional)
 *
 * Anything after a "$" in the file name will be automatically inserted as an
 * alias for the file.
 */
import { TAbstractFile, TFile } from "obsidian";
import type { Obsidianrc } from "./Obsidianrc";

const UNIQUE_NOTE_PATTERN = /^\d{14} - (.+)$/; // "YYYYMMDDHHmmss -"
const THREAD_SEPERATOR = ",";
const ALIAS_SEPERATOR = "$";
const FOOTER_PATTERN = /\*\*\*\n(\[\[.+\]\] ?)+$/m;

interface UniqueNoteData {
  threads: string[];
  alias: string | null;
}

export class ThreadedNotes {
  constructor(private plugin: Obsidianrc) {
    this.plugin.registerEvent(
      plugin.app.vault.on("create", this.autocommand, this),
    );
    this.plugin.registerEvent(
      plugin.app.vault.on("rename", this.autocommand, this),
    );
  }

  private async autocommand(absFile: TAbstractFile, oldPath?: string) {
    const file = this.toTFile(absFile);
    const oldFile = oldPath ? this.toTFile(oldPath) : null;
    const oldData = oldFile ? this.uniqueNoteData(oldFile) : null;
    if (file && this.isUniqueNote(file)) {
      const data = this.uniqueNoteData(file);
      if (data) {
        this.replaceOrAppendFooter(file, data);
        this.updateAliases(file, data, oldData);
      }
    }
  }

  private toTFile(input: TFile | TAbstractFile | string | null): TFile | null {
    if (!input) return null;
    if (input instanceof TFile) return input;
    if (input instanceof TAbstractFile) return this.unabstractFile(input);
    if (typeof input === "string") return this.pathToTFile(input);
    return null;
  }

  private pathToTFile(path: string): TFile | null {
    const abstractFile = this.plugin.app.vault.getAbstractFileByPath(path);
    if (abstractFile) return this.unabstractFile(abstractFile);

    const file: TFile = new (TFile as any)(this.plugin.app.vault, path);

    return file;
  }

  private unabstractFile(file: TAbstractFile): TFile | null {
    return new (TFile as any)(this.plugin.app.vault, file.path);
  }

  private isUniqueNote(file: TFile | null) {
    if (!file) return false;
    return UNIQUE_NOTE_PATTERN.test(file.basename);
  }

  private uniqueNoteData({ basename: name }: TFile): UniqueNoteData | null {
    const input = name.match(UNIQUE_NOTE_PATTERN)?.[1];
    if (!input) return null;

    const [threadsString, alias] = input.split(ALIAS_SEPERATOR);
    return {
      threads: threadsString.split(THREAD_SEPERATOR).map((t) => t.trim()),
      alias: alias ? alias.trim() : null,
    };
  }

  private replaceOrAppendFooter(file: TFile, data: UniqueNoteData) {
    this.plugin.app.vault.process(file, (contents) => {
      const footer = this.footer(data);
      if (FOOTER_PATTERN.test(contents)) {
        return contents.replace(FOOTER_PATTERN, footer);
      } else {
        return contents.concat("\n\n", footer);
      }
    });
  }

  private footer({ threads }: UniqueNoteData) {
    return `***\n${threads.map((t) => `[[${t}]]`).join(" ")}`;
  }

  private async updateAliases(
    file: TFile,
    { alias }: UniqueNoteData,
    old: UniqueNoteData | null,
  ) {
    if (!alias) return;
    return this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
      if (!fm) return;
      const aliases = new Set(fm.aliases || []);
      if (old && old.alias) aliases.delete(old.alias);
      aliases.add(alias);
      fm.aliases = [...aliases.values()];
    });
  }
}
