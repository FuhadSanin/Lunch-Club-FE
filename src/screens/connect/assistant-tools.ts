// What an AI assistant can do for you once it is connected. This mirrors the tools of the Lunch Club MCP server
// (mcp_server/server.py in the API repo): the names are the ones an assistant sees, the words are for people.
// `host` marks what needs the host's permission; `asksFirst` what the assistant must check with you before doing.
export type Tool = { name: string; does: string; host?: boolean; asksFirst?: boolean };
export type ToolGroup = { id: string; title: string; blurb: string; tools: Tool[] };

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'start',
    title: 'Start and share a lunch',
    blurb: 'Pick a closing time and a place, then get the link for your team.',
    tools: [
      { name: 'search_places', does: 'Look up a building, area or landmark to deliver to.' },
      { name: 'start_lunch', does: 'Start a lunch with a closing time and a delivery place, and get its link.', host: true },
      { name: 'share_lunch', does: 'The link, with a message ready to paste into your team chat.' },
      { name: 'set_link_open', does: 'Let new people in through the link, or stop that.', host: true },
      { name: 'join_lunch', does: 'Join a lunch from its link.' },
    ],
  },
  {
    id: 'choose',
    title: 'Choose food',
    blurb: 'Browse the same Swiggy restaurants and menus you see in the app, then pick.',
    tools: [
      { name: 'find_restaurants', does: 'Swiggy restaurants near the delivery place.' },
      { name: 'get_menu', does: "A restaurant's dishes and prices." },
      { name: 'search_dishes', does: 'Find a dish by name across the restaurants nearby.' },
      { name: 'pick_dish', does: 'Add a dish to your picks, with a note for the restaurant if you like.' },
      { name: 'remove_pick', does: 'Take a dish out of your picks.' },
      { name: 'finish_my_order', does: 'Mark your picks as final. The host can reopen them.' },
      { name: 'skip_lunch', does: 'Sit this lunch out.' },
    ],
  },
  {
    id: 'run',
    title: 'Run the lunch',
    blurb: 'The host’s steps: lock, review, order, collect.',
    tools: [
      { name: 'lock_lunch', does: 'Close the picks now, before the closing time.', host: true },
      { name: 'unlock_lunch', does: 'Reopen locked picks, until the order goes out.', host: true },
      { name: 'confirm_lunch', does: 'Approve the reviewed cart so the Swiggy orders are prepared.', host: true, asksFirst: true },
      { name: 'cancel_lunch', does: "Call off a lunch that isn't ordered yet.", host: true, asksFirst: true },
      { name: 'mark_order_placed', does: 'Record that you ordered a restaurant in the Swiggy app.', host: true },
      { name: 'mark_order_arrived', does: "Record that a restaurant's food has arrived.", host: true },
    ],
  },
  {
    id: 'know',
    title: 'Look and stay informed',
    blurb: 'Ask how it is going without opening the app.',
    tools: [
      { name: 'whoami', does: "Who you're acting as, and which team or party you're in." },
      { name: 'list_lunches', does: 'Your lunches, the ones you host and the ones you joined.' },
      { name: 'get_lunch', does: 'One lunch: its status, who picked what, the total for each restaurant, and the orders.' },
      { name: 'my_notifications', does: 'What the app told you lately.' },
      { name: 'mark_notifications_read', does: 'Mark them all as read.' },
    ],
  },
];

export const ALL_TOOLS = TOOL_GROUPS.flatMap((g) => g.tools);

// Two ready-made prompts, for assistants that offer them next to the chat box.
export const PROMPTS = [
  { name: 'start_team_lunch', does: 'Starts a lunch and gives you the link to share.' },
  { name: 'pick_my_lunch', does: 'Joins a lunch from its link and helps you choose.' },
];
