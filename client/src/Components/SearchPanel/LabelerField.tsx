import { useMemo, useState } from "react";
import { Autocomplete, Box, Link, ListSubheader, TextField, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { useGlobalModalActions } from "../../Context/globalModalContexts";
import useFdaLabelers from "../../hooks/useFdaLabelers";
import { MAX_LABELER_CODES } from "../../library/constants";
import { helpSectionId } from "../../library/help";
import {
  labelerCodeCount, matchLabelers, MIN_LABELER_TERM_LENGTH, normalizeLabeler, type LabelerChoice, type LabelerMatch,
} from "../../library/labelers";

/** The Searching article's section the field's notes point to. */
export const COMPANY_HELP_SECTION = helpSectionId("Finding a company's products");

/** An option: a pick, with how it matched. Picks restored from a tab have no match. */
type Option = LabelerChoice & { match?: LabelerMatch };

const sameChoice = (a: LabelerChoice, b: LabelerChoice) => a.name === b.name && a.codes.join() === b.codes.join();

const MATCHES_GROUP = "Matches";
const FUZZY_GROUP = "Did you mean";

type Props = {
  id: string,
  label: string,
  placeholder?: string,
  value: LabelerChoice[],
  onChange: (value: LabelerChoice[]) => void,
  /** The page's Include boxes, which decide the labelers offered. */
  includeOtc: boolean,
  includeWithoutPrices: boolean,
  size: "small" | "medium",
  /** Fewer chips while closed, on narrow layouts. */
  limitTags?: number,
  /** The Help link's least height: 24px, 44 on narrow layouts. */
  minTarget?: number,
};

/**
 * The Labeler term: a combo box of labelers matched in the browser (`matchLabelers`), typos
 * included. Only listed labelers can be picked, and the picks search by their codes. The list is
 * fetched when the field is first focused, so a restored tab shows its picks without it.
 */
export default function LabelerField({ id, label, placeholder, value, onChange, includeOtc, includeWithoutPrices, size, limitTags, minTarget = 24 }: Props) {
  const { openHelp } = useGlobalModalActions();
  const [used, setUsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { index, isLoading, isError } = useFdaLabelers(used);

  const result = useMemo(
    () => index ? matchLabelers(index, inputValue, { includeOtc, includeWithoutPrices }) : null,
    [index, inputValue, includeOtc, includeWithoutPrices],
  );
  const options: Option[] = useMemo(() => (result?.matches ?? [])
    .map(match => ({ name: match.group.name, codes: match.group.codes, match })), [result]);

  // An option that would take the search past the code limit can't be picked.
  const pickedCodes = labelerCodeCount(value);
  const wouldPassLimit = (option: Option) =>
    !value.some(choice => sameChoice(choice, option)) && labelerCodeCount([...value, option]) > MAX_LABELER_CODES;
  const anyBlocked = options.some(wouldPassLimit) || pickedCodes >= MAX_LABELER_CODES && normalizeLabeler(inputValue).length >= MIN_LABELER_TERM_LENGTH;
  // Matches, but none where a word starts with the term: the company may be listed under another name.
  const showHint = !!result && result.matches.length > 0 && !result.wordStart;
  const lastGroup = options.some(option => option.match!.tier === 4) ? FUZZY_GROUP : MATCHES_GROUP;

  const learnMore = (
    <Link
      component="button"
      type="button"
      // Keeps focus in the field, so the list doesn't close before the click.
      onMouseDown={event => event.preventDefault()}
      onClick={() => openHelp("searching", { section: COMPANY_HELP_SECTION })}
    >
      Learn more
    </Link>
  );

  const typedEnough = normalizeLabeler(inputValue).length >= MIN_LABELER_TERM_LENGTH;
  const NO_MATCH = "No labelers match. Products are listed under the company that registered the NDC, which may be a subsidiary. Search by brand name to see the labeler.";
  const HINT = "Not the company you meant? Search by brand name to see the labeler.";
  const LOAD_FAILED = "Labelers couldn’t load. Reload the page to try again.";
  const noOptionsText = isError ? LOAD_FAILED
    : !typedEnough ? "Type at least 2 letters of a company name."
    : <>{NO_MATCH} {learnMore}</>;
  // The popup's notes aren't read out (the combo box announces options only), so the status
  // line under the field says them too, hidden from sight since the popup shows them.
  const spokenNote = inputValue === "" ? ""
    : isError ? LOAD_FAILED
    : result && typedEnough && result.matches.length === 0 ? NO_MATCH
    : showHint ? HINT
    : "";

  return (
    <Box sx={{ minWidth: 0 }}>
      <Autocomplete<Option, true, false, false>
        multiple
        // Enter picks the top match while the list is open, and searches once it's closed.
        autoHighlight
        id={id}
        size={size}
        limitTags={limitTags}
        options={options}
        value={value}
        onChange={(_, picks) => onChange(picks.map(({ name, codes }) => ({ name, codes })))}
        inputValue={inputValue}
        // Picking clears the text; so does leaving the field (`clearOnBlur`), so unpicked text never waits silently.
        onInputChange={(_, text) => setInputValue(text)}
        onFocus={() => setUsed(true)}
        filterOptions={x => x}
        isOptionEqualToValue={sameChoice}
        getOptionLabel={option => option.name}
        getOptionKey={option => option.codes.join()}
        getOptionDisabled={wouldPassLimit}
        groupBy={option => option.match!.tier <= 3 ? MATCHES_GROUP : FUZZY_GROUP}
        loading={isLoading}
        loadingText="Loading labelers…"
        noOptionsText={noOptionsText}
        renderOption={({ key, ...props }, option) => (
          <li key={key} {...props}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">{option.name}</Typography>
              {option.match?.listedAs && <Typography variant="caption" color="text.secondary">Listed as {option.match.listedAs}</Typography>}
            </Box>
          </li>
        )}
        renderGroup={params => (
          <li key={params.key}>
            <ListSubheader component="div" sx={{ top: -8, lineHeight: "32px" }}>{params.group}</ListSubheader>
            <Box component="ul" sx={{ p: 0 }}>{params.children}</Box>
            {/* Not an option: arrow keys move between options only, and it isn't read as one. */}
            {showHint && params.group === lastGroup && (
              <Typography role="presentation" variant="body2" color="text.secondary" sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
                {HINT} {learnMore}
              </Typography>
            )}
          </li>
        )}
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            placeholder={value.length === 0 ? placeholder : undefined}
            name={id}
          />
        )}
      />
      {/* Always mounted, so a screen reader hears the line when it appears. */}
      <Typography role="status" variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {anyBlocked ? "Too many labelers to search at once. Remove one to add another." : ""}
        <Box component="span" sx={visuallyHidden}>{spokenNote}</Box>
      </Typography>
      {/* In the tab order after the field, for keyboards: the popup's Learn more closes with it. */}
      <Link
        component="button"
        type="button"
        variant="caption"
        onClick={() => openHelp("searching", { section: COMPANY_HELP_SECTION })}
        sx={{ display: "block", textAlign: "left", minHeight: minTarget }}
      >
        Can’t find a company?
      </Link>
    </Box>
  );
}
