export type XwlArgs = Map<string, string>;

export type XwlTag = {
  tag: string;
  contents: (XwlTag | string)[];
  args: XwlArgs | null;
};
