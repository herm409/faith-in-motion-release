// New wording for the steps-five preview. EVERY string here is "Draft, pending Herman" and shows a draft pill
// while config.newWordingDraft is true. Book prompts, quotes and section titles are not here: they are read from content.
export const N = {
  // 1. Echo earlier answers
  atStop0: 'At Stop 0 you wrote:', atStopN: 'At Stop {n} you wrote:', atPulse11: 'At the start of this stop you wrote:', carried: 'You carried this from Stop {n}:',
  yourStep: 'Your step for this stop', yourRule: 'Your Rule of Motion',
  // 2. Close the loop
  loopAsk: 'Did you take your step?', loopYes: 'Yes', loopNotYet: 'Not yet, new date', loopHoly: 'Holy wait',
  loopHolySaved: 'Saved as a holy wait. Keep today faithful while you wait.',
  mcIntro: 'Once a month, the same three questions. Only you see your earlier answers next to this one.',
  sundayIcs: 'Add a weekly Sunday reminder', sundayIcsDone: 'Sunday reminder file ready.', sundayWrote: 'When you set it, you wrote:',
  // 3. Sharing
  shareStep: 'Share a Step card', copyLink: 'Copy link', copied: 'Link copied.', textFriend: 'Text a friend',
  savedDownload: 'The card saved to your downloads. Copy the link to send with it.', continue: 'Continue',
  routeChip: 'All 12 stops', routeHeadline: 'I walked all 12 stops of Faith in Motion.', routeShare: 'Share an "all 12 stops" card',
  shareVerse: 'Share this verse', shareLine: 'Share this line', lineChip: 'This line',
  inviteLine: 'Walk with me? I\'m taking one step a week with Faith in Motion.',
  // 4. Plan
  planTitle: 'My Faith in Motion plan', planMenu: 'My plan', before: 'My standstill at Stop 0', after: 'My standstill at Stop 11',
  ruleTitle: 'My Rule of Motion', stepsTitle: 'Every step and how it went', nextTitle: 'My next step', partnerTitle: 'Holding me to it',
  inBook: 'In the book: {ref}', print: 'Print or save as PDF', send: 'Send to my partner',
  sendWarn: 'This sends your private answers to the person you choose. Only send it to someone you trust. Nothing leaves this phone until you pick them.',
  sendOk: 'Choose who gets it', cancel: 'Cancel', planEmpty: 'Your plan fills in as you walk the stops.', planCopied: 'Plan copied. Paste it into a message to your partner.',
  taken: 'Taken', notTaken: 'Not taken yet', ruleSaved: 'Your Rule of Motion is saved as a set.',
  // 5. Recap and journal
  recapTitle: 'Your stop, in your words', named: 'What I named', myStep: 'My step', howWent: 'How it went', happened: 'What happened',
  reread: 'Reread: {ref}', privateNote: 'Only you see this. It never goes on a share card.', journalTitle: 'My journal', journalMenu: 'My journal',
  journalEmpty: 'Your words from each stop collect here after its Review.', by: 'by {date}',
  // A. Words come back
  earlier: 'Earlier you wrote', ruleSays: 'Your Rule of Motion says',
  // B. Seasons
  seasonAsk: 'Which season fits right now? (optional)', seasonNone: 'None of these', seasonFor: 'For this season: {title}',
  shortest: 'Make it the shortest step you can take: one clear duty within 72 hours.', readRef: 'Read: {ref}',
  // C. Patterns
  patternsTitle: 'What your steps show',
  pMoved: 'You have given your step a new date {n} times (Stops {list}). Chapter 4 says: "{quote}" Reread {ref}.',
  pBuried: 'Most of your reviews say Buried ({n} of {of}). Reread {ref}.',
  pTraded: 'Most of your reviews say Traded ({n} of {of}). Keep going. Reread {ref}.',
  pHoly: 'Most of your reviews say Holy wait ({n} of {of}). Reread {ref}.',
  pOnTime: 'You took {n} of {of} steps on or before the date you set.',
  // D. Partner
  partnerAsk: 'Did {partner} check on you?', partnerDefault: 'your partner', partnerYes: 'Yes', partnerNo: 'Not yet', partnerTold: 'What did you tell them?', save: 'Save', savedNote: 'Saved to this step.',
  // E. Before and after
  whereStarted: 'Where you started', shareOnward: 'Share a card', tellHerman: 'Tell Herman what changed',
  onwardChip: 'Still walking', onwardHeadline: "I'm walking Faith in Motion one faithful step at a time.",
  // steps-next: install moment, gentle reminders, leader guide
  installTitle: 'Add Steps to your home screen', installWhy: 'It opens like an app, and your stops work offline.', installBtn: 'Add to home screen', installNever: "Don't ask again",
  quietTitle: 'Pick up where you left off', quietBody: 'It has been {n} days. Stop {stop} is waiting for you at {screen}.', quietOff: 'Turn off this card',
  remTitle: 'Reminders', remMenu: 'Reminders', remIntro: 'Steps never sends notifications on its own. Pick what helps you.',
  remSunday: 'Weekly Sunday reminder', remSundayHelp: 'Adds a repeating Sunday event to your own calendar: traded or buried?',
  remStep: 'Step reminders', remStepHelp: 'When you set a step, tap Add to my calendar to get a reminder on the day.',
  remQuiet: 'Show "Pick up where you left off" in the app after a quiet week', remHome: 'Add Steps to your home screen',
  groupsHeading: 'Small groups', groupsLink: 'Small group leader guide', groupsHelp: 'Discussion questions for every stop, for leaders walking the book together.',
  // Upgrade safety copy
  autoCopy: 'Automatic copy from before the last update', autoRestore: 'Restore the automatic copy', autoConfirm: "Replace this phone's answers with the automatic copy from {when}?",
  // steps-groups (preview): Group walks, Option 1
  gwMenu: "Group walks",
  gwTitle: "Group walks",
  gwIntro: "Walk the stops with a few friends. Your group sees only the first name you choose, which stop you are on, and a check when you take your step. Never your answers.",
  gwSignIn: "Group walks need an account so your group can see your progress. Sign in with your email to start or join one.",
  gwSignInBtn: "Sign in to start or join",
  gwStart: "Start a group walk",
  gwGroupName: "Group name",
  gwFirstName: "Your first name, as the group will see it",
  gwCreate: "Start the group",
  gwJoinTitle: "Join with a code",
  gwCode: "Invite code",
  gwJoin: "Join the group",
  gwInvited: "You are invited to a group walk.",
  gwShared: "What the group sees: your first name, the stop you are on, and a check when you take a step. Your answers stay private to you.",
  gwStop: "Stop {n}",
  gwNotStarted: "Not started yet",
  gwTook: "Step taken",
  gwYou: "(you)",
  gwLeader: "Leader",
  gwInvite: "Invite people",
  gwInviteText: "Walk Faith in Motion with me. Join my group in the Steps app with code {code}: {url}",
  gwCodeLabel: "Invite code: {code}",
  gwCopied: "Invite copied. Paste it into a text.",
  gwNewCode: "Make a new code",
  gwNewCodeHelp: "The old link and code stop working.",
  gwRename: "Rename group",
  gwRemove: "Remove",
  gwRemoveConfirm: "Remove {name} from the group?",
  gwLeave: "Leave group",
  gwLeaveConfirm: "Leave this group? Your progress disappears from it right away.",
  gwClose: "Close group",
  gwCloseConfirm: "Close this group for everyone? This cannot be undone.",
  gwFull: "This group is full (12 people).",
  gwBadCode: "That code did not work. Check it with your leader.",
  gwCount: "{n} of 12",
  gwAdults: "Group walks are for adults, or for a group led by an adult who knows everyone in it.",
  gwPrivacy: "If you join a group walk, the group sees only the first name you choose, which stop you are on, and whether you took your step. Never your answers.",
  gwOffline: "Can't reach your groups right now. Try again when you're online.",
  gwChangeName: "Change my name",
  gwSave: "Save",
  gwLeaderGuide: "Leading the group? Use the small group leader guide.",
  gwTooMany: "You can lead up to 5 groups.",
  gwError: "Something went wrong. Please try again.",
};
// Group walks guide (approved by Herman 7:47 PM CT). Shared by the app (/app/groups) and the leader guide (/groups/).
export const GW_GUIDE = {
 "title": "How Group walks work",
 "sections": [
  {
   "h": "Why walk together",
   "p": [
    "Every chapter of the book ends the same way: bring one answer to a trusted believer this week. Fear thrives in private, and steps come easier when someone you trust is walking too.",
    "A group walk gives a few people a simple way to keep each other moving, one stop at a time."
   ],
   "verse": {
    "ref": "Proverbs 15:22",
    "text": "Without counsel plans fail, but with many advisers they succeed.",
    "stopId": "s7"
   }
  },
  {
   "h": "Start a group and invite",
   "p": [
    "One person starts the group and becomes its leader. The leader shares an invite link or a six character code, usually by text. Up to 12 people can join.",
    "Everyone signs in with their email, so the group can see their progress on any phone."
   ]
  },
  {
   "h": "What your group sees",
   "p": [
    "Only three things: the first name you choose, which stop you are on, and a check when you take your step.",
    "Never your answers, never the words of your step, and never your email. There is no chat and no comments. Talk in person, and let the leader guide carry the questions."
   ]
  },
  {
   "h": "Leave anytime",
   "p": [
    "You can leave a group with one tap, and your progress disappears from it right away. The leader can make a new code, remove someone, or close the group for everyone."
   ]
  }
 ],
 "appLink": "Open Group walks in the app",
 "navLink": "Group walks",
 "leaderLink": "Questions for every stop: the small group leader guide"
};
