import { describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveDbPath, resolveAccountDbPath } from "../src/state/db-path.js";

describe("resolveDbPath", () => {
  function withDbPathEnv(
    values: { polysync?: string; polymirror?: string },
    fn: () => void
  ) {
    const prevPolysync = process.env.POLYSYNC_DB_PATH;
    const prevPolymirror = process.env.POLYMIRROR_DB_PATH;
    if (values.polysync === undefined) delete process.env.POLYSYNC_DB_PATH;
    else process.env.POLYSYNC_DB_PATH = values.polysync;
    if (values.polymirror === undefined) delete process.env.POLYMIRROR_DB_PATH;
    else process.env.POLYMIRROR_DB_PATH = values.polymirror;
    try {
      fn();
    } finally {
      if (prevPolysync !== undefined) process.env.POLYSYNC_DB_PATH = prevPolysync;
      else delete process.env.POLYSYNC_DB_PATH;
      if (prevPolymirror !== undefined) process.env.POLYMIRROR_DB_PATH = prevPolymirror;
      else delete process.env.POLYMIRROR_DB_PATH;
    }
  }

  it("uses preview db in preview mode", () => {
    expect(resolveDbPath(true)).toBe("data/preview.db");
  });

  it("uses live db when not preview", () => {
    expect(resolveDbPath(false)).toBe("data/polysync.db");
  });

  it("uses POLYSYNC_DB_PATH override", () => {
    withDbPathEnv({ polysync: "data/custom-polysync.db" }, () => {
      expect(resolveDbPath(false)).toBe("data/custom-polysync.db");
    });
  });

  it("keeps POLYMIRROR_DB_PATH as a compatibility fallback", () => {
    withDbPathEnv({ polymirror: "data/custom-polymirror.db" }, () => {
      expect(resolveDbPath(false)).toBe("data/custom-polymirror.db");
    });
  });

  it("prefers POLYSYNC_DB_PATH over the compatibility fallback", () => {
    withDbPathEnv(
      { polysync: "data/custom-polysync.db", polymirror: "data/custom-polymirror.db" },
      () => {
        expect(resolveDbPath(false)).toBe("data/custom-polysync.db");
      }
    );
  });
});

describe("resolveAccountDbPath", () => {
  it("uses per-account path for non-default accounts", () => {
    expect(resolveAccountDbPath("sub1", true)).toBe("data/accounts/sub1/preview.db");
  });

  it("uses legacy preview path for default when it exists", () => {
    const cwd = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), "polysync-db-path-"));
    process.chdir(dir);
    mkdirSync("data", { recursive: true });
    writeFileSync("data/preview.db", "");
    try {
      expect(resolveAccountDbPath("default", true)).toBe("data/preview.db");
    } finally {
      process.chdir(cwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
