import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface } from './MigrationInterface';
import { flatArray } from './utils/flatArray';
import { isTsNode } from './utils/isTsNode';

export interface MigrationObject {
  file: string;
  className: string;
  instance: MigrationInterface;
}

const isMigration = (obj: any): boolean => {
  return (
    obj &&
    obj.up &&
    obj.down &&
    typeof obj.up === 'function' &&
    typeof obj.down === 'function'
  );
};

export const loadMigrationFile = async (
  migrationsDir: string,
  fileName: string
): Promise<MigrationObject[]> => {
  const filePath = path.resolve(migrationsDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File ${fileName} not exists.`);
  }

  const classes = await import(filePath);

  return Object.keys(classes)
    .filter((key: string) => typeof classes[key] === 'function')
    .map((key: string) => {
      return {
        file: fileName,
        className: key,
        instance: new classes[key](),
      };
    })
    .filter((migration: MigrationObject) => isMigration(migration.instance));
};

export const loadMigrations = async (
  migrationsDir: string
): Promise<MigrationObject[]> => {
  const fileExt = isTsNode() ? new RegExp(/\.ts$/i) : new RegExp(/\.js$/i);

  const migrations = Promise.all(
    fs
      .readdirSync(migrationsDir)
      .filter((file: string) => fileExt.test(file))
      .map((file: string) => loadMigrationFile(migrationsDir, file))
  );

  // flat migrations because in one file can be more than one migration
  const flatMigrations = flatArray(await migrations);

  return flatMigrations;
};
