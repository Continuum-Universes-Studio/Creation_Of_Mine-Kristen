import type { ReactNode } from "react";
import type { Story } from "../data/stories";
import { storyPictures } from "../data/storyPictures";

function groupsFor(story: Story) {
  return story.pictures ?? storyPictures[story.slug] ?? [];
}

function pictures(story: Story, after: number) {
  return groupsFor(story)
    .filter((group) => group.after === after)
    .map((group) => (
      <div
        className={group.srcs.length > 1 ? "entry-pictures" : "entry-pictures single"}
        key={`${story.slug}-${after}-${group.srcs[0]}`}
      >
        {group.srcs.map((src) => (
          <img src={src} alt="" key={src} />
        ))}
      </div>
    ));
}

export default function StoryCopy({ story }: { story: Story }) {
  const paragraphs = story.html.match(/<p[\s\S]*?<\/p>/g) ?? [];
  const nodes: ReactNode[] = [...pictures(story, 0)];
  const placed = new Set<number>([0]);

  if (!paragraphs.length && story.html) {
    nodes.push(<div key="body" dangerouslySetInnerHTML={{ __html: story.html }} />);
  }

  paragraphs.forEach((html, index) => {
    const after = index + 1;
    placed.add(after);
    nodes.push(<div key={`p-${index}`} dangerouslySetInnerHTML={{ __html: html }} />);
    nodes.push(...pictures(story, after));
  });

  for (const group of groupsFor(story)) {
    if (!placed.has(group.after)) nodes.push(...pictures(story, group.after));
  }

  return <>{nodes}</>;
}
