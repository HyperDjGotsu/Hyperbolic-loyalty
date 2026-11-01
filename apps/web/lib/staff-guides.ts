// Plain-language guides shown to staff in HQ. Bump `version` when a guide's text changes so staff see it again;
// earlier views and acknowledgements stay on record in staff_guide_log.
export const GUIDE_MIN_VIEWS = 5;

export interface GuideStep {
  do: string;
  why?: string;
}

export interface StaffGuide {
  version: number;
  title: string;
  intro: string;
  steps: GuideStep[];
  careful?: string;
}

export const STAFF_GUIDES: Record<string, StaffGuide> = {
  events: {
    version: 1,
    title: 'Running an event',
    intro: 'Players earn their points from the events you start and end. Follow these steps in order.',
    steps: [
      { do: 'Find today\'s event in the Upcoming Events list.', why: 'Events come from your store\'s Google Calendar. If it\'s missing, tap Sync Events from Google Calendar first.' },
      { do: 'Tap Start Event when play begins.', why: 'Players can only check in while the event is live.' },
      { do: 'Open the Door Kiosk on the tablet at the door, or tap Kiosk on the event itself.', why: 'Players tap their card or scan the QR code to check in. You don\'t need to type anything. If two events are running, pick the right one at the top of the kiosk.' },
      { do: 'Tap End Event when the last round is finished.', why: 'This closes check-in and finishes the event.' },
    ],
    careful: 'Only press End Event when the event is really over, and make sure it\'s the right event if more than one is running. Ending it early locks out anyone who hasn\'t checked in yet.',
  },
  players: {
    version: 1,
    title: 'Looking up and helping a player',
    intro: 'Use this page to find a player and fix things for them. Everything you do is recorded with your name.',
    steps: [
      { do: 'Type the player\'s ID (like GGOB-XXXXXXXX) or name and tap Search.', why: 'The ID is on their card and in the app. It\'s the safest way to get the right person.' },
      { do: 'Check the name and ID on the card before you change anything.', why: 'Two players can have similar names.' },
      { do: 'To give or take Game XP or Prize Points, enter the amount and always write a reason.', why: 'The reason is how we find out later what happened and why.' },
      { do: 'To change someone\'s pass, use Assign / Change Pass and tick "Payment received" only after you\'ve taken the money.', why: 'Ticking it tells the system they paid.' },
    ],
    careful: 'Remove Subscription and Delete Account can\'t be undone. Don\'t use them unless the player has asked you to, or a manager has told you to.',
  },
  redemptions: {
    version: 1,
    title: 'Handing out a prize',
    intro: 'When a player spends points on a prize, they get a claim code. You check it here before handing over the item.',
    steps: [
      { do: 'Ask the player to show you their claim code (looks like XXXX-XXXX).', why: 'The code proves they really spent the points.' },
      { do: 'Type the code in and look it up.', why: 'You\'ll see the prize name and whether it\'s still waiting to be claimed.' },
      { do: 'Check the prize name matches what they\'re asking for.', why: 'Make sure it\'s the right item before you commit.' },
      { do: 'Tap Confirm Claim, then hand over the prize.', why: 'Confirming stops the same code being used twice. Only hand it over once you see "Claimed!".' },
    ],
    careful: 'If a code says claimed, expired or voided, don\'t give out the prize. Ask a manager. Void is only for when you can\'t give the prize (out of stock, or the player changed their mind). It refunds their points, so always write the reason.',
  },
};
