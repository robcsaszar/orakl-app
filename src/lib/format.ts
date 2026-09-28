type DateInput = Date | string | number;

/** en-GB short date + short time — admin user history, authored/flagged question modals. */
export function formatDateTimeEnGb(value: DateInput): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Browser-default short date (month/day/year) — history, curator history, authored question list. */
export function formatDateShort(value: DateInput): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Browser-default medium date + short time — profile sessions sign-in time. */
export function formatDateTimeLocal(value: DateInput): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Browser-default date + time, no options — question revision list. */
export function formatDateTimeDefault(value: DateInput): string {
  return new Date(value).toLocaleString();
}

export const format = (
  node: HTMLInputElement,
  formatFunction: (value: string) => string,
) => {
  function updateValue(_e: Event) {
    node.value = formatFunction(node.value);
  }

  node.addEventListener("input", updateValue);
  node.addEventListener("paste", updateValue);

  // Format on intial hydration
  node.value = formatFunction(node.value);

  return {
    destroy() {
      node.removeEventListener("input", updateValue);
      node.removeEventListener("paste", updateValue);
    },
  };
};

// make sure the lobby code is always lowercase and in groups of 4 characters separated by dashes, max 2 groups (e.g. abcd-efgh); if dashed lobby code is pasted, it should be reformatted to the correct format; if more than 2 groups are pasted, only the first 2 groups should be kept
export const lobbyCode = (value: string) => {
  // remove all non-alphanumeric characters and convert to lowercase
  let formattedValue = value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  // split into groups of 4 characters
  const groups = formattedValue.match(/.{1,4}/g) || [];

  // keep only the first 2 groups
  const limitedGroups = groups.slice(0, 2);

  // join with dashes
  formattedValue = limitedGroups.join("-");

  return formattedValue;
};
