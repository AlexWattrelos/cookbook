// Pure formatting of amounts, names and durations. Every rule comes from config.json.

export const scale = (amount, servings, baseServings) => amount * servings / baseServings;

const clean = (number, decimals) => String(+number.toFixed(decimals));   // drops float noise and trailing zeros

function fraction(config, amount) {
  const whole = Math.floor(amount), rest = amount - whole;
  const options = [[0, ""], ...config.fractions, [1, null]];
  const [, glyph] = options.reduce((a, b) => Math.abs(b[0] - rest) < Math.abs(a[0] - rest) ? b : a);
  return glyph === null ? String(whole + 1) : (whole || "") + glyph;
}

export function formatAmount(config, amount, unit) {
  const rules = config.units[unit ?? "count"];
  if (rules.large && amount >= rules.large.from) return `${clean(amount / rules.large.from, rules.large.decimals)} ${rules.large.unit}`;
  let text;
  if (rules.round) {
    const step = rules.round.find(([below]) => below === null || amount < below)[1];
    text = clean(Math.round(amount / step) * step, 1);
  } else if (rules.integer) {
    text = String(Math.max(rules.min, Math.round(amount)));
  } else {
    text = fraction(config, amount);
  }
  if (text === "0" || text === "") return config.little;
  return unit ? `${text} ${unit}` : text;
}

// Count items store the singular: pluralise the word before " of ", else the last word.
export function plural(config, name) {
  const irregular = config.plurals;
  if (irregular[name]) return irregular[name];
  const cut = name.includes(" of ") ? name.indexOf(" of ") : name.length;
  return name.slice(0, cut).replace(/\S+$/, word => irregular[word] ?? word + "s") + name.slice(cut);
}

// The scaled amount followed by the name; count items take the plural above 1 ("½ onion", "1½ onions").
export function ingredientText(config, amount, unit, name) {
  const text = formatAmount(config, amount, unit);
  return `${text} ${!unit && amount > 1 ? plural(config, name) : name}`;
}

export function formatMinutes(config, minutes) {
  const patterns = config.timer;
  if (minutes < 60) return patterns.minutes.replace("{n}", minutes);
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return (rest ? patterns.hoursMinutes : patterns.hours).replace("{h}", hours).replace("{m}", String(rest).padStart(2, "0"));
}

// Timer chips show clock form: 3:00, 20:00, 2:30:00.
const pad = number => String(number).padStart(2, "0");
export function clock(seconds) {
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), rest = seconds % 60;
  return (hours ? `${hours}:${pad(minutes)}` : minutes) + `:${pad(rest)}`;
}
