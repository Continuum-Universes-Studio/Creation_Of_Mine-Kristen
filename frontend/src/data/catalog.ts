export type SearchItem = {
  title: string;
  kind: string;
  href: string;
  text: string;
};

export const pages = [
  ["books", "Books"],
  ["gallery", "Art Gallery"],
  ["about", "About"],
  ["readers", "For Readers"],
  ["blog", "Blog"],
  ["contact", "Contact"],
] as const;

export const catalog: SearchItem[] = [
  { title: "Floopa Loopa", kind: "Book", href: "/books#floopa", text: "owl elvis dreams las vegas hawaii memphis mango tango" },
  { title: "Basset Ninja", kind: "Book", href: "/books#basset", text: "basset hound athena pizza counter surfing ninja" },
  { title: "Sir Fluffkins and the Search for the Golden Berry", kind: "Book", href: "/books#fluffkins", text: "corgi princess rosebud knochtwood goblins golden berry" },
  { title: "How Do Butterflies Earn Their Wings?", kind: "Book", href: "/books#butterflies", text: "faith dora gudgell vanessa illustrated by kristen" },
  { title: "Seth and Ruby", kind: "Book", href: "/books#upcoming", text: "coloring book editing" },
  { title: "The Dancing Toodle-Oohs", kind: "Book", href: "/books#upcoming", text: "christmas 2027" },
  { title: "Pepper Goes to the Moon", kind: "Book", href: "/books#upcoming", text: "planning" },
  { title: "The Tales of Lady Mara", kind: "Book", href: "/books#upcoming", text: "planning" },
  { title: "About Kristen Michelle Jensen", kind: "Page", href: "/about", text: "ogden utah jensen saga studio author illustrator" },
  { title: "Art Gallery", kind: "Page", href: "/gallery", text: "illustrations picture book art" },
  { title: "For Parents, Teachers, and Librarians", kind: "Page", href: "/readers", text: "school visits printables coloring pages resources" },
  { title: "Contact Kristen", kind: "Page", href: "/contact", text: "email school visit signing kristen@creations-of-mine.com" },
];

export const footers = {
  home: `Written and illustrated by Kristen Michelle Jensen · Ogden, Utah · <a href="mailto:kristen@creations-of-mine.com">kristen@creations-of-mine.com</a><br>If you are under 13, please ask a parent or guardian to write for you.`,
  books: `Jensen Saga Studio · <a href="mailto:kristen@creations-of-mine.com">kristen@creations-of-mine.com</a>`,
  gallery: "Illustrations © Kristen Michelle Jensen",
  about: `Written and illustrated by Kristen Michelle Jensen · Ogden, Utah · <a href="mailto:kristen@creations-of-mine.com">kristen@creations-of-mine.com</a>`,
  readers: "Intended for parents, teachers, librarians, and adult readers.",
  blog: "Storytime news from Kristen Michelle Jensen",
  contact: `<a href="mailto:kristen@creations-of-mine.com">kristen@creations-of-mine.com</a>`,
  missing: `Written and illustrated by Kristen Michelle Jensen · Ogden, Utah · <a href="mailto:kristen@creations-of-mine.com">kristen@creations-of-mine.com</a>`,
} as const;
