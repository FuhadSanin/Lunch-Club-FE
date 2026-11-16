// The questions people ask before they try it. Each answer is plain sentences, because this is also what
// a search engine shows under the page's name: the same list is given to it as structured data.
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Tiffmate?',
    a: 'Tiffmate is group food ordering for teams, food parties and any meal. The host starts a food party, everyone picks their own dish from any restaurant on Swiggy, and the host places one order for the whole team.',
  },
  {
    q: 'Do we all have to order from the same restaurant?',
    a: 'No. Each person picks from any restaurant, and Tiffmate adds every pick into one cart, grouped by restaurant. The host places the order restaurant by restaurant.',
  },
  {
    q: 'How does the host know who ordered what?',
    a: "Every dish goes into the restaurant's note with the person's name, so each bag arrives labelled. The board also shows who still has to pick and how much each person owes.",
  },
  {
    q: 'Who can join our team on Tiffmate?',
    a: "Anyone who signs in with a Google account at your company's email domain joins your team. The host can switch that off and invite people one by one. People with a Gmail address can start a food party and share its link.",
  },
  {
    q: 'Does Tiffmate pay for the food?',
    a: 'No. The host places the Swiggy order and pays on delivery. Tiffmate collects the picks, builds the cart, tracks who has their food, and never touches payment.',
  },
  {
    q: 'Can I use Tiffmate from ChatGPT or Claude?',
    a: 'Yes. Tiffmate works with ChatGPT, Claude and any AI chat that supports MCP. Connect it once, press Allow, and then start a food party, see who picked what, lock the picks and more, just by talking.',
  },
  {
    q: 'What if the restaurant is not on Swiggy?',
    a: 'Use a local menu. Photograph the paper menu and send it to your connected AI chat, or add the restaurant by hand with its dishes and prices. Offer it in your food party next to the Swiggy restaurants.',
  },
];
