import { describe, expect, it } from "vitest";
import { HELP_PAGE_LINKS, HELP_TOPICS, HELP_GROUPS, filterHelpPageLinks, filterHelpTopics, findHelpTopic } from "./help";

const articles = import.meta.glob<string>("../content/help/*.md", { query: "?raw", import: "default", eager: true });

describe("published help", () => {
  it("has unique stable ids, an article for every topic, and no orphan articles", () => {
    expect(new Set(HELP_TOPICS.map(topic => topic.id)).size).toBe(HELP_TOPICS.length);
    expect(Object.keys(articles)).toHaveLength(HELP_TOPICS.length);
    for (const topic of HELP_TOPICS) {
      expect(topic.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      const article = articles[`../content/help/${topic.id}.md`];
      expect(article?.trim().length).toBeGreaterThan(40);
      expect(article).not.toMatch(/\*\*(?:Draft|Purpose|Check|Source|In context):\*\*/);
      for (const link of article.matchAll(/\]\(\/help\/([^)#]+)\)/g)) expect(findHelpTopic(link[1])).toBeDefined();
      for (const related of topic.related) {
        expect(findHelpTopic(related)).toBeDefined();
        expect(related).not.toBe(topic.id);
      }
    }
    expect(HELP_GROUPS).toHaveLength(5);
    for (const link of HELP_PAGE_LINKS) expect(HELP_GROUPS).toContain(link.group);
  });
  it("finds UI terms and ignores case and extra whitespace", () => {
    expect(filterHelpTopics("  MIXED   units ").map(topic => topic.id)).toContain("the-results-table");
    expect(filterHelpTopics("OTC").map(topic => topic.id)).toContain("filters-and-hidden-results");
    expect(filterHelpTopics("  ")).toEqual(HELP_TOPICS);
    expect(filterHelpTopics("nonexistentword")).toEqual([]);
  });
  it("lists About in the index and filters it like a topic", () => {
    expect(filterHelpPageLinks("").map(link => link.to)).toEqual(["/about"]);
    expect(filterHelpPageLinks("ABOUT project").map(link => link.to)).toEqual(["/about"]);
    expect(filterHelpPageLinks("charts")).toEqual([]);
  });
  it("handles unknown URL topics without guessing", () => {
    expect(findHelpTopic(undefined)).toBeUndefined();
    expect(findHelpTopic("not-a-topic")).toBeUndefined();
    expect(findHelpTopic("charts")?.title).toBe("Charts");
  });
});
