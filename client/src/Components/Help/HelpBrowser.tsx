import { useLayoutEffect, useRef, useState } from "react";
import { Box, Button, Link, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link as RouterLink, useNavigate, useParams } from "react-router";
import { useGlobalModalActions } from "../../Context/globalModalContexts";
import { filterHelpPageLinks, filterHelpTopics, findHelpTopic, HELP_GROUPS, type HelpTopicId } from "../../library/help";

const articles = import.meta.glob<string>("../../content/help/*.md", { query: "?raw", import: "default", eager: true });

/** Shared reading surface; the dialog owns its sizing and scroll container. */
export default function HelpBrowser({ initialTopic, standalone = false }: { initialTopic?: HelpTopicId, standalone?: boolean }) {
  const params = useParams();
  const navigate = useNavigate();
  const { closeModal } = useGlobalModalActions();
  const [history, setHistory] = useState<(HelpTopicId | undefined)[]>([initialTopic]);
  const [query, setQuery] = useState("");
  const id = standalone ? params.topic : history.at(-1);
  const topic = findHelpTopic(id);
  const heading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const indexPosition = useRef({ top: 0, id: undefined as HelpTopicId | undefined });
  const first = useRef(true);

  const scrollHost = () => root.current?.closest<HTMLElement>(".MuiDialogContent-root");
  /** Leaving the index: remember where it was, so coming back restores its scroll and focus. */
  const recordIndexPosition = (next?: HelpTopicId) => {
    if (!topic) indexPosition.current = { top: scrollHost()?.scrollTop ?? window.scrollY, id: next };
  };
  const openTopic = (next?: HelpTopicId) => {
    recordIndexPosition(next);
    if (standalone) void navigate(next ? `/help/${next}` : "/help");
    else setHistory(previous => [...previous, next]);
  };

  useLayoutEffect(() => {
    const host = root.current?.closest<HTMLElement>(".MuiDialogContent-root");
    const top = !id ? indexPosition.current.top : 0;
    if (host) host.scrollTop = top;
    else if (standalone) window.scrollTo(0, top);
    if (first.current && !id) { first.current = false; return; }
    first.current = false;
    const previousButton = !id && indexPosition.current.id
      ? root.current?.querySelector<HTMLElement>(`[data-help-topic="${indexPosition.current.id}"]`)
      : null;
    (previousButton ?? heading.current)?.focus({ preventScroll: true });
  }, [id, standalone]);

  // Standalone, a topic is a real link that navigates by itself; in the modal it opens in place.
  const topicLink = (id: HelpTopicId, title: string) => <TopicLink key={id} id={id} title={title} standalone={standalone}
    onClick={() => standalone ? recordIndexPosition(id) : openTopic(id)} />;

  const topics = filterHelpTopics(query);
  const pageLinks = filterHelpPageLinks(query);
  return <Box ref={root} sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 2 }}>
      {!standalone && history.length > 1 && <Button onClick={() => setHistory(previous => previous.slice(0, -1))}>Back</Button>}
      {id && <Button onClick={() => openTopic()}>All topics</Button>}
      {!standalone && <Link href={topic ? `/help/${topic.id}` : "/help"} target="_blank" rel="noopener noreferrer" sx={{ ml: "auto" }}>Open in new tab</Link>}
    </Box>
    <Typography ref={heading} tabIndex={-1} component={standalone ? "h1" : "h2"} variant="h5" sx={{ mb: 2 }}>
      {topic?.title ?? (id ? "Topic not found" : "Help topics")}
    </Typography>
    {id && !topic ? <Typography>Choose All topics to find the help you need.</Typography> : topic ? <>
      <Box sx={{ "& p, & li": { lineHeight: 1.7 }, "& li + li": { mt: 1 }, "& code": { fontSize: "0.9em" } }}>
        <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
          a: ({ href, children }) => {
            const target = href?.startsWith("/help/") ? findHelpTopic(href.slice(6)) : undefined;
            return target
              ? <Link href={href} onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); openTopic(target.id); } }}>{children}</Link>
              : <Link href={href} target="_blank" rel="noopener noreferrer">{children}</Link>;
          },
          h2: ({ children }) => <Typography component="h3" variant="h6" sx={{ mt: 3 }}>{children}</Typography>,
          table: ({ children }) => <Box role="region" aria-label="Help reference table" tabIndex={0} sx={{ overflowX: "auto", my: 2 }}><Box component="table" sx={{ borderCollapse: "collapse", width: "100%", minWidth: 440, overflowWrap: "normal", "& th, & td": { borderBottom: 1, borderColor: "divider", p: 1, textAlign: "left", verticalAlign: "top" } }}>{children}</Box></Box>,
        }}>{articles[`../../content/help/${topic.id}.md`]}</Markdown>
      </Box>
      <Typography component={standalone ? "h2" : "h3"} variant="subtitle2" sx={{ mt: 3 }}>Related topics</Typography>
      <List component="nav" aria-label="Related topics" dense>
        {topic.related.flatMap(relatedId => findHelpTopic(relatedId) ?? []).map(other => topicLink(other.id, other.title))}
      </List>
    </> : <>
      <TextField fullWidth size="small" label="Find a topic" value={query} onChange={event => setQuery(event.target.value)} />
      {topics.length === 0 && pageLinks.length === 0 && <Typography role="status" sx={{ mt: 2 }}>No topics found. Try another word or clear the filter.</Typography>}
      {HELP_GROUPS.map(group => {
        const matches = topics.filter(item => item.group === group);
        const links = pageLinks.filter(link => link.group === group);
        return matches.length || links.length ? <Box key={group} sx={{ mt: 3 }}>
          <Typography component={standalone ? "h2" : "h3"} variant="subtitle1">{group}</Typography>
          <List component="nav" aria-label={group} dense>
            {matches.map(item => topicLink(item.id, item.title))}
            {/* Leaves Help for another page of the app, so the modal closes behind it. */}
            {links.map(link => <ListItemButton key={link.to} component={RouterLink} to={link.to} onClick={standalone ? undefined : closeModal}>
              <ListItemText primary={link.title} />
            </ListItemButton>)}
          </List>
        </Box> : null;
      })}
    </>}
  </Box>;
}

/** A topic in the index or under Related topics. */
function TopicLink({ id, title, standalone, onClick }: { id: HelpTopicId, title: string, standalone: boolean, onClick: () => void }) {
  return <ListItemButton data-help-topic={id} component={standalone ? RouterLink : "button"} to={standalone ? `/help/${id}` : undefined}
    onClick={onClick} sx={{ width: "100%", textAlign: "left" }}>
    <ListItemText primary={title} />
  </ListItemButton>;
}
