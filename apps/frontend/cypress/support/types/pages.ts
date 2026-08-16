export const PAGES = ['dashboard', 'stations', 'presets', 'decoder'] as const;
export type Page = (typeof PAGES)[number];

export type CreateUserArgs = {
  username: string;
  password: string;
  permission: Page[];
};
