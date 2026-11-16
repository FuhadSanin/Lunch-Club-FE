// Four things to say to a connected assistant, what it answers, which tools it uses, and the screen of the app that
// changes as a result. The pictures are real screens of the app (public/connect/<id>-light.webp and -dark.webp, made by scripts/connect-shots.mjs).
export type Example = {
  id: 'start' | 'pick' | 'review' | 'collect';
  title: string;
  say: string;
  reply: string;
  tools: string[];
  seen: string; // what the picture shows
  alt: string;
  size: { w: number; h: number }; // of the picture, in pixels
};

export const EXAMPLES: Example[] = [
  {
    id: 'start',
    title: 'Start a lunch',
    say: 'Start a lunch at 12:30 for my team near Infopark, and give me the link.',
    reply: 'Started. Picks close at 12:30 and lunch goes to Infopark Phase 2, Kakkanad. Here is the link to share with your team.',
    tools: ['start_lunch', 'share_lunch'],
    seen: 'The lunch is running, with its link ready to send.',
    alt: 'The Start lunch screen of the app: an active lunch whose picks close at 12:30, with a link to share with the team and the Copy link and QR and share buttons.',
    size: { w: 1476, h: 735 },
  },
  {
    id: 'pick',
    title: 'Pick your food',
    say: 'Join this lunch and add the dal makhani lunchbox from Veg Meals By Lunchbox. Less spicy please.',
    reply: 'Added Dal Makhani & Laccha Paratha Lunchbox for ₹240, with the note “Less spicy please”. Say the word and I will mark your order as done.',
    tools: ['join_lunch', 'find_restaurants', 'search_dishes', 'pick_dish'],
    seen: 'Your pick appears with the note, ready to complete.',
    alt: 'The Pick my lunch screen of the app: five restaurants near the office, and a Your pick panel with one dish, its price of 240 rupees and the note Less spicy please, above the Complete my order button.',
    size: { w: 1476, h: 933 },
  },
  {
    id: 'review',
    title: 'Check and lock',
    say: 'How is lunch going? Lock the picks.',
    reply: '26 people picked 26 dishes from 4 restaurants, ₹5,956 in all. 6 have not answered yet and 3 are skipping. The picks are locked; next is the order on Swiggy.',
    tools: ['get_lunch', 'lock_lunch'],
    seen: 'The picks are locked and the cart is ready to review.',
    alt: 'The Review and lock screen of the app: a padlock and the words Picks locked at 12:30, with 26 people and 26 dishes, and a green bar saying the picks are locked and the next step is to place the order.',
    size: { w: 1476, h: 855 },
  },
  {
    id: 'collect',
    title: 'Record the order',
    say: 'I ordered everything in the Swiggy app. The Veg Meals By Lunchbox food has just arrived.',
    reply: 'Marked the orders as placed, and Veg Meals By Lunchbox as arrived. 1 of 4 restaurants is in; 3 to go.',
    tools: ['mark_order_placed', 'mark_order_arrived'],
    seen: 'One restaurant is in, three are still on their way.',
    alt: 'The Collect screen of the app: a progress bar reading 1 of 4 restaurants arrived, and the next restaurant with its dishes and a Mark as arrived button.',
    size: { w: 1476, h: 660 },
  },
];
