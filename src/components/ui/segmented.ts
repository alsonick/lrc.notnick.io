/**
 * The look of a row of choices where one is picked: the theme picker and the
 * decoration picker. Put the first on a Base UI `RadioGroup` and the second
 * on each `Radio.Root` in it.
 */
export const SEGMENTED_GROUP_CLASS =
  "grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 data-disabled:opacity-50";

export const SEGMENTED_ITEM_CLASS =
  "flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring data-checked:bg-background data-checked:text-foreground data-checked:shadow-xs data-disabled:cursor-not-allowed data-disabled:hover:text-muted-foreground dark:data-checked:bg-input/60 [&_svg]:size-4 [&_svg]:shrink-0";
