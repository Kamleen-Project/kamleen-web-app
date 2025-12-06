#!/usr/bin/env node

// Migrate local files under public/uploads to Vercel Blob and update DB URLs
// Usage: BLOB_READ_WRITE_TOKEN=... PRISMA_DATABASE_URL=... node scripts/migrate-uploads-to-blob.mjs [--dry-run]

import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import process from "node:process";
import { put } from "@vercel/blob";

// Import Prisma Client generated in src/generated/prisma
// Use explicit file path to avoid relying on TS path aliases
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

function isLocalUploadUrl(url) {
  return typeof url === "string" && url.startsWith("/uploads/");
}

function getAbsoluteLocalPath(localUrl) {
  const relative = localUrl.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", relative);
}

function guessContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

async function uploadLocalFileToBlob(localUrl) {
  const absPath = getAbsoluteLocalPath(localUrl);
  try {
    const stat = await fs.stat(absPath);
    if (!stat.isFile()) throw new Error("Not a file");
  } catch (err) {
    console.warn(`[skip] missing file for ${localUrl}`);
    return null;
  }

  const key = localUrl.replace(/^\/+/, ""); // keep uploads/... structure in Blob
  const contentType = guessContentType(absPath);
  if (DRY_RUN) {
    console.log(`[dry-run] would upload ${absPath} -> blob key ${key}`);
    return `https://example.com/${key}`; // placeholder
  }
  const stream = createReadStream(absPath);
  const uploaded = await put(key, stream, { access: "public", contentType });
  return uploaded.url;
}

async function migrateSingleUrl(url) {
  if (!isLocalUploadUrl(url)) return url;
  const blobUrl = await uploadLocalFileToBlob(url);
  return blobUrl ?? url; // keep original if upload failed
}

async function migrateArrayUrls(urls) {
  const result = [];
  for (const u of urls ?? []) {
    result.push(await migrateSingleUrl(u));
  }
  return result;
}

async function migrateUsers() {
  const users = await prisma.user.findMany({ select: { id: true, image: true } });
  let updated = 0;
  for (const u of users) {
    if (!isLocalUploadUrl(u.image)) continue;
    const image = await migrateSingleUrl(u.image);
    if (image !== u.image) {
      if (!DRY_RUN) await prisma.user.update({ where: { id: u.id }, data: { image } });
      updated += 1;
      console.log(`[user] ${u.id} -> ${image}`);
    }
  }
  return updated;
}

async function migrateExperiences() {
  const exps = await prisma.experience.findMany({
    select: { id: true, heroImage: true, galleryImages: true },
  });
  let updated = 0;
  for (const e of exps) {
    const newHero = await migrateSingleUrl(e.heroImage ?? "");
    const newGallery = await migrateArrayUrls(e.galleryImages ?? []);
    const heroChanged = newHero !== (e.heroImage ?? "");
    const galleryChanged = JSON.stringify(newGallery) !== JSON.stringify(e.galleryImages ?? []);
    if (heroChanged || galleryChanged) {
      if (!DRY_RUN)
        await prisma.experience.update({ where: { id: e.id }, data: { heroImage: newHero || null, galleryImages: newGallery } });
      updated += 1;
      console.log(`[experience] ${e.id} -> hero:${heroChanged ? "yes" : "no"}, gallery:${galleryChanged ? "yes" : "no"}`);
    }
  }
  return updated;
}

async function migrateItinerarySteps() {
  const steps = await prisma.experienceItineraryStep.findMany({ select: { id: true, image: true } });
  let updated = 0;
  for (const s of steps) {
    if (!isLocalUploadUrl(s.image)) continue;
    const image = await migrateSingleUrl(s.image);
    if (image !== s.image) {
      if (!DRY_RUN) await prisma.experienceItineraryStep.update({ where: { id: s.id }, data: { image } });
      updated += 1;
      console.log(`[itinerary] ${s.id} -> ${image}`);
    }
  }
  return updated;
}

async function migrateTaxonomy() {
  let updated = 0;
  const countries = await prisma.country.findMany({ select: { id: true, picture: true } });
  for (const c of countries) {
    if (isLocalUploadUrl(c.picture)) {
      const picture = await migrateSingleUrl(c.picture);
      if (picture !== c.picture) {
        if (!DRY_RUN) await prisma.country.update({ where: { id: c.id }, data: { picture } });
        updated += 1;
        console.log(`[country] ${c.id} -> ${picture}`);
      }
    }
  }
  const states = await prisma.state.findMany({ select: { id: true, picture: true } });
  for (const s of states) {
    if (s.picture && isLocalUploadUrl(s.picture)) {
      const picture = await migrateSingleUrl(s.picture);
      if (picture !== s.picture) {
        if (!DRY_RUN) await prisma.state.update({ where: { id: s.id }, data: { picture } });
        updated += 1;
        console.log(`[state] ${s.id} -> ${picture}`);
      }
    }
  }
  const cities = await prisma.city.findMany({ select: { id: true, picture: true } });
  for (const c of cities) {
    if (isLocalUploadUrl(c.picture)) {
      const picture = await migrateSingleUrl(c.picture);
      if (picture !== c.picture) {
        if (!DRY_RUN) await prisma.city.update({ where: { id: c.id }, data: { picture } });
        updated += 1;
        console.log(`[city] ${c.id} -> ${picture}`);
      }
    }
  }
  const categories = await prisma.experienceCategory.findMany({ select: { id: true, picture: true } });
  for (const cat of categories) {
    if (isLocalUploadUrl(cat.picture)) {
      const picture = await migrateSingleUrl(cat.picture);
      if (picture !== cat.picture) {
        if (!DRY_RUN) await prisma.experienceCategory.update({ where: { id: cat.id }, data: { picture } });
        updated += 1;
        console.log(`[category] ${cat.id} -> ${picture}`);
      }
    }
  }
  return updated;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Missing BLOB_READ_WRITE_TOKEN in env. Aborting.");
    process.exit(1);
  }
  if (!process.env.PRISMA_DATABASE_URL) {
    console.error("Missing PRISMA_DATABASE_URL in env. Aborting.");
    process.exit(1);
  }

  console.log(`Starting migration${DRY_RUN ? " (dry-run)" : ""}...`);

  const results = {};
  results.users = await migrateUsers();
  results.experiences = await migrateExperiences();
  results.itinerary = await migrateItinerarySteps();
  results.taxonomy = await migrateTaxonomy();

  console.log("Migration complete:", results);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


