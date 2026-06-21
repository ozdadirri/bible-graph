const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const jsonDir = path.join(root, "json");
const outDir = path.join(__dirname, "../public/data");

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(jsonDir, `${name}.json`), "utf8"));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
  fs.writeFileSync(path.join(outDir, file), `${JSON.stringify(data)}\n`);
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanText(value, max = 0) {
  const text = Array.isArray(value) ? value.join(" ") : value || "";
  const cleaned = String(text)
    .replace(/\s+/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => match.slice(1, match.indexOf("]")))
    .trim();
  if (max > 0) return cleaned.slice(0, max);
  return cleaned;
}

function label(record, type) {
  const f = record.fields || {};
  if (type === "person") return f.displayTitle || f.name || f.personLookup || record.id;
  if (type === "place") return f.displayTitle || f.kjvName || f.esvName || f.placeLookup || record.id;
  if (type === "event") return f.title || `Event ${f.eventID || record.id}`;
  if (type === "book") return f.bookName || f.osisName || record.id;
  if (type === "chapter") return f.osisRef || `Chapter ${f.chapterNum || record.id}`;
  if (type === "verse") return f.osisRef || record.id;
  return record.id;
}

function slug(record, type) {
  const f = record.fields || {};
  if (type === "person") return f.slug || f.personLookup || record.id;
  if (type === "place") return f.slug || f.placeLookup || record.id;
  if (type === "book") return f.slug || (f.osisName || record.id).toLowerCase();
  if (type === "chapter") return f.slug || (f.osisRef || record.id).replace(/\./g, "_").toLowerCase();
  if (type === "event") return `event-${f.eventID || record.id}`;
  return record.id;
}

function isoYearLabel(year) {
  if (year === undefined || year === null || year === "") return "Unknown";
  const numeric = Number(year);
  if (!Number.isFinite(numeric)) return String(year);
  if (numeric < 1) return `${Math.abs(numeric) + 1} BC`;
  return `AD ${numeric}`;
}

const books = read("books");
const chapters = read("chapters");
const verses = read("verses");
const people = read("people");
const places = read("places");
const events = read("events");

const byId = new Map();
for (const [type, records] of [
  ["book", books],
  ["chapter", chapters],
  ["verse", verses],
  ["person", people],
  ["place", places],
  ["event", events],
]) {
  for (const record of records) byId.set(record.id, { type, record });
}

const booksById = new Map(books.map((record) => [record.id, record]));
const chaptersById = new Map(chapters.map((record) => [record.id, record]));
const versesById = new Map(verses.map((record) => [record.id, record]));
const peopleById = new Map(people.map((record) => [record.id, record]));
const placesById = new Map(places.map((record) => [record.id, record]));
const eventsById = new Map(events.map((record) => [record.id, record]));

function summary(record, type) {
  const f = record.fields || {};
  if (type === "person") {
    return {
      id: record.id,
      type,
      slug: slug(record, type),
      label: label(record, type),
      subtitle: f.gender || "Person",
      count: f.verseCount || 0,
      years: `${isoYearLabel(f.birthYear)} - ${isoYearLabel(f.deathYear)}`,
      description: cleanText(f.dictionaryText || f.dictText),
    };
  }
  if (type === "place") {
    return {
      id: record.id,
      type,
      slug: slug(record, type),
      label: label(record, type),
      subtitle: f.featureType || "Place",
      count: f.verseCount || 0,
      lat: Number(f.latitude || f.openBibleLat),
      lon: Number(f.longitude || f.openBibleLong),
      description: cleanText(f.dictionaryText || f.dictText || f.comment, 180),
    };
  }
  if (type === "event") {
    return {
      id: record.id,
      type,
      slug: slug(record, type),
      label: label(record, type),
      subtitle: isoYearLabel(f.startDate),
      count: (f.verses || []).length,
      description: cleanText(f.notes, 180),
    };
  }
  if (type === "book") {
    return {
      id: record.id,
      type,
      slug: slug(record, type),
      label: label(record, type),
      subtitle: f.bookDiv || f.testament || "Book",
      count: f.verseCount || 0,
      description: `${f.chapterCount || 0} chapters, ${f.peopleCount || 0} people, ${f.placeCount || 0} places`,
    };
  }
  return { id: record.id, type, slug: record.id, label: label(record, type) };
}

function pushNode(nodes, record, type, group, score = 1) {
  if (!record || nodes.has(record.id)) return;
  nodes.set(record.id, {
    id: record.id,
    type,
    group,
    label: label(record, type),
    slug: slug(record, type),
    score,
  });
}

function pushLink(links, source, target, labelText) {
  if (!source || !target || source === target) return;
  links.push({ source, target, label: labelText });
}

function compactVerse(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    ref: f.osisRef,
    text: f.verseText,
    year: f.yearNum,
  };
}

function buildChapterGraph(chapter) {
  const f = chapter.fields || {};
  const nodes = new Map();
  const links = [];
  pushNode(nodes, chapter, "chapter", "focus", (f.verses || []).length || 20);

  const bookId = first(f.book);
  const book = booksById.get(bookId);
  if (book) {
    pushNode(nodes, book, "book", "book", book.fields?.verseCount || 20);
    pushLink(links, chapter.id, book.id, "part of");
  }

  const verseRecords = (f.verses || []).map((id) => versesById.get(id)).filter(Boolean);
  const personCounts = new Map();
  const placeCounts = new Map();
  const eventCounts = new Map();

  for (const verse of verseRecords) {
    for (const id of verse.fields?.people || []) personCounts.set(id, (personCounts.get(id) || 0) + 1);
    for (const id of verse.fields?.places || []) placeCounts.set(id, (placeCounts.get(id) || 0) + 1);
    for (const id of verse.fields?.event || verse.fields?.events || []) eventCounts.set(id, (eventCounts.get(id) || 0) + 1);
  }

  for (const [id, count] of [...personCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
    pushNode(nodes, peopleById.get(id), "person", "mentioned", count);
    pushLink(links, chapter.id, id, "mentions");
  }

  for (const [id, count] of [...placeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    pushNode(nodes, placesById.get(id), "place", "mentioned", count);
    pushLink(links, chapter.id, id, "mentions");
  }

  for (const [id, count] of [...eventCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    pushNode(nodes, eventsById.get(id), "event", "event", count);
    pushLink(links, chapter.id, id, "event");
  }

  return {
    entity: { ...summary(chapter, "chapter"), rawId: chapter.id, book: book ? summary(book, "book") : null },
    stats: {
      verses: verseRecords.length,
      people: personCounts.size,
      places: placeCounts.size,
      events: eventCounts.size,
    },
    nodes: [...nodes.values()],
    links,
    verses: verseRecords.slice(0, 8).map(compactVerse),
  };
}

function buildEventGraph(event) {
  const f = event.fields || {};
  const nodes = new Map();
  const links = [];
  pushNode(nodes, event, "event", "focus", (f.verses || []).length || 12);

  for (const id of f.participants || []) {
    const person = peopleById.get(id);
    pushNode(nodes, person, "person", "person", person?.fields?.verseCount || 3);
    pushLink(links, event.id, id, "participant");
  }

  for (const id of f.locations || []) {
    const place = placesById.get(id);
    pushNode(nodes, place, "place", "place", place?.fields?.verseCount || 3);
    pushLink(links, event.id, id, "location");
  }

  for (const id of f.predecessor || []) {
    const predecessor = eventsById.get(id);
    pushNode(nodes, predecessor, "event", "event", 5);
    pushLink(links, event.id, id, "predecessor");
  }

  for (const id of f.partOf || []) {
    const parent = eventsById.get(id);
    pushNode(nodes, parent, "event", "event", 5);
    pushLink(links, event.id, id, "part of");
  }

  const verseRecords = (f.verses || []).map((id) => versesById.get(id)).filter(Boolean);
  return {
    entity: { ...summary(event, "event"), rawId: event.id },
    stats: {
      verses: verseRecords.length,
      participants: (f.participants || []).length,
      locations: (f.locations || []).length,
    },
    nodes: [...nodes.values()],
    links,
    verses: verseRecords.slice(0, 8).map(compactVerse),
  };
}

function buildPersonGraph(person) {
  const f = person.fields || {};
  const nodes = new Map();
  const links = [];
  pushNode(nodes, person, "person", "focus", f.verseCount || 20);

  for (const key of ["father", "mother", "children", "siblings", "partners"]) {
    for (const id of f[key] || []) {
      const target = peopleById.get(id);
      pushNode(nodes, target, "person", key, target?.fields?.verseCount || 4);
      pushLink(links, person.id, id, key);
    }
  }

  for (const id of [...(f.birthPlace || []), ...(f.deathPlace || [])]) {
    const target = placesById.get(id);
    pushNode(nodes, target, "place", "place", target?.fields?.verseCount || 3);
    pushLink(links, person.id, id, "place");
  }

  for (const id of (f.events || []).slice(0, 14)) {
    const event = eventsById.get(id);
    pushNode(nodes, event, "event", "event", 8);
    pushLink(links, person.id, id, "participated");
    for (const placeId of (event?.fields?.locations || []).slice(0, 3)) {
      const place = placesById.get(placeId);
      pushNode(nodes, place, "place", "place", place?.fields?.verseCount || 3);
      pushLink(links, id, placeId, "occurred in");
    }
  }

  const verseIds = (f.verses || []).slice(0, 8);
  const sampleVerses = verseIds.map((id) => versesById.get(id)).filter(Boolean).map(compactVerse);

  return {
    entity: { ...summary(person, "person"), rawId: person.id },
    stats: {
      verses: f.verseCount || 0,
      events: (f.events || []).length,
      family: ["father", "mother", "children", "siblings", "partners"].reduce((sum, key) => sum + (f[key] || []).length, 0),
    },
    nodes: [...nodes.values()],
    links,
    verses: sampleVerses,
  };
}

function buildPlaceGraph(place) {
  const f = place.fields || {};
  const nodes = new Map();
  const links = [];
  pushNode(nodes, place, "place", "focus", f.verseCount || 20);

  for (const id of (f.eventsHere || []).slice(0, 18)) {
    const event = eventsById.get(id);
    pushNode(nodes, event, "event", "event", 8);
    pushLink(links, place.id, id, "event");
    for (const personId of (event?.fields?.participants || []).slice(0, 4)) {
      const person = peopleById.get(personId);
      pushNode(nodes, person, "person", "person", person?.fields?.verseCount || 3);
      pushLink(links, id, personId, "participant");
    }
  }

  const sampleVerses = (f.verses || []).slice(0, 8).map((id) => versesById.get(id)).filter(Boolean).map(compactVerse);
  return {
    entity: { ...summary(place, "place"), rawId: place.id },
    stats: { verses: f.verseCount || 0, events: (f.eventsHere || []).length, people: (f.peopleDied || []).length },
    nodes: [...nodes.values()],
    links,
    verses: sampleVerses,
  };
}

function buildBookGraph(book) {
  const f = book.fields || {};
  const nodes = new Map();
  const links = [];
  pushNode(nodes, book, "book", "focus", f.verseCount || 20);

  for (const chapterId of (f.chapters || []).slice(0, 20)) {
    const chapter = chaptersById.get(chapterId);
    pushNode(nodes, chapter, "chapter", "chapter", 4);
    pushLink(links, book.id, chapterId, "contains");
  }

  for (const writerId of f.writers || []) {
    const writer = people.find((person) => person.fields?.personLookup === writerId) || peopleById.get(writerId);
    pushNode(nodes, writer, "person", "writer", writer?.fields?.verseCount || 10);
    if (writer) pushLink(links, book.id, writer.id, "writer");
  }

  const bookVerses = (f.verses || []).slice(0, 400).map((id) => versesById.get(id)).filter(Boolean);
  const personCounts = new Map();
  const placeCounts = new Map();
  for (const verse of bookVerses) {
    for (const id of verse.fields?.people || []) personCounts.set(id, (personCounts.get(id) || 0) + 1);
    for (const id of verse.fields?.places || []) placeCounts.set(id, (placeCounts.get(id) || 0) + 1);
  }
  for (const [id, count] of [...personCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) {
    pushNode(nodes, peopleById.get(id), "person", "mentioned", count);
    pushLink(links, book.id, id, "mentions");
  }
  for (const [id, count] of [...placeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    pushNode(nodes, placesById.get(id), "place", "mentioned", count);
    pushLink(links, book.id, id, "mentions");
  }

  return {
    entity: { ...summary(book, "book"), rawId: book.id },
    stats: { chapters: f.chapterCount || 0, verses: f.verseCount || 0, people: f.peopleCount || 0, places: f.placeCount || 0 },
    nodes: [...nodes.values()],
    links,
    verses: bookVerses.slice(0, 6).map(compactVerse),
  };
}

const peopleSummary = people
  .filter((record) => record.fields?.status !== "draft")
  .map((record) => summary(record, "person"))
  .sort((a, b) => b.count - a.count);

const placesSummary = places
  .filter((record) => record.fields?.status !== "draft")
  .map((record) => summary(record, "place"))
  .sort((a, b) => b.count - a.count);

const eventsSummary = events
  .map((record) => summary(record, "event"))
  .sort((a, b) => (Number(eventsById.get(a.id)?.fields?.sortKey) || 0) - (Number(eventsById.get(b.id)?.fields?.sortKey) || 0));

const booksSummary = books.map((record) => summary(record, "book")).sort((a, b) => (booksById.get(a.id).fields.bookOrder || 0) - (booksById.get(b.id).fields.bookOrder || 0));

writeJson("index.json", {
  generatedAt: new Date().toISOString(),
  counts: {
    books: books.length,
    chapters: chapters.length,
    verses: verses.length,
    people: people.length,
    places: places.length,
    events: events.length,
  },
  featured: {
    people: peopleSummary.slice(0, 18).map((item) => item.slug),
    places: placesSummary.slice(0, 12).map((item) => item.slug),
    books: ["gen", "exod", "john", "acts", "rev"],
  },
});
writeJson("people-summary.json", peopleSummary.slice(0, 400));
writeJson("places-summary.json", placesSummary.slice(0, 240));
writeJson("events-summary.json", eventsSummary);
writeJson("books-summary.json", booksSummary);

const featuredPeople = [...new Set(["moses_2108", "paul_2479", ...peopleSummary.slice(0, 80).map((item) => item.slug)])];
const featuredPlaces = [...new Set(["jerusalem_636", "egypt_362", "bethlehem_218", "galilee_433", "mount_sinai_855", ...placesSummary.slice(0, 80).map((item) => item.slug)])];
const featuredBooks = booksSummary.map((item) => item.slug);

for (const key of featuredPeople) {
  const person = people.find((record) => record.fields?.slug === key || record.fields?.personLookup === key);
  if (person) writeJson(`graph/person/${key}.json`, buildPersonGraph(person));
}

for (const key of featuredPlaces) {
  const place = places.find((record) => record.fields?.slug === key || record.fields?.placeLookup === key);
  if (place) writeJson(`graph/place/${key}.json`, buildPlaceGraph(place));
}

for (const key of featuredBooks) {
  const book = books.find((record) => record.fields?.slug === key);
  if (book) writeJson(`graph/book/${key}.json`, buildBookGraph(book));
}

for (const chapter of chapters) {
  const chapterSlug = slug(chapter, "chapter");
  writeJson(`graph/chapter/${chapterSlug}.json`, buildChapterGraph(chapter));
}

for (const event of events) {
  writeJson(`graph/event/${slug(event, "event")}.json`, buildEventGraph(event));
}

writeJson("timeline-featured.json", eventsSummary.filter((event) => event.count > 2).slice(0, 80));

console.log(`Wrote static demo data to ${outDir}`);
