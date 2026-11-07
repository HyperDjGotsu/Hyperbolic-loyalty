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
    version: 2,
    title: 'Running an event',
    intro: 'Players earn their points from the events you start and end. Follow these steps in order.',
    steps: [
      { do: 'Find today\'s event in the Upcoming Events list.', why: 'Events come from your store\'s Google Calendar. If it\'s missing, tap Sync Events from Google Calendar first.' },
      { do: 'Tap Start Event when play begins.', why: 'Players can only check in while the event is live.' },
      { do: 'Open the Door Kiosk on the tablet at the door, or tap Kiosk on the event itself.', why: 'Players tap their card or scan the QR code to check in. You don\'t need to type anything. If two events are running, pick the right one at the top of the kiosk.' },
      { do: 'Tap End Event when the last round is finished.', why: 'This closes check-in and finishes the event.' },
      { do: 'In the wrap-up list that opens, tap each player and enter their results from the tournament software.', why: 'Wins and placement go in here. Saving gives them their XP and Prize Points. You can close the list and finish later from Wrap up recent events.' },
    ],
    careful: 'Only press End Event when the event is really over, and make sure it\'s the right event if more than one is running. Ending it early locks out anyone who hasn\'t checked in yet. A saved wrap-up result can only be changed with your own PIN.',
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
    version: 3,
    title: 'Handing out a prize',
    intro: 'When a player spends points on a prize, they get a claim code. You check it here before handing over the item.',
    steps: [
      { do: 'Ask the player to show you their claim code (looks like XXXX-XXXX).', why: 'The code proves they really spent the points.' },
      { do: 'Type the code in and look it up.', why: 'You\'ll see the prize name and whether it\'s still waiting to be claimed.' },
      { do: 'Check the prize name matches what they\'re asking for.', why: 'Make sure it\'s the right item before you commit.' },
      { do: 'Tap Confirm Claim, then hand over the prize.', why: 'Confirming stops the same code being used twice. Only hand it over once you see "Claimed!".' },
    ],
    careful: 'Diamond members can use a $15 Event Credit at check-in or from their Profile. When one comes in, Event Credits waiting shows at the top of this page with a number on the Redemptions tab. Take $15 off their event in Square, then tap Confirm. Tap Decline if you can\'t give it, and they get the credit back. If a code says claimed, expired or voided, don\'t give out the prize. Ask a manager. Void is only for when you can\'t give the prize (out of stock, or the player changed their mind). It refunds their points, so always write the reason.',
  },
  'prize-wall': {
    version: 1,
    title: 'Managing the Prize Wall',
    intro: 'The Prize Wall is what players spend their Prize Points on. Anything you add here shows up in their app right away.',
    steps: [
      { do: 'Tap Add Prize Wall Item to add a prize.', why: 'Give it a name, a Point Cost and a picture players will recognise.' },
      { do: 'Fill in the Retail Value ($) with what the item sells for in your shop.', why: 'It helps you see what each prize really costs the store.' },
      { do: 'Set a Quantity if you only have a few.', why: 'Leave it blank for unlimited. When it runs out, players can no longer buy it.' },
      { do: 'To hide a prize without deleting it, edit it and switch it to Inactive.', why: 'Players stop seeing it, and you can turn it back on later.' },
    ],
    careful: 'Changing a Point Cost only affects future purchases. Players who already bought it keep their claim code. Delete is permanent, so use Inactive if you just want it gone for now.',
  },
  banners: {
    version: 1,
    title: 'Banners on the player home screen',
    intro: 'Banners are the big cards at the top of every player\'s Home screen. Use them for events, sales and news.',
    steps: [
      { do: 'Tap New Banner.', why: 'Or tap an existing banner to edit it.' },
      { do: 'Write a short Title and Subtitle.', why: 'Players read these in a second. Shorter is better.' },
      { do: 'Upload an image if you have one, or pick the two gradient colors.', why: 'An image replaces the gradient. Check the preview before you save.' },
      { do: 'Make sure Active is on, then save.', why: 'Only Active banners show to players. Switch it off to hide a banner without deleting it.' },
    ],
    careful: 'Take down banners for events that already happened. An old banner makes the app look out of date.',
  },
  cotd: {
    version: 1,
    title: 'Card of the Day',
    intro: 'Every player sees one featured card on Home. You can pick it yourself or let the players vote.',
    steps: [
      { do: 'Search for a card by Game and Card Name (add the Card # if you have it), then select the right one from the results.', why: 'Check the picture matches the card you mean.' },
      { do: 'To feature it yourself, pick a day under Feature on Date and confirm.', why: 'It shows on Home on that day.' },
      { do: 'To let players choose, tap Add to Voting Pool. You need at least 2 cards.', why: 'Players vote for tomorrow\'s card from Home.' },
      { do: 'When voting is done, finalize it to pick the winner.', why: 'The winning card is featured and its voters get +10 XP.' },
    ],
    careful: 'Nothing here costs points, but a wrong card is visible to every player. Check the name and picture before you save.',
  },
  circuit: {
    version: 1,
    title: 'Circuit qualifiers and finals',
    intro: 'The Circuit is the season-long competition. Players qualify at a store event, and the top finishers get a Round 1 bye at the championship.',
    steps: [
      { do: 'Fill in Create Qualifier Event (name, store, event type, date and time, max players, entry fee, attendance XP) and tap Create Event.', why: 'It creates the event. Then start it from the Events tab and check players in as normal.' },
      { do: 'After the event ends, find Record Final Standings and set how many players qualify (Qualify top).', why: 'The top players you choose get the Round 1 bye.' },
      { do: 'Paste the Qualifier Event ID from the Events tab, then add players in finish order by searching their name or Player ID.', why: 'The order you add them is their placement.' },
      { do: 'Save the standings and check the Championship Roster.', why: 'Qualified players show there, grouped by store.' },
    ],
    careful: 'Standings are hard to undo. Check the event, the finish order and each player\'s ID before you save.',
  },
  access: {
    version: 1,
    title: 'Who has staff access',
    intro: 'This page decides who can use HQ. Every role is recorded with your name.',
    steps: [
      { do: 'To add someone who already has an account, search for them under Promote Existing Player by name, Player ID or email.', why: 'They have to sign up as a player first. Use the Player ID to be sure it\'s the right person.' },
      { do: 'Pick their Store and a Role: Store Staff or Store Manager.', why: 'Pick the lowest role that gets the job done.' },
      { do: 'Tap to assign them.', why: 'They get access the next time they open HQ.' },
      { do: 'To remove someone, find them under Current Staff and tap Revoke.', why: 'Their access stops straight away.' },
    ],
    careful: 'Only give Store Manager to people you trust with the whole store. Network Admin is for the PlayerPass team only. Never assign it.',
  },
  broadcasts: {
    version: 1,
    title: 'Sending a message to players',
    intro: 'A broadcast sends a push notification to your players, so only send things worth interrupting them for.',
    steps: [
      { do: 'Write a short Title (like Weekend Sale or Event Reminder).', why: 'This is the first thing they see on their phone.' },
      { do: 'Write the message in the Message body.', why: 'One or two sentences. Say what, when and where.' },
      { do: 'Check who it goes to.', why: 'It goes to players who have your store as their home store.' },
      { do: 'Tap send and check it in Sent History.', why: 'It cannot be unsent once it goes out.' },
    ],
    careful: 'Re-read it before you send. Players get a notification right away and you can\'t take it back. Don\'t send more than a couple a week.',
  },
  settings: {
    version: 1,
    title: 'Store settings and staff invites',
    intro: 'Settings controls how your store looks to players, and lets you invite new staff.',
    steps: [
      { do: 'Check the Store Name and what your points are called (Currency).', why: 'Players see these everywhere in the app.' },
      { do: 'Tap Save Settings after any change.', why: 'Nothing is saved until you do.' },
      { do: 'To invite staff who don\'t have an account yet, type their email, pick Store Staff or Store Manager and tap Create Invite.', why: 'You get a link to send them. It only works for that role.' },
      { do: 'Check Pending Invites for any that are unused or expired.', why: 'Expired links need a new invite.' },
    ],
    careful: 'Only send an invite link to the person it\'s for. Anyone who opens it gets that access. Keep the Player ID Prefix short (2 to 5 letters), and do not change it after launch without asking.',
  },
};
